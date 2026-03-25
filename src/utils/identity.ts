import { history } from '@umijs/max';
import { message } from 'antd';
import { getPermContext, getUserLoginContextResponse } from '@/api/context';
import {
  clearSelectedOrgCode,
  getBusinessList,
  getCurrentBusinessCode,
  getLoginOrgList,
  getSelectedOrgCode,
  setBusinessList,
  setCurrentBusinessCode,
  setSelectedOrgCode,
} from '@/api/storage';
import { clearPostLoginRedirect } from '@/utils/auth-expired';
import { buildIframeRouteWithParams } from '@/utils/iframe';
import {
  extractPermContextNodes,
  mapPermContextToMenuData,
  TEMP_BUSINESS_CODE,
} from '@/utils/menu';
import {
  clearStoreScopedStorage,
  resetStoreScopedInitialState,
} from '@/utils/store-switch';

export type IdentityItem = {
  id: string;
  name: string;
  desc?: string;
  orgCode?: string;
  levelName?: string;
  groupKey: string;
  groupLabel: string;
};

type SetInitialState = (
  updater: (state: Record<string, any> | undefined) => Record<string, any>,
) => void;

function toStringSafe(value: any): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function formatIdentityViewLabel(value: string | undefined): string {
  const normalized = toStringSafe(value);
  if (!normalized) return '未分类视角';
  if (normalized.endsWith('视角')) return normalized;
  return `${normalized}视角`;
}

function getAnyArray(source: any, keys: string[]): any[] {
  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function flattenOrgList(list: any[]): any[] {
  const result: any[] = [];
  const visit = (node: any) => {
    if (!node) return;
    result.push(node);
    const children = getAnyArray(node, [
      'children',
      'child',
      'stores',
      'storeList',
      'shopList',
      'orgList',
    ]);
    children.forEach(visit);
  };
  list.forEach(visit);
  return result;
}

function normalizeOrgToIdentityItem(org: any, index: number): IdentityItem {
  const orgCode =
    toStringSafe(org?.orgCode) ||
    toStringSafe(org?.code) ||
    toStringSafe(org?.orgId) ||
    toStringSafe(org?.id) ||
    toStringSafe(org?.storeId) ||
    undefined;
  const id =
    toStringSafe(org?.orgId) ||
    toStringSafe(org?.id) ||
    toStringSafe(org?.storeId) ||
    toStringSafe(org?.orgCode) ||
    toStringSafe(org?.code) ||
    `identity-${index}`;
  const fullName =
    toStringSafe(org?.name) ||
    toStringSafe(org?.orgName) ||
    toStringSafe(org?.storeName) ||
    toStringSafe(org?.title);
  const name = fullName || `未命名-${index + 1}`;
  const desc =
    toStringSafe(org?.desc) ||
    toStringSafe(org?.address) ||
    toStringSafe(org?.addr) ||
    toStringSafe(org?.remark) ||
    toStringSafe(org?.orgAddr) ||
    toStringSafe(org?.storeAddr) ||
    undefined;
  const levelName =
    toStringSafe(org?.orgLevelName) ||
    toStringSafe(org?.levelName) ||
    toStringSafe(org?.typeName) ||
    undefined;
  const groupLabel = formatIdentityViewLabel(levelName);

  return {
    id,
    name,
    desc,
    orgCode,
    levelName,
    groupKey: groupLabel,
    groupLabel,
  };
}

export function getIdentityItemsFromStorage(): IdentityItem[] {
  const orgList = getLoginOrgList<any[]>() ?? [];
  const rawList = Array.isArray(orgList) ? orgList : [];
  const flattened = flattenOrgList(rawList);
  const identityMap = new Map<string, IdentityItem>();

  flattened.forEach((item, index) => {
    const normalized = normalizeOrgToIdentityItem(item, index);
    if (!identityMap.has(normalized.id)) {
      identityMap.set(normalized.id, normalized);
    }
  });

  return Array.from(identityMap.values());
}

export function getCurrentIdentityItem(
  currentOrgCode: string | undefined,
  items: IdentityItem[],
) {
  const nextOrgCode = toStringSafe(currentOrgCode);
  if (!nextOrgCode) return undefined;
  return items.find((item) => toStringSafe(item.orgCode) === nextOrgCode);
}

export function groupIdentityItems(items: IdentityItem[]) {
  const groups: { groupKey: string; label: string; items: IdentityItem[] }[] =
    [];
  const groupMap = new Map<
    string,
    { groupKey: string; label: string; items: IdentityItem[] }
  >();

  items.forEach((item) => {
    const key =
      item.groupKey || item.groupLabel || item.levelName || '未分类视角';
    const existing = groupMap.get(key);
    if (existing) {
      existing.items.push(item);
      return;
    }

    const nextGroup = {
      groupKey: key,
      label: item.groupLabel || item.levelName || '未分类视角',
      items: [item],
    };
    groupMap.set(key, nextGroup);
    groups.push(nextGroup);
  });

  return groups;
}

function unwrapApiData<T = any>(response: any): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data as T;
  }
  return response as T;
}

