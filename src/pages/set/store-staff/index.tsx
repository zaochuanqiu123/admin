import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useLocation, useModel } from '@umijs/max';
import {
  Avatar,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Pagination,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getRolePageList,
  getRolePermTree,
  type RolePageListParams,
} from '@/api/context';
import {
  type AddOrgUserParams,
  addOrgUser,
  deleteOrgUser,
  getOrgUserDetail,
  getOrgUserPage,
  modifyOrgUser,
  type OrgUserDetailRecord,
  type OrgUserPageRecord,
  updateOrgUserState,
} from '@/api/orgUser';
import {
  createRemoteUploadFileList,
  imageUploadRequest,
  normalizeUploadFileList,
  resolveUploadAttachmentId,
} from '@/pages/form/shared/upload';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import './index.less';
type StaffPermissionNode = {
  key: string;
  name: string;
  permissionId?: string;
  isButtonPermission: boolean;
  checked: boolean;
  children: StaffPermissionNode[];
};
type StaffPermissionPage = StaffPermissionNode;
type StaffPermissionModule = StaffPermissionNode;
type StaffPermissionCheckedState = {
  checked: boolean;
  indeterminate: boolean;
};
type StaffPermissionActiveState = {
  sceneKey: string;
  moduleKey: string;
  pageKey: string;
};
type StaffPermissionBusiness = {
  key: string;
  name: string;
  modules: StaffPermissionModule[];
};
type StaffPermissionScene = {
  key: string;
  name: string;
  businesses: StaffPermissionBusiness[];
};
type StaffRecord = {
  id: string;
  name: string;
  nickName?: string;
  staffCode: string;
  userId: string;
  orgName: string;
  storeName: string;
  roleName: string;
  roleTag: string;
  position: string;
  phone: string;
  email: string;
  healthCard: string;
  remark: string;
  entryDate: string;
  account: string;
  avatar?: string;
  enabled: boolean;
  avatarColor: string;
  roleMap?: Record<string, string>;
  overridePermIds?: Record<string, string[]>;
  permissionScenes?: StaffPermissionScene[];
  permissionTree: StaffPermissionModule[];
};
type StaffRoleRecord = {
  id: string;
  roleName?: string;
  roleDesc?: string;
  state?: number;
  [key: string]: any;
};
const STAFF_FORM_SECTIONS = [
  { key: 'basic', label: '基本信息' },
  { key: 'permission', label: '功能权限信息' },
] as const;
type StaffFormSectionKey = (typeof STAFF_FORM_SECTIONS)[number]['key'];
const EMPTY_PERMISSION_TREE: StaffPermissionModule[] = [];
const STAFF_LIST_ROW_HEIGHT = 80;
const STAFF_LIST_MIN_PAGE_SIZE = 5;
const STAFF_LIST_MAX_PAGE_SIZE = 20;
function getResponsiveStaffPageSize(listHeight: number) {
  return Math.min(
    STAFF_LIST_MAX_PAGE_SIZE,
    Math.max(
      STAFF_LIST_MIN_PAGE_SIZE,
      Math.floor(listHeight / STAFF_LIST_ROW_HEIGHT),
    ),
  );
}
function getStaffDisplayName(record: Partial<OrgUserPageRecord>) {
  return (
    record.name || record.nickName || record.account || record.phone || '-'
  );
}

function normalizeRoleMap(roleMap?: Record<string, string>): StaffRoleRecord[] {
  return Object.entries((roleMap || {}) as Record<string, any>)
    .map(([rawKey, rawValue]) => {
      const id = normalizeText(rawKey);
      const roleName = normalizeText(rawValue) || id;
      return id ? { id, roleName } : undefined;
    })
    .filter(Boolean) as StaffRoleRecord[];
}

function getStaffRoleName(roleMap?: Record<string, string>) {
  return (
    normalizeRoleMap(roleMap)
      .map((role) => role.roleName || role.id)
      .filter(Boolean)
      .join('、') || ''
  );
}

function getStaffRoles(staff?: Pick<StaffRecord, 'roleMap' | 'roleName'>) {
  const roleMapRoles = normalizeRoleMap(staff?.roleMap);
  if (roleMapRoles.length > 0) return roleMapRoles;
  const roleName = normalizeText(staff?.roleName);
  return roleName ? [{ id: roleName, roleName }] : [];
}

function renderStaffRoleTags(
  staff?: Pick<StaffRecord, 'roleMap' | 'roleName'>,
) {
  const roles = getStaffRoles(staff);
  if (roles.length === 0) return null;
  return (
    <span className="staff-role-tags">
      {roles.map((role) => (
        <span key={role.id} className="staff-select-pill">
          {role.roleName || role.id}
        </span>
      ))}
    </span>
  );
}

function getPermissionNodeChildren(node: any): any[] {
  return (
    (Array.isArray(node?.children) && node.children) ||
    (Array.isArray(node?.childList) && node.childList) ||
    (Array.isArray(node?.child) && node.child) ||
    []
  );
}

function getPermissionNodeName(node: any, index: number) {
  const rawName =
    node?.terminalName ??
    node?.businessName ??
    node?.permName ??
    node?.name ??
    node?.title ??
    node?.menuName ??
    node?.text ??
    node?.label;
  const name = String(rawName ?? '').trim();
  return name || `未命名权限${index + 1}`;
}

function getPermissionNodeKey(node: any, index: number) {
  const rawKey =
    node?.id ??
    node?.permId ??
    node?.menuId ??
    node?.terminalCode ??
    node?.businessCode ??
    node?.targetId ??
    node?.pathUrl ??
    node?.permCode ??
    node?.permissionCode ??
    node?.code ??
    `${node?.name || node?.permName || 'node'}-${index}`;
  return String(rawKey);
}

function getPermissionBusinessKey(node: any, index: number) {
  const rawKey = node?.businessCode ?? getPermissionNodeKey(node, index);
  return String(rawKey);
}

function getPermissionId(node: any) {
  const rawKey =
    node?.permCode ??
    node?.permissionCode ??
    node?.code ??
    node?.id ??
    node?.permId ??
    node?.menuId;
  if (rawKey === undefined || rawKey === null || rawKey === '') return '';
  return String(rawKey);
}

function isButtonPermissionNode(node: any) {
  return String(node?.permType ?? '') === '3';
}

function toStaffPermissionNodes(
  nodes: any[],
  checkedPermSet: Set<string>,
): StaffPermissionNode[] {
  return (nodes || []).map((node, index) => {
    const permissionId = getPermissionId(node);
    const children = toStaffPermissionNodes(
      getPermissionNodeChildren(node),
      checkedPermSet,
    );
    const checked = permissionId ? checkedPermSet.has(permissionId) : false;
    const nextNode: StaffPermissionNode = {
      key: permissionId || getPermissionNodeKey(node, index),
      name: getPermissionNodeName(node, index),
      permissionId: permissionId || undefined,
      isButtonPermission: isButtonPermissionNode(node),
      checked,
      children,
    };
    if (children.length === 0) return nextNode;
    const childState = getPermissionNodeCheckedState(nextNode);
    return {
      ...nextNode,
      checked: checked || childState.checked,
    };
  });
}

function toStaffPermissionScenes(
  orgMenuTree: any[],
  checkedPermIds: string[],
): StaffPermissionScene[] {
  const checkedPermSet = new Set(checkedPermIds.map((item) => String(item)));
  return (orgMenuTree || []).map((terminalNode, terminalIndex) => {
    const businessNodes = getPermissionNodeChildren(terminalNode);
    return {
      key: getPermissionNodeKey(terminalNode, terminalIndex),
      name: getPermissionNodeName(terminalNode, terminalIndex),
      businesses: businessNodes.map((businessNode, businessIndex) => ({
        key: getPermissionBusinessKey(businessNode, businessIndex),
        name: getPermissionNodeName(businessNode, businessIndex),
        modules: toStaffPermissionNodes(
          getPermissionNodeChildren(businessNode),
          checkedPermSet,
        ),
      })),
    };
  });
}

