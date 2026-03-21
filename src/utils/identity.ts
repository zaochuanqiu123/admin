import { history } from '@umijs/max';
import { message } from 'antd';
import { getPermContext, getUserLoginContextResponse } from '@/api/context';
import {
  clearSelectedOrgCode,
  getLoginOrgList,
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

export type IdentityGroupKey = 'group' | 'brand' | 'store';

export type IdentityItem = {
  id: string;
  name: string;
  desc?: string;
  orgCode?: string;
  levelName?: string;
  groupKey: IdentityGroupKey;
  groupLabel: string;
};

type SetInitialState = (
  updater: (state: Record<string, any> | undefined) => Record<string, any>,
) => void;

const IDENTITY_GROUP_ORDER: IdentityGroupKey[] = ['group', 'brand', 'store'];

function toStringSafe(value: any): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function getAnyArray(source: any, keys: string[]): any[] {
  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
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

function getIdentityGroup(
  org: any,
): Pick<IdentityItem, 'groupKey' | 'groupLabel'> {
  const typeText = [
    org?.orgLevelName,
    org?.levelName,
    org?.typeName,
    org?.type,
    org?.orgTypeName,
    org?.orgTypeCode,
    org?.typeCode,
    org?.levelCode,
    org?.nodeTypeName,
    org?.nodeTypeCode,
    org?.identityType,
    org?.roleType,
  ]
    .map(toStringSafe)
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  const displayText = [org?.name, org?.orgName, org?.storeName, org?.title]
    .map(toStringSafe)
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  const hasChildren =
    getAnyArray(org, [
      'children',
      'child',
      'stores',
      'storeList',
      'shopList',
      'orgList',
    ]).length > 0;

  if (
    containsAny(typeText, [
      '集团',
      'GROUP',
      'GRP',
      '平台',
      'PLATFORM',
      '总部',
      'HQ',
    ]) ||
    containsAny(displayText, ['集团', '平台', '总部'])
  ) {
    return { groupKey: 'group', groupLabel: '集团视角' };
  }

  if (
    containsAny(typeText, [
      '品牌',
      '商户',
      '公司',
      'MER',
      'MERCHANT',
      'BRAND',
      '企业',
    ]) ||
    (hasChildren && !containsAny(typeText, ['门店', 'STORE', 'SHOP', '店铺']))
  ) {
    return { groupKey: 'brand', groupLabel: '品牌视角' };
  }

  return { groupKey: 'store', groupLabel: '门店视角' };
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
  const name =
    toStringSafe(org?.name) ||
    toStringSafe(org?.orgName) ||
    toStringSafe(org?.storeName) ||
    toStringSafe(org?.title) ||
    `未命名-${index + 1}`;
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
  const group = getIdentityGroup(org);

  return {
    id,
    name,
    desc,
    orgCode,
    levelName,
    groupKey: group.groupKey,
    groupLabel: group.groupLabel,
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

  return Array.from(identityMap.values()).sort((left, right) => {
    const leftIndex = IDENTITY_GROUP_ORDER.indexOf(left.groupKey);
    const rightIndex = IDENTITY_GROUP_ORDER.indexOf(right.groupKey);
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
    return left.name.localeCompare(right.name, 'zh-CN');
  });
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
  return IDENTITY_GROUP_ORDER.map((groupKey) => ({
    groupKey,
    label: items.find((item) => item.groupKey === groupKey)?.groupLabel || '',
    items: items.filter((item) => item.groupKey === groupKey),
  })).filter((group) => group.items.length > 0);
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

  clearStoreScopedStorage();
  setInitialState((state) => resetStoreScopedInitialState(state));
  setSelectedOrgCode(orgCode);

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
      clearSelectedOrgCode();
      message.warning(String(backendMessage));
      return false;
    }

    const defaultBusiness = businessList[0];
    const businessCode = defaultBusiness?.businessCode || TEMP_BUSINESS_CODE;
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
    clearSelectedOrgCode();
    setInitialState((state) => resetStoreScopedInitialState(state));
    return false;
  }
}