export async function switchIdentityContext(
  identity: IdentityItem,
  setInitialState: SetInitialState,
) {
  const orgCode = toStringSafe(identity.orgCode);
  if (!orgCode) {
    message.warning('身份编码缺失，无法切换');
    return false;
  }

  // 备份当前状态，失败时恢复
  const prevOrgCode = getSelectedOrgCode();
  const prevBusinessList = getBusinessList<any[]>();
  const prevBusinessCode = getCurrentBusinessCode();
  let prevInitialState: Record<string, any> | undefined;
  setInitialState((state) => {
    prevInitialState = state ? { ...state } : undefined;
    return state as Record<string, any>;
  });

  // 先设置新 orgCode，让 UI 立即响应
  setSelectedOrgCode(orgCode);
  history.replace(buildIframeRouteWithParams('/dashboard/index'));

  try {
    const loginContextResponse = await getUserLoginContextResponse(orgCode, {
      skipErrorHandler: true,
    });
    const loginContext = unwrapApiData<any>(loginContextResponse);
    const businessList = Array.isArray(loginContext?.businessList)
      ? loginContext.businessList
      : [];

    if (businessList.length === 0) {
      const backendMessage =
        loginContextResponse?.msg ||
        loginContextResponse?.message ||
        loginContext?.msg ||
        loginContext?.message ||
        '当前身份暂无可用业态';
      // 恢复旧状态
      if (prevOrgCode) {
        setSelectedOrgCode(prevOrgCode);
      } else {
        clearSelectedOrgCode();
      }
      if (prevInitialState) {
        setInitialState(() => prevInitialState as Record<string, any>);
      }
      message.warning(String(backendMessage));
      return false;
    }

    const defaultBusiness = businessList[0];
    const businessCode = defaultBusiness?.businessCode || TEMP_BUSINESS_CODE;

    // 接口成功后再清理旧数据并写入新数据
    clearStoreScopedStorage();
    setSelectedOrgCode(orgCode);
    setBusinessList(businessList);
    setCurrentBusinessCode(businessCode);

    const permResponse = await getPermContext(businessCode, {
      skipErrorHandler: true,
    });
    const permNodes = extractPermContextNodes(permResponse);
    const permContextMenu = mapPermContextToMenuData(permNodes);

    setInitialState((state) => ({
      ...(state || {}),
      currentOrgCode: orgCode,
      loginContext,
      businessList,
      currentBusinessCode: businessCode,
      permContextMenu: permContextMenu.length > 0 ? permContextMenu : undefined,
    }));

    clearPostLoginRedirect();
    history.replace(buildIframeRouteWithParams('/dashboard/index'));
    return true;
  } catch (error: any) {
    if (error?.info?.authHandled) {
      return false;
    }

    console.error('switch identity failed:', error);
    const backendMessage =
      error?.info?.errorMessage ||
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error?.message ||
      '切换身份失败，请稍后重试';
    message.error(String(backendMessage));

    // 恢复到切换前的状态，而不是清空
    if (prevOrgCode) {
      setSelectedOrgCode(prevOrgCode);
    } else {
      clearSelectedOrgCode();
    }
    if (prevBusinessList) {
      setBusinessList(prevBusinessList);
    }
    if (prevBusinessCode) {
      setCurrentBusinessCode(prevBusinessCode);
    }
    if (prevInitialState) {
      setInitialState(() => prevInitialState as Record<string, any>);
    } else {
      setInitialState((state) => resetStoreScopedInitialState(state));
    }
    return false;
  }
}