function extractRolePermTreeNodes(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.menuTree)) return res.menuTree;
  if (Array.isArray(res?.data?.menuTree)) return res.data.menuTree;
  return [];
}

function collectPermissionIds(nodes: any[]): string[] {
  const result: string[] = [];
  const walk = (items: any[]) => {
    items.forEach((item) => {
      const permissionId = getPermissionId(item);
      if (permissionId) result.push(permissionId);
      const children = getPermissionNodeChildren(item);
      if (children.length > 0) walk(children);
    });
  };
  walk(nodes || []);
  return Array.from(new Set(result));
}

function getPermissionNodeCheckedState(
  node?: StaffPermissionNode,
): StaffPermissionCheckedState {
  if (!node) {
    return {
      checked: false,
      indeterminate: false,
    };
  }
  if (node.children.length === 0) {
    return {
      checked: node.checked,
      indeterminate: false,
    };
  }
  const childStates: StaffPermissionCheckedState[] = node.children.map(
    getPermissionNodeCheckedState,
  );
  const checked =
    childStates.length > 0 && childStates.every((item) => item.checked);
  const hasCheckedChild = childStates.some(
    (item) => item.checked || item.indeterminate,
  );
  return {
    checked,
    indeterminate: hasCheckedChild && !checked,
  };
}

function setPermissionNodeChecked(
  node: StaffPermissionNode,
  checked: boolean,
): StaffPermissionNode {
  return {
    ...node,
    checked,
    children: node.children.map((child) =>
      setPermissionNodeChecked(child, checked),
    ),
  };
}

function syncPermissionNodeChecked(node: StaffPermissionNode) {
  const state = getPermissionNodeCheckedState(node);
  return {
    ...node,
    checked: state.checked,
  };
}

function updatePermissionNodeChecked(
  node: StaffPermissionNode,
  targetKey: string,
  checked: boolean,
): StaffPermissionNode {
  if (node.key === targetKey) {
    return setPermissionNodeChecked(node, checked);
  }
  if (node.children.length === 0) return node;
  return syncPermissionNodeChecked({
    ...node,
    children: node.children.map((child) =>
      updatePermissionNodeChecked(child, targetKey, checked),
    ),
  });
}

function applyCheckedSetToPermissionNode(
  node: StaffPermissionNode,
  checkedSet: Set<string>,
  inheritedChecked = false,
): StaffPermissionNode {
  const nodeChecked =
    inheritedChecked ||
    (node.permissionId
      ? checkedSet.has(node.permissionId) || checkedSet.has(node.key)
      : checkedSet.has(node.key));
  if (node.children.length === 0) {
    return {
      ...node,
      checked: nodeChecked,
    };
  }
  const children = node.children.map((child) =>
    applyCheckedSetToPermissionNode(child, checkedSet, nodeChecked),
  );
  return syncPermissionNodeChecked({
    ...node,
    checked: nodeChecked,
    children,
  });
}

function collectCheckedPermissionNodeIds(nodes: StaffPermissionNode[]) {
  const result: string[] = [];
  const walk = (items: StaffPermissionNode[], depth: number) => {
    items.forEach((item) => {
      if (item.children.length > 0) {
        walk(item.children, depth + 1);
        return;
      }
      if (item.checked && (item.isButtonPermission || depth >= 3)) {
        result.push(item.permissionId || item.key);
      }
    });
  };
  walk(nodes, 0);
  return Array.from(new Set(result));
}

function applyOverridePermIds(
  scenes: StaffPermissionScene[],
  overridePermIds?: Record<string, string[]>,
) {
  if (!overridePermIds || Object.keys(overridePermIds).length === 0) {
    return scenes;
  }
  return scenes.map((scene) => ({
    ...scene,
    businesses: scene.businesses.map((business) => {
      if (!Object.hasOwn(overridePermIds, business.key)) {
        return business;
      }
      const checkedSet = new Set(
        (overridePermIds[business.key] || []).map((item) => String(item)),
      );
      return {
        ...business,
        modules: business.modules.map((moduleItem) =>
          applyCheckedSetToPermissionNode(moduleItem, checkedSet),
        ),
      };
    }),
  }));
}

function toCheckedStaffPermissionScenes(
  rolePermTree: any[],
  overridePermIds?: Record<string, string[]>,
) {
  const scenes = toStaffPermissionScenes(
    rolePermTree,
    collectPermissionIds(rolePermTree),
  );
  return applyOverridePermIds(scenes, overridePermIds);
}

function getActivePermissionTree(
  permissionScenes: StaffPermissionScene[] | undefined,
  activePermissionScene: string,
  fallbackTree: StaffPermissionModule[],
) {
  const activeScene =
    permissionScenes?.find((item) => item.key === activePermissionScene) ||
    permissionScenes?.[0];
  const activeBusiness = activeScene?.businesses[0];
  return {
    scene: activeScene,
    business: activeBusiness,
    tree:
      activeBusiness && activeBusiness.modules.length > 0
        ? activeBusiness.modules
        : fallbackTree,
  };
}

function getInitialPermissionState(
  permissionScenes?: StaffPermissionScene[],
  fallbackTree: StaffPermissionModule[] = EMPTY_PERMISSION_TREE,
): StaffPermissionActiveState {
  const firstScene = permissionScenes?.[0];
  const firstTree = firstScene?.businesses[0]?.modules || fallbackTree;
  const { moduleKey, pageKey } = getInitialPermissionKeys(firstTree);
  return {
    sceneKey: firstScene?.key || '',
    moduleKey,
    pageKey,
  };
}

function getStablePermissionState(
  permissionScenes: StaffPermissionScene[] | undefined,
  fallbackTree: StaffPermissionModule[] = EMPTY_PERMISSION_TREE,
  currentState?: StaffPermissionActiveState,
): StaffPermissionActiveState {
  const initialState = getInitialPermissionState(
    permissionScenes,
    fallbackTree,
  );
  const sceneKey =
    currentState?.sceneKey &&
    (permissionScenes?.some((scene) => scene.key === currentState.sceneKey) ||
      !permissionScenes?.length)
      ? currentState.sceneKey
      : initialState.sceneKey;
  const activeTree = getActivePermissionTree(
    permissionScenes,
    sceneKey,
    fallbackTree,
  ).tree;
  const activeModule =
    activeTree.find((item) => item.key === currentState?.moduleKey) ||
    activeTree.find((item) => item.key === initialState.moduleKey) ||
    activeTree[0];
  const activePage =
    activeModule?.children.find((item) => item.key === currentState?.pageKey) ||
    activeModule?.children.find((item) => item.key === initialState.pageKey) ||
    activeModule?.children[0];

  return {
    sceneKey,
    moduleKey: activeModule?.key || '',
    pageKey: activePage?.key || '',
  };
}

function normalizeOrgUserRecord(record: OrgUserPageRecord): StaffRecord {
  const displayName = getStaffDisplayName(record);
  const rawRecord = record as Record<string, any>;
  const roleMap = (rawRecord.roleMap || {}) as Record<string, string>;
  const roleName =
    getStaffRoleName(roleMap) || normalizeText(rawRecord.roleName);
  return {
    id: String(record.id || record.userId || ''),
    name: displayName,
    nickName: rawRecord.nickName || '',
    staffCode: String(
      rawRecord.staffCode || rawRecord.orgUserCode || record.id || '',
    ),
    userId: String(record.userId || ''),
    orgName: String(
      rawRecord.orgName || rawRecord.orgCode || rawRecord.orgId || '',
    ),
    storeName: String(
      rawRecord.storeName || rawRecord.orgName || rawRecord.orgCode || '',
    ),
    roleName,
    roleTag: roleName,
    position: String(rawRecord.position || rawRecord.jobName || ''),
    phone: record.phone || '',
    email: '',
    healthCard: '',
    remark: '',
    entryDate: record.createTime || '',
    account: record.account || '',
    avatar: rawRecord.avatar || rawRecord.avatarUrl || '',
    enabled: record.state !== false,
    avatarColor: record.state === false ? '#e5e7eb' : '#e9e1d6',
    roleMap,
    permissionTree: EMPTY_PERMISSION_TREE,
  };
}

function mergeOrgUserDetail(
  staff: StaffRecord,
  detail: OrgUserDetailRecord,
  permissionScenes?: StaffPermissionScene[],
): StaffRecord {
  const rawDetail = detail as Record<string, any>;
  const roleMap = detail.roleMap || staff.roleMap || {};
  const roleName =
    getStaffRoleName(roleMap) ||
    normalizeText(rawDetail.roleName) ||
    staff.roleName;
  return {
    ...staff,
    name: detail.name || staff.name,
    nickName: detail.nickName || staff.nickName || detail.name || staff.name,
    userId: detail.userId || staff.userId,
    staffCode: rawDetail.staffCode || rawDetail.orgUserCode || staff.staffCode,
    orgName:
      rawDetail.orgName || detail.orgCode || detail.orgId || staff.orgName,
    storeName:
      rawDetail.storeName ||
      rawDetail.orgName ||
      detail.orgCode ||
      detail.orgId ||
      staff.storeName,
    phone: rawDetail.phone || staff.phone,
    position: rawDetail.position || rawDetail.jobName || staff.position,
    email: rawDetail.email || staff.email,
    healthCard:
      rawDetail.healthCard || rawDetail.healthCardUrl || staff.healthCard,
    remark: rawDetail.remark || staff.remark,
    entryDate: rawDetail.createTime || rawDetail.entryDate || staff.entryDate,
    account: rawDetail.account || staff.account,
    enabled: detail.state ?? staff.enabled,
    roleMap,
    overridePermIds: detail.overridePermIds || {},
    permissionScenes,
    avatar: detail.avatar || detail.avatarUrl || staff.avatar,
    roleName,
    roleTag: roleName,
  };
}

function buildOrgUserPageParams(
  current: number,
  pageSize: number,
  keyword: string,
) {
  const nextKeyword = keyword.trim();
  const params: {
    current: number;
    pageSize: number;
    nickName?: string;
    name?: string;
    phone?: string;
    account?: string;
  } = {
    current,
    pageSize,
  };
  if (!nextKeyword) return params;
  if (/^1\d{10}$/.test(nextKeyword)) {
    params.phone = nextKeyword;
    return params;
  }
  if (/^[a-zA-Z0-9_.-]+$/.test(nextKeyword)) {
    params.account = nextKeyword;
    return params;
  }
  params.name = nextKeyword;
  params.nickName = nextKeyword;
  return params;
}
function getInitialPermissionKeys(permissionTree?: StaffPermissionModule[]) {
  const moduleKey = permissionTree?.[0]?.key || '';
  const pageKey = permissionTree?.[0]?.children[0]?.key || '';
  return { moduleKey, pageKey };
}

function getPageCheckedState(page?: StaffPermissionPage) {
  return getPermissionNodeCheckedState(page);
}

function getModuleCheckedState(moduleItem?: StaffPermissionModule) {
  return getPermissionNodeCheckedState(moduleItem);
}

function updatePermissionScenesChecked(
  scenes: StaffPermissionScene[] | undefined,
  options: {
    sceneKey?: string;
    businessKey?: string;
    moduleKey?: string;
    pageKey?: string;
    permissionKey?: string;
    checked: boolean;
  },
) {
  return (scenes || []).map((scene) => {
    if (options.sceneKey && scene.key !== options.sceneKey) return scene;
    return {
      ...scene,
      businesses: scene.businesses.map((business) => {
        if (options.businessKey && business.key !== options.businessKey) {
          return business;
        }
        return {
          ...business,
          modules: business.modules.map((moduleItem) => {
            if (options.moduleKey && moduleItem.key !== options.moduleKey) {
              return moduleItem;
            }
            if (!options.pageKey && !options.permissionKey) {
              return setPermissionNodeChecked(moduleItem, options.checked);
            }
            return syncPermissionNodeChecked({
              ...moduleItem,
              children: moduleItem.children.map((page) => {
                if (options.pageKey && page.key !== options.pageKey) {
                  return page;
                }
                if (!options.permissionKey) {
                  return setPermissionNodeChecked(page, options.checked);
                }
                return updatePermissionNodeChecked(
                  page,
                  options.permissionKey,
                  options.checked,
                );
              }),
            });
          }),
        };
      }),
    };
  });
}

function buildOverridePermIds(permissionScenes?: StaffPermissionScene[]) {
  const result: Record<string, string[]> = {};
  (permissionScenes || []).forEach((scene) => {
    scene.businesses.forEach((business) => {
      const checkedIds = collectCheckedPermissionNodeIds(business.modules);
      result[business.key] = Array.from(new Set(checkedIds));
    });
  });
  return result;
}

function getStaffFormInitialValues(staff?: StaffRecord) {
  return {
    name: staff?.name,
    nickName: staff?.nickName || staff?.name,
    phone: staff?.phone,
    avatarFileList: createRemoteUploadFileList(staff?.avatar, 'staff-avatar'),
    password: undefined,
  };
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function isMeaningfulValue(value: unknown) {
  const text = normalizeText(value);
  return text !== '' && text !== '-';
}

function getStaffDetailItems(staff: StaffRecord) {
  return [
    { label: '员工ID', value: staff.userId },
    { label: '手机号', value: staff.phone },
    { label: '入职时间', value: staff.entryDate },
  ].filter((item) => isMeaningfulValue(item.value));
}

function renderStaffInfoGrid(staff: StaffRecord) {
  const items = getStaffDetailItems(staff);
  if (items.length === 0) return null;
  return (
    <div className="staff-info-grid">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}:</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function scrollToFormSection(key: string) {
  const target = document.getElementById(`staff-form-${key}`);
  const container = target?.closest('.staff-create-form') as HTMLElement | null;
  if (!target || !container) return;
  const targetTop =
    target.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop;
  container.scrollTo({
    top: targetTop,
    behavior: 'smooth',
  });
}

function getPermissionColumnTitle(levelIndex: number) {
  if (levelIndex === 0) return '模块';
  if (levelIndex === 1) return '目录/菜单';
  return '菜单';
}

const StaffAvatar: React.FC<{ staff: StaffRecord; size?: number }> = ({
  staff,
  size = 48,
}) => {
  const avatar = normalizeText(staff.avatar);
  return (
    <Avatar
      size={size}
      src={avatar || undefined}
      icon={<UserOutlined />}
      className={['staff-avatar', avatar ? '' : 'staff-avatar-default']
        .filter(Boolean)
        .join(' ')}
      style={avatar ? undefined : { backgroundColor: staff.avatarColor }}
    />
  );
};
type StaffPermissionMatrixProps = {
  permissionTree: StaffPermissionModule[];
  permissionScenes?: StaffPermissionScene[];
  activePermissionScene: string;
  activeModuleKey: string;
  activePageKey: string;
  onPermissionSceneChange: (
    value: string,
    moduleKey?: string,
    pageKey?: string,
  ) => void;
  onModuleChange: (moduleKey: string, pageKey: string) => void;
  onPageChange: (pageKey: string) => void;
  editable?: boolean;
  onPermissionScenesChange?: (scenes: StaffPermissionScene[]) => void;
};
const StaffPermissionMatrix: React.FC<StaffPermissionMatrixProps> = ({
  permissionTree,
  permissionScenes,
  activePermissionScene,
  activeModuleKey,
  activePageKey,
  onPermissionSceneChange,
  onModuleChange,
  onPageChange,
  editable = false,
  onPermissionScenesChange,
}) => {
  const [activeNestedKeys, setActiveNestedKeys] = useState<
    Record<number, string>
  >({});
  const activePermission = getActivePermissionTree(
    permissionScenes,
    activePermissionScene,
    permissionTree,
  );
  const sceneOptions =
    permissionScenes && permissionScenes.length > 0
      ? permissionScenes.map((scene) => ({
          key: scene.key,
          name: scene.name,
          tree: scene.businesses[0]?.modules || [],
        }))
      : [];
  const displayPermissionTree = activePermission.tree;
  const activeModule =
    displayPermissionTree.find((item) => item.key === activeModuleKey) ||
    displayPermissionTree[0];
  const activePage =
    activeModule?.children.find((item) => item.key === activePageKey) ||
    activeModule?.children[0];
  const activeSceneKey = activePermission.scene?.key;
  const activeBusinessKey = activePermission.business?.key;
  const nestedColumns: {
    key: string;
    title: string;
    items: StaffPermissionNode[];
    activeKey: string;
    levelIndex: number;
  }[] = [];
  let activePermissionParent = activePage;
  let activePermissionItems: StaffPermissionNode[] = [];
  let levelIndex = 2;
  while (activePermissionParent?.children.length) {
    const items = activePermissionParent.children;
    const permissionItems = items.filter((item) => item.isButtonPermission);
    const navigationItems = items.filter((item) => !item.isButtonPermission);
    const hasNextLevel = navigationItems.some(
      (item) => item.children.length > 0,
    );
    if (navigationItems.length === 0) {
      activePermissionItems =
        permissionItems.length > 0 ? permissionItems : items;
      break;
    }
    if (levelIndex >= 3 && !hasNextLevel && permissionItems.length === 0) {
      activePermissionItems = navigationItems;
      break;
    }
    const activeKey = activeNestedKeys[levelIndex];
    const activeItem =
      navigationItems.find((item) => item.key === activeKey) ||
      navigationItems[0];
    nestedColumns.push({
      key: `level-${levelIndex}`,
      title: getPermissionColumnTitle(levelIndex),
      items: navigationItems,
      activeKey: activeItem?.key || '',
      levelIndex,
    });
    if (!activeItem || activeItem.children.length === 0) {
      activePermissionItems = [];
      break;
    }
    activePermissionParent = activeItem;
    levelIndex += 1;
  }
  const selectNestedPermission = (
    nextLevelIndex: number,
    permissionKey: string,
  ) => {
    setActiveNestedKeys((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (numericKey < nextLevelIndex) {
          next[numericKey] = value;
        }
      });
      next[nextLevelIndex] = permissionKey;
      return next;
    });
  };
  useEffect(() => {
    setActiveNestedKeys({});
  }, [activePermissionScene, activeModuleKey, activePageKey]);
  const updateChecked = (options: {
    moduleKey?: string;
    pageKey?: string;
    permissionKey?: string;
    checked: boolean;
  }) => {
    if (!editable || !permissionScenes || !onPermissionScenesChange) return;
    onPermissionScenesChange(
      updatePermissionScenesChecked(permissionScenes, {
        sceneKey: activeSceneKey,
        businessKey: activeBusinessKey,
        ...options,
      }),
    );
  };
  if (sceneOptions.length === 0 || displayPermissionTree.length === 0) {
    return (
      <div className="staff-permission-empty">
        <Empty description="暂无角色权限数据" />
      </div>
    );
  }
  return (
    <>
      <div className="staff-permission-roles">
        {sceneOptions.map((scene) => (
          <button
            key={scene.key}
            type="button"
            className={activePermissionScene === scene.key ? 'is-active' : ''}
            onClick={() => {
              const firstModule = scene.tree[0];
              onPermissionSceneChange(
                scene.key,
                firstModule?.key,
                firstModule?.children[0]?.key,
              );
            }}
          >
            {scene.name}
          </button>
        ))}
      </div>
      <div className="staff-permission-panel">
        <div className="staff-permission-tags">
          <Tag className="staff-permission-business-tag is-active">
            <Checkbox checked disabled>
              {activePermission.business?.name || '门店视角'}
            </Checkbox>
          </Tag>
        </div>
        <div className="staff-permission-matrix">
          <div className="staff-permission-column">
            <div className="staff-permission-column-title">模块</div>
            <div className="staff-permission-column-body">
              {displayPermissionTree.map((moduleItem) => {
                const checkedState = getModuleCheckedState(moduleItem);
                return (
                  <button
                    key={moduleItem.key}
                    type="button"
                    className={
                      moduleItem.key === activeModule?.key ? 'is-active' : ''
                    }
                    onClick={() =>
                      onModuleChange(
                        moduleItem.key,
                        moduleItem.children[0]?.key || '',
                      )
                    }
                  >
                    <Checkbox
                      checked={checkedState.checked}
                      indeterminate={checkedState.indeterminate}
                      disabled={!editable}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        updateChecked({
                          moduleKey: moduleItem.key,
                          checked: event.target.checked,
                        })
                      }
                    />
                    <span>{moduleItem.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="staff-permission-column is-page">
            <div className="staff-permission-column-title">目录/菜单</div>
            <div className="staff-permission-column-body">
              {activeModule?.children.map((page) => {
                const checkedState = getPageCheckedState(page);
                return (
                  <button
                    key={page.key}
                    type="button"
                    className={page.key === activePage?.key ? 'is-active' : ''}
                    onClick={() => onPageChange(page.key)}
                  >
                    <Checkbox
                      checked={checkedState.checked}
                      indeterminate={checkedState.indeterminate}
                      disabled={!editable}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        updateChecked({
                          moduleKey: activeModule.key,
                          pageKey: page.key,
                          checked: event.target.checked,
                        })
                      }
                    />
                    <span>{page.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {nestedColumns.map((column) => (
            <div key={column.key} className="staff-permission-column">
              <div className="staff-permission-column-title">
                {column.title}
              </div>
              <div className="staff-permission-column-body">
                {column.items.map((permission) => {
                  const checkedState =
                    getPermissionNodeCheckedState(permission);
                  return (
                    <button
                      key={permission.key}
                      type="button"
                      className={
                        permission.key === column.activeKey ? 'is-active' : ''
                      }
                      onClick={() =>
                        selectNestedPermission(
                          column.levelIndex,
                          permission.key,
                        )
                      }
                    >
                      <Checkbox
                        checked={checkedState.checked}
                        indeterminate={checkedState.indeterminate}
                        disabled={!editable}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          updateChecked({
                            moduleKey: activeModule?.key,
                            pageKey: activePage?.key,
                            permissionKey: permission.key,
                            checked: event.target.checked,
                          })
                        }
                      />
                      <span>{permission.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="staff-permission-column is-actions">
            <div className="staff-permission-column-title">权限</div>
            <div className="staff-permission-action-list">
              {activePermissionItems.map((permission) => (
                <Checkbox
                  key={permission.key}
                  checked={permission.checked}
                  disabled={!editable}
                  onChange={(event) =>
                    updateChecked({
                      moduleKey: activeModule?.key,
                      pageKey: activePage?.key,
                      permissionKey: permission.key,
                      checked: event.target.checked,
                    })
                  }
                >
                  {permission.name}
                </Checkbox>
              ))}
              {activePermissionItems.length === 0 ? (
                <Empty
                  description="暂无下级权限"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

type RolePickerModalProps = {
  open: boolean;
  currentOrgCode?: string;
  selectedRoles: StaffRoleRecord[];
  onCancel: () => void;
  onConfirm: (roles: StaffRoleRecord[]) => void;
};

const ROLE_PICKER_PAGE_SIZE = 6;

const RolePickerModal: React.FC<RolePickerModalProps> = ({
  open,
  currentOrgCode,
  selectedRoles,
  onCancel,
  onConfirm,
}) => {
  const [roles, setRoles] = useState<StaffRoleRecord[]>([]);
  const [selectedRoleMap, setSelectedRoleMap] = useState<
    Map<string, StaffRoleRecord>
  >(new Map());
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [current, setCurrent] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const selectedRoleList = useMemo(
    () => Array.from(selectedRoleMap.values()),
    [selectedRoleMap],
  );

  const loadRoles = useCallback(async () => {
    if (!open || !currentOrgCode) {
      setRoles([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await getRolePageList(
        {
          current,
          pageSize: ROLE_PICKER_PAGE_SIZE,
          roleName: searchKeyword || undefined,
        } as RolePageListParams,
        { skipErrorHandler: true },
      );
      const records = Array.isArray(res?.records) ? res.records : [];
      setRoles(
        records
          .filter((item: any) => item?.id)
          .map((item: any) => ({ ...item, id: String(item.id) })),
      );
      setTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load role picker failed:', error);
      message.error(getErrorMessage(error, '获取角色列表失败'));
      setRoles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [current, currentOrgCode, open, searchKeyword]);

  useEffect(() => {
    if (!open) return;
    setSelectedRoleMap(
      new Map(selectedRoles.map((role) => [String(role.id), role])),
    );
  }, [open, selectedRoles]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const removeSelectedRole = (roleId: string) => {
    setSelectedRoleMap((prev) => {
      const next = new Map(prev);
      next.delete(roleId);
      return next;
    });
  };

  const roleColumns = [
    {
      title: '角色名称',
      dataIndex: 'roleName',
      render: (value: string) => value || '-',
    },
    {
      title: '角色描述',
      dataIndex: 'roleDesc',
      render: (_value: string, record: StaffRoleRecord) =>
        record.roleDesc || record.description || record.remark || '-',
    },
  ];

  return (
    <Modal
      title="选择角色"
      open={open}
      width={880}
      className="staff-role-picker-modal"
      destroyOnClose
      onCancel={onCancel}
      onOk={() => {
        if (selectedRoleList.length === 0) {
          message.warning('请选择角色');
          return;
        }
        onConfirm(selectedRoleList);
      }}
    >
      <div className="staff-role-picker-search">
        <Input.Search
          allowClear
          placeholder="输入名称按 enter 搜索"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => {
            setCurrent(1);
            setSearchKeyword(value.trim());
          }}
        />
      </div>
      <Table<StaffRoleRecord>
        rowKey="id"
        size="small"
        loading={loading}
        columns={roleColumns}
        dataSource={roles}
        rowSelection={{
          selectedRowKeys: selectedRoleList.map((role) => role.id),
          onSelect: (record, selected) => {
            setSelectedRoleMap((prev) => {
              const next = new Map(prev);
              if (selected) next.set(record.id, record);
              else next.delete(record.id);
              return next;
            });
          },
          onSelectAll: (selected, _selectedRows, changeRows) => {
            setSelectedRoleMap((prev) => {
              const next = new Map(prev);
              changeRows.forEach((role) => {
                if (selected) next.set(role.id, role);
                else next.delete(role.id);
              });
              return next;
            });
          },
        }}
        pagination={{
          current,
          pageSize: ROLE_PICKER_PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: (value) => `共 ${value} 条`,
          onChange: (page) => setCurrent(page),
        }}
      />
      <div className="staff-role-picker-result-head">
        <span>选择结果：已选{selectedRoleList.length}个</span>
        <span>下方单击行可移除</span>
        <button type="button" onClick={() => setSelectedRoleMap(new Map())}>
          清空
        </button>
      </div>
      <Table<StaffRoleRecord>
        rowKey="id"
        size="small"
        columns={roleColumns}
        dataSource={selectedRoleList}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无数据" /> }}
        onRow={(record) => ({
          onClick: () => removeSelectedRole(record.id),
        })}
      />
    </Modal>
  );
};

type StoreStaffFormPageProps = {
  mode?: 'create' | 'edit';
  staffId?: string;
};
const StoreStaffCreatePage: React.FC<StoreStaffFormPageProps> = ({
  mode = 'create',
  staffId,
}) => {
  const { initialState } = useModel('@@initialState');
  const currentOrgCode = initialState?.currentOrgCode;
  const [form] = Form.useForm();
  const [staff, setStaff] = useState<StaffRecord>();
  const [pageLoading, setPageLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<StaffRoleRecord[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionScenes, setPermissionScenes] =
    useState<StaffPermissionScene[]>();
  const [permissionExpanded, setPermissionExpanded] = useState(true);
  const permissionTree = staff?.permissionTree || EMPTY_PERMISSION_TREE;
  const initialPermissionState = getInitialPermissionState(
    permissionScenes,
    permissionTree,
  );
  const [activePermissionScene, setActivePermissionScene] = useState(
    initialPermissionState.sceneKey,
  );
  const [activeModuleKey, setActiveModuleKey] = useState(
    initialPermissionState.moduleKey,
  );
  const [activePageKey, setActivePageKey] = useState(
    initialPermissionState.pageKey,
  );
  const activePermissionStateRef = useRef<StaffPermissionActiveState>(
    initialPermissionState,
  );
  const [activeFormSection, setActiveFormSection] =
    useState<StaffFormSectionKey>(STAFF_FORM_SECTIONS[0].key);
  const isEdit = mode === 'edit';
  const activeFormSectionIndex = STAFF_FORM_SECTIONS.findIndex(
    (item) => item.key === activeFormSection,
  );
  const selectedRoleIds = useMemo(
    () => selectedRoles.map((role) => String(role.id)).filter(Boolean),
    [selectedRoles],
  );

  useEffect(() => {
    form.setFieldsValue(getStaffFormInitialValues(staff));
  }, [form, staff]);

  useEffect(() => {
    activePermissionStateRef.current = {
      sceneKey: activePermissionScene,
      moduleKey: activeModuleKey,
      pageKey: activePageKey,
    };
  }, [activePermissionScene, activeModuleKey, activePageKey]);

  useEffect(() => {
    const nextState = getStablePermissionState(
      permissionScenes,
      permissionTree,
      activePermissionStateRef.current,
    );
    setActivePermissionScene(nextState.sceneKey);
    setActiveModuleKey(nextState.moduleKey);
    setActivePageKey(nextState.pageKey);
  }, [permissionScenes, permissionTree]);

  useEffect(() => {
    if (!isEdit) return;
    if (!staffId) return;
    let ignore = false;
    const loadEditStaff = async () => {
      setPageLoading(true);
      try {
        const detail = await getOrgUserDetail(staffId, {
          skipErrorHandler: true,
        });
        if (ignore) return;
        const baseStaff = normalizeOrgUserRecord({
          ...(detail as Record<string, any>),
          id: detail.id || staffId,
        } as OrgUserPageRecord);
        const roleMap = detail.roleMap || {};
        const nextRoles = normalizeRoleMap(roleMap);
        const roleIds = nextRoles.map((role) => role.id).filter(Boolean);
        let nextPermissionScenes: StaffPermissionScene[] | undefined;
        if (roleIds.length > 0) {
          const treeRes = await getRolePermTree(
            { roleIds },
            { skipErrorHandler: true },
          );
          if (ignore) return;
          nextPermissionScenes = toCheckedStaffPermissionScenes(
            extractRolePermTreeNodes(treeRes),
            detail.overridePermIds,
          );
        }
        setSelectedRoles(nextRoles);
        setPermissionScenes(nextPermissionScenes);
        setStaff(mergeOrgUserDetail(baseStaff, detail, nextPermissionScenes));
      } catch (error) {
        if (!ignore) {
          console.error('load edit staff failed:', error);
          message.error(getErrorMessage(error, '获取员工详情失败'));
        }
      } finally {
        if (!ignore) setPageLoading(false);
      }
    };
    void loadEditStaff();
    return () => {
      ignore = true;
    };
  }, [isEdit, staffId]);

  const loadRolePermissionTree = useCallback(async (roleIds: string[]) => {
    if (roleIds.length === 0) {
      setPermissionScenes(undefined);
      return;
    }
    setPermissionLoading(true);
    try {
      const treeRes = await getRolePermTree(
        { roleIds },
        { skipErrorHandler: true },
      );
      const nextPermissionScenes = toCheckedStaffPermissionScenes(
        extractRolePermTreeNodes(treeRes),
      );
      setPermissionScenes(nextPermissionScenes);
      setPermissionExpanded(true);
    } catch (error) {
      console.error('getRolePermTree failed:', error);
      setPermissionScenes(undefined);
      message.error(getErrorMessage(error, '获取角色权限树失败'));
    } finally {
      setPermissionLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const nickName = normalizeText(values.nickName);
      const overridePermIds = buildOverridePermIds(permissionScenes);
      if (isEdit) {
        const id = staffId || staff?.id;
        if (!id) {
          message.error('缺少员工ID');
          return;
        }
        setSubmitLoading(true);
        const res = await modifyOrgUser(
          {
            id,
            nickName,
            roleIds: selectedRoleIds,
            overridePermIds,
          },
          { skipErrorHandler: true },
        );
        message.success(getApiMessage(res, '修改员工成功'));
        history.push('/permission/store-staff');
        return;
      }
      const avatar = await resolveUploadAttachmentId(
        values.avatarFileList as UploadFile[] | undefined,
        staff?.avatar || '',
      );
      const name = normalizeText(values.name);
      const phone = normalizeText(values.phone);
      const password = normalizeText(values.password);
      const data: AddOrgUserParams = {
        phone,
        nickName,
        name,
        roleIds: selectedRoleIds,
        overridePermIds,
      };
      if (password) data.password = password;
      if (avatar) data.avatar = avatar;
      setSubmitLoading(true);
      const res = await addOrgUser(data, { skipErrorHandler: true });
      message.success(getApiMessage(res, '新增员工账号成功'));
      history.push('/permission/store-staff');
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('save org user failed:', error);
      message.error(
        getErrorMessage(error, isEdit ? '编辑员工失败' : '新增员工失败'),
      );
    } finally {
      setSubmitLoading(false);
    }
  };
  const handleFormScroll = (event: React.UIEvent<HTMLFormElement>) => {
    const container = event.currentTarget;
    const containerTop = container.getBoundingClientRect().top;
    const anchorLine = container.scrollTop + 72;
    let nextKey: StaffFormSectionKey = STAFF_FORM_SECTIONS[0].key;
    STAFF_FORM_SECTIONS.forEach((item) => {
      const section = document.getElementById(`staff-form-${item.key}`);
      if (!section) return;
      const sectionTop =
        section.getBoundingClientRect().top -
        containerTop +
        container.scrollTop;
      if (anchorLine >= sectionTop) {
        nextKey = item.key;
      }
    });
    setActiveFormSection((current) =>
      current === nextKey ? current : nextKey,
    );
  };
  const handleRemoveSelectedRole = (roleId: string) => {
    const nextRoles = selectedRoles.filter((role) => role.id !== roleId);
    setSelectedRoles(nextRoles);
    void loadRolePermissionTree(nextRoles.map((role) => String(role.id)));
  };
  if (pageLoading) {
    return (
      <div className="store-staff-create-page">
        <Spin className="staff-page-loading" />
      </div>
    );
  }

  return (
    <div className="store-staff-create-page">
      <div className="staff-create-title-bar">
        <div className="staff-create-title">
          {isEdit ? '修改员工账号' : '新增员工账号'}
        </div>
        <Space>
          <Button onClick={() => history.push('/permission/store-staff')}>
            取消
          </Button>
          <Button type="primary" loading={submitLoading} onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      </div>
      <div className="staff-create-layout">
        <aside className="staff-create-steps">
          {STAFF_FORM_SECTIONS.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={[
                item.key === activeFormSection ? 'is-active' : '',
                index < activeFormSectionIndex ? 'is-passed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setActiveFormSection(item.key);
                scrollToFormSection(item.key);
              }}
            >
              <span className="staff-create-step-dot" />
              <span>{item.label}</span>
            </button>
          ))}
        </aside>
        <Form
          form={form}
          className="staff-create-form"
          layout="horizontal"
          labelCol={{ flex: '150px' }}
          wrapperCol={{ flex: '520px' }}
          onScroll={handleFormScroll}
          initialValues={getStaffFormInitialValues(staff)}
        >
          <section id="staff-form-basic" className="staff-create-card">
            <div className="staff-create-section-title">基本信息</div>
            <Form.Item
              label="姓名"
              name="name"
              rules={
                isEdit ? [] : [{ required: true, message: '请输入员工姓名' }]
              }
            >
              <Input disabled={isEdit} placeholder="请输入" maxLength={30} />
            </Form.Item>
            <Form.Item
              label="昵称"
              name="nickName"
              rules={[{ required: true, message: '请输入昵称' }]}
            >
              <Input placeholder="请输入" maxLength={30} />
            </Form.Item>
            <Form.Item
              label="手机号"
              name="phone"
              rules={
                isEdit ? [] : [{ required: true, message: '请输入手机号' }]
              }
            >
              <Input disabled={isEdit} placeholder="请输入" maxLength={20} />
            </Form.Item>
            <Form.Item label="登录密码" name="password">
              <Input.Password
                disabled={isEdit}
                placeholder="请输入8-20位，大小写字母、数字、英文字符"
              />
            </Form.Item>
            <Form.Item
              label="头像"
              name="avatarFileList"
              valuePropName="fileList"
              getValueFromEvent={normalizeUploadFileList}
            >
              <Upload
                accept="image/*"
                customRequest={imageUploadRequest}
                maxCount={1}
                listType="picture-card"
                className="staff-avatar-upload"
                disabled={isEdit}
              >
                <div className="staff-avatar-upload-box">
                  <PlusOutlined />
                  <span>上传头像</span>
                </div>
              </Upload>
            </Form.Item>
          </section>
          <section id="staff-form-permission" className="staff-create-card">
            <div className="staff-create-section-title">功能权限信息</div>
            <Form.Item label="关联角色" required>
              <div className="staff-selected-role-list">
                {selectedRoles.length > 0
                  ? selectedRoles.map((role) => (
                      <Tag
                        key={role.id}
                        className="staff-select-pill"
                        closable
                        onClose={(event) => {
                          event.preventDefault();
                          handleRemoveSelectedRole(role.id);
                        }}
                      >
                        {role.roleName || role.id}
                      </Tag>
                    ))
                  : null}
                <Button
                  className="staff-dashed-btn"
                  onClick={() => setRolePickerOpen(true)}
                >
                  + 关联角色
                </Button>
              </div>
            </Form.Item>
            <div className="staff-create-permission-link">
              <button
                type="button"
                className="staff-permission-toggle"
                onClick={() => setPermissionExpanded((value) => !value)}
              >
                查看权限详情
                <DownOutlined className={permissionExpanded ? 'is-open' : ''} />
              </button>
            </div>
            {permissionExpanded ? (
              <div className="staff-permission-detail staff-create-permission-detail">
                {permissionLoading ? (
                  <div className="staff-permission-loading">
                    <Spin />
                  </div>
                ) : (
                  <StaffPermissionMatrix
                    permissionTree={permissionTree}
                    permissionScenes={permissionScenes}
                    activePermissionScene={activePermissionScene}
                    activeModuleKey={activeModuleKey}
                    activePageKey={activePageKey}
                    onPermissionSceneChange={(value, moduleKey, pageKey) => {
                      setActivePermissionScene(value);
                      if (moduleKey) setActiveModuleKey(moduleKey);
                      if (pageKey) setActivePageKey(pageKey);
                    }}
                    onModuleChange={(moduleKey, pageKey) => {
                      setActiveModuleKey(moduleKey);
                      setActivePageKey(pageKey);
                    }}
                    onPageChange={setActivePageKey}
                    editable
                    onPermissionScenesChange={setPermissionScenes}
                  />
                )}
              </div>
            ) : null}
          </section>
        </Form>
      </div>
      <RolePickerModal
        open={rolePickerOpen}
        currentOrgCode={currentOrgCode}
        selectedRoles={selectedRoles}
        onCancel={() => setRolePickerOpen(false)}
        onConfirm={(roles) => {
          setSelectedRoles(roles);
          setRolePickerOpen(false);
          void loadRolePermissionTree(roles.map((role) => String(role.id)));
        }}
      />
    </div>
  );
};
const StoreStaffListPage: React.FC = () => {
  const staffListRef = useRef<HTMLDivElement | null>(null);
  const [staffs, setStaffs] = useState<StaffRecord[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffKeyword, setStaffKeyword] = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');
  const [staffStatus] = useState<string>();
  const [listVersion, setListVersion] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(STAFF_LIST_MIN_PAGE_SIZE);
  const [isPageSizeReady, setIsPageSizeReady] = useState(false);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffLoading, setStaffLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [permissionExpanded, setPermissionExpanded] = useState(true);
  const initialPermissionState = getInitialPermissionState();
  const [activePermissionScene, setActivePermissionScene] = useState(
    initialPermissionState.sceneKey,
  );
  const [activeModuleKey, setActiveModuleKey] = useState(
    initialPermissionState.moduleKey,
  );
  const [activePageKey, setActivePageKey] = useState(
    initialPermissionState.pageKey,
  );
  const totalStaffs = staffTotal;
  const maxPage = Math.max(1, Math.ceil(totalStaffs / pageSize));
  const normalizedCurrentPage = Math.min(currentPage, maxPage);
  const pagedStaffs = staffs;
  const selectedStaff = useMemo(
    () => staffs.find((item) => item.id === selectedStaffId) || pagedStaffs[0],
    [pagedStaffs, selectedStaffId, staffs],
  );
  useEffect(() => {
    const nextState = getInitialPermissionState(
      selectedStaff?.permissionScenes,
      selectedStaff?.permissionTree || EMPTY_PERMISSION_TREE,
    );
    setActivePermissionScene(nextState.sceneKey);
    setActiveModuleKey(nextState.moduleKey);
    setActivePageKey(nextState.pageKey);
  }, [selectedStaff]);
  useEffect(() => {
    const listNode = staffListRef.current;
    if (!listNode) return;
    const updatePageSize = () => {
      const nextPageSize = getResponsiveStaffPageSize(listNode.clientHeight);
      setPageSize((prev) => (prev === nextPageSize ? prev : nextPageSize));
      setIsPageSizeReady(true);
    };
    updatePageSize();
    if (typeof ResizeObserver === 'undefined') return;
    const resizeObserver = new ResizeObserver(updatePageSize);
    resizeObserver.observe(listNode);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, maxPage));
  }, [maxPage]);
  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setQueryKeyword(staffKeyword.trim());
      setCurrentPage(1);
    }, 300);
    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [staffKeyword]);
  useEffect(() => {
    setCurrentPage(1);
  }, [staffStatus]);
  useEffect(() => {
    if (pagedStaffs.length === 0) {
      setSelectedStaffId('');
      return;
    }
    if (pagedStaffs.some((staff) => staff.id === selectedStaffId)) return;
    setSelectedStaffId(pagedStaffs[0].id);
  }, [pagedStaffs, selectedStaffId]);
  useEffect(() => {
    if (!isPageSizeReady) return;
    let ignore = false;
    const abortController = new AbortController();
    const fetchStaffPage = async () => {
      setStaffLoading(true);
      try {
        const res = await getOrgUserPage(
          buildOrgUserPageParams(normalizedCurrentPage, pageSize, queryKeyword),
          { signal: abortController.signal },
        );
        if (ignore) return;
        const records = Array.isArray(res?.records) ? res.records : [];
        const nextStaffs = records.map(normalizeOrgUserRecord);
        setStaffs(nextStaffs);
        setStaffTotal(Number(res?.total || 0));
        setSelectedStaffId((current) => {
          if (nextStaffs.some((staff) => staff.id === current)) return current;
          return nextStaffs[0]?.id || '';
        });
      } catch (error) {
        if (!ignore) {
          console.error('getOrgUserPage failed:', error);
          message.error('获取员工列表失败');
          setStaffs([]);
          setStaffTotal(0);
        }
      } finally {
        if (!ignore) {
          setStaffLoading(false);
        }
      }
    };
    fetchStaffPage();
    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [
    isPageSizeReady,
    listVersion,
    normalizedCurrentPage,
    pageSize,
    queryKeyword,
  ]);
  useEffect(() => {
    if (!selectedStaffId) return;
    const currentStaff = staffs.find((staff) => staff.id === selectedStaffId);
    if (
      !currentStaff ||
      (currentStaff.roleMap && currentStaff.permissionScenes)
    )
      return;
    let ignore = false;
    const fetchStaffDetail = async () => {
      setDetailLoading(true);
      try {
        const detail = await getOrgUserDetail(selectedStaffId);
        if (ignore) return;
        const roleMap = detail.roleMap || {};
        const roleIds = normalizeRoleMap(roleMap)
          .map((role) => role.id)
          .filter(Boolean);
        let permissionScenes: StaffPermissionScene[] | undefined;

        if (roleIds.length > 0) {
          const treeRes = await getRolePermTree(
            { roleIds },
            { skipErrorHandler: true },
          );
          if (ignore) return;
          permissionScenes = toCheckedStaffPermissionScenes(
            extractRolePermTreeNodes(treeRes),
            detail.overridePermIds,
          );
        }

        setStaffs((prev) =>
          prev.map((staff) =>
            staff.id === selectedStaffId
              ? mergeOrgUserDetail(staff, detail, permissionScenes)
              : staff,
          ),
        );
      } catch (error) {
        if (!ignore) {
          console.error('getOrgUserDetail failed:', error);
          message.error('获取员工详情失败');
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    };
    fetchStaffDetail();
    return () => {
      ignore = true;
    };
  }, [selectedStaffId, staffs]);
  const handleSelectStaff = (staff: StaffRecord) => {
    setSelectedStaffId(staff.id);
    setPermissionExpanded(true);
  };
  const handleToggleStaffState = async (staffId: string, checked: boolean) => {
    try {
      const res = await updateOrgUserState(staffId, { skipErrorHandler: true });
      setStaffs((prev) =>
        prev.map((staff) =>
          staff.id === staffId ? { ...staff, enabled: checked } : staff,
        ),
      );
      message.success(
        getApiMessage(res, checked ? '已启用员工' : '已禁用员工'),
      );
    } catch (error) {
      console.error('updateOrgUserState failed:', error);
      message.error(getErrorMessage(error, '修改员工状态失败'));
    }
  };
  const handleDeleteStaff = async (staffId: string) => {
    try {
      const res = await deleteOrgUser(staffId, { skipErrorHandler: true });
      message.success(getApiMessage(res, '删除员工成功'));
      setStaffs((prev) => prev.filter((staff) => staff.id !== staffId));
      setStaffTotal((prev) => Math.max(0, prev - 1));
      if (selectedStaffId === staffId) {
        setSelectedStaffId('');
      }
      if (staffs.length <= 1 && currentPage > 1) {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else {
        setListVersion((prev) => prev + 1);
      }
    } catch (error) {
      console.error('deleteOrgUser failed:', error);
      message.error(getErrorMessage(error, '删除员工失败'));
    }
  };
  return (
    <div className="store-staff-page">
      <div className="staff-filter-card">
        <div className="staff-filter-fields">
          <div className="staff-filter-field">
            <span>员工信息</span>
            <Input
              allowClear
              placeholder="昵称 / 姓名 / 手机号 / 账号"
              value={staffKeyword}
              onChange={(event) => setStaffKeyword(event.target.value)}
            />
          </div>
        </div>
        <Button
          type="primary"
          className="store-staff-create-btn"
          onClick={() => history.push('/permission/store-staff/create')}
        >
          新增员工
        </Button>
      </div>
      <div className="store-staff-layout">
        <aside className="staff-list-card">
          <div className="staff-list-head">
            <button type="button" className="staff-list-tab">
              全部({totalStaffs})
            </button>
          </div>
          <div className="staff-list" ref={staffListRef}>
            {staffLoading ? <Spin className="staff-list-loading" /> : null}
            {!staffLoading && totalStaffs === 0 ? (
              <Empty className="staff-list-empty" description="暂无员工数据" />
            ) : null}
            {!staffLoading &&
              pagedStaffs.map((staff) => {
                const active = staff.id === selectedStaff?.id;
                const staffMetas = [staff.roleName].filter(isMeaningfulValue);
                return (
                  <div
                    key={staff.id}
                    className={[
                      'staff-list-item',
                      active ? 'is-active' : '',
                      staff.enabled ? '' : 'is-disabled',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleSelectStaff(staff)}
                  >
                    <span className="staff-avatar-wrap">
                      <StaffAvatar staff={staff} />
                      {!staff.enabled ? (
                        <span className="staff-disabled-badge">禁用</span>
                      ) : null}
                    </span>
                    <span className="staff-list-main">
                      <span className="staff-list-name-row">
                        <span className="staff-list-name">{staff.name}</span>
                        {active ? (
                          <Switch
                            size="small"
                            checked={staff.enabled}
                            onClick={(_checked, event) =>
                              event.stopPropagation()
                            }
                            onChange={(checked) =>
                              handleToggleStaffState(staff.id, checked)
                            }
                          />
                        ) : null}
                      </span>
                      {staffMetas.length > 0 ? (
                        <span className="staff-list-meta">
                          {staffMetas.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
          </div>
          <div className="staff-list-pagination">
            <Pagination
              size="small"
              current={normalizedCurrentPage}
              pageSize={pageSize}
              total={totalStaffs}
              showSizeChanger={false}
              showLessItems
              showTotal={(total) => `共 ${total} 条`}
              onChange={(page) => setCurrentPage(page)}
            />
          </div>
        </aside>
        <main className="staff-detail-card">
          {detailLoading ? <Spin className="staff-detail-loading" /> : null}
          {selectedStaff ? (
            <>
              <div className="staff-detail-head">
                <div className="staff-detail-title">
                  <span className="staff-avatar-wrap is-detail">
                    <StaffAvatar staff={selectedStaff} size={58} />
                    {!selectedStaff.enabled ? (
                      <span className="staff-disabled-badge">禁用</span>
                    ) : null}
                  </span>
                  <div>
                    <div className="staff-detail-name">
                      {selectedStaff.name}
                      {isMeaningfulValue(selectedStaff.storeName) ? (
                        <span>({selectedStaff.storeName})</span>
                      ) : null}
                    </div>
                    {renderStaffRoleTags(selectedStaff)}
                  </div>
                </div>
                <Space className="staff-detail-actions">
                  <Button
                    className="staff-action-btn is-edit"
                    icon={<EditOutlined />}
                    onClick={() =>
                      history.push(
                        `/permission/store-staff/edit/${selectedStaff.id}`,
                      )
                    }
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确认删除该员工？"
                    onConfirm={() => handleDeleteStaff(selectedStaff.id)}
                  >
                    <Button
                      className="staff-action-btn is-delete"
                      icon={<DeleteOutlined />}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
              <section className="staff-detail-section">
                <div className="staff-section-title">基本信息</div>
                {renderStaffInfoGrid(selectedStaff)}
              </section>
              <section className="staff-detail-section">
                <div className="staff-section-title">功能权限</div>
                {getStaffRoles(selectedStaff).length > 0 ? (
                  <div className="staff-role-line">
                    <span>关联角色:</span>
                    {renderStaffRoleTags(selectedStaff)}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="staff-permission-toggle"
                  onClick={() => setPermissionExpanded((value) => !value)}
                >
                  查看权限详情
                  <DownOutlined
                    className={permissionExpanded ? 'is-open' : ''}
                  />
                </button>
                {permissionExpanded ? (
                  <div className="staff-permission-detail staff-permission-record-detail">
                    <StaffPermissionMatrix
                      permissionTree={
                        selectedStaff.permissionTree || EMPTY_PERMISSION_TREE
                      }
                      permissionScenes={selectedStaff.permissionScenes}
                      activePermissionScene={activePermissionScene}
                      activeModuleKey={activeModuleKey}
                      activePageKey={activePageKey}
                      onPermissionSceneChange={(value, moduleKey, pageKey) => {
                        setActivePermissionScene(value);
                        if (moduleKey) setActiveModuleKey(moduleKey);
                        if (pageKey) setActivePageKey(pageKey);
                      }}
                      onModuleChange={(moduleKey, pageKey) => {
                        setActiveModuleKey(moduleKey);
                        setActivePageKey(pageKey);
                      }}
                      onPageChange={setActivePageKey}
                    />
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <Empty className="staff-detail-empty" description="暂无员工详情" />
          )}
        </main>
      </div>
    </div>
  );
};
const StoreStaffPage: React.FC = () => {
  const location = useLocation();
  const isCreatePage = location.pathname.endsWith('/create');
  const editMatch = location.pathname.match(
    /\/permission\/store-staff\/edit\/([^/]+)$/,
  );
  useEffect(() => {
    document.documentElement.classList.add('pc-store-staff-fixed-page');
    document.body.classList.add('pc-store-staff-fixed-page');
    return () => {
      document.documentElement.classList.remove('pc-store-staff-fixed-page');
      document.body.classList.remove('pc-store-staff-fixed-page');
    };
  }, []);
  if (editMatch) {
    return <StoreStaffCreatePage mode="edit" staffId={editMatch[1]} />;
  }
  return isCreatePage ? <StoreStaffCreatePage /> : <StoreStaffListPage />;
};
export default StoreStaffPage;
