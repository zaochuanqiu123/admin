import { InfoCircleFilled } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteRole,
  editRole,
  getOrgMenuTree,
  getRoleDetail,
  getRolePageList,
  type RolePageListParams,
  type RoleTerminalParams,
  saveRole,
  searchRole,
  updateRoleState,
} from '@/api/context';
import { PageSectionSkeleton } from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import './index.less';

type RoleItem = {
  id: string;
  roleCode?: string;
  roleName?: string;
  roleType?: number;
  state?: number;
  createTime?: string;
  permIds?: string[];
  isChangeable?: boolean;
};

type RoleTreeNode = {
  key: string;
  title: string;
  children?: RoleTreeNode[];
};

type RolePermissionCheckedState = {
  checked: boolean;
  indeterminate: boolean;
};

type RolePermissionMatrixNode = {
  key: string;
  title: string;
  checked: boolean;
  children: RolePermissionMatrixNode[];
};

type RolePermissionBusiness = {
  key: string;
  title: string;
  modules: RolePermissionMatrixNode[];
};

type RolePermissionScene = {
  key: string;
  title: string;
  businesses: RolePermissionBusiness[];
};

type RolePermissionActiveState = {
  sceneKey: string;
  businessKey: string;
  moduleKey: string;
  pageKey: string;
};

type CreateRoleFormValues = {
  roleName: string;
  roleType: number;
  state: number;
};

const DEFAULT_PAGE_SIZE = 10;
const ROLE_TREE_GROUP_KEY_PREFIX = '__roleTreeGroup__';

type RolePermissionMeta = {
  key: string;
  permissionId: string;
  permCode: string;
  terminalCode?: string;
  terminalName?: string;
  businessCode?: string;
  businessName?: string;
  businessVersionId?: string;
};

function getRoleTreeChildren(node: any): any[] {
  return (
    (Array.isArray(node?.children) && node.children) ||
    (Array.isArray(node?.childList) && node.childList) ||
    (Array.isArray(node?.child) && node.child) ||
    []
  );
}

function getRoleTreeTitle(node: any, index: number): string {
  const rawTitle =
    node?.terminalName ??
    node?.businessName ??
    node?.permName ??
    node?.name ??
    node?.title ??
    node?.menuName ??
    node?.text ??
    node?.label;
  const title = String(rawTitle ?? '').trim();
  return title || `未命名权限${index + 1}`;
}

function getRoleTreePermissionKey(node: any, index: number): string {
  const rawKey =
    node?.id ??
    node?.permId ??
    node?.menuId ??
    node?.targetId ??
    node?.pathUrl ??
    node?.permCode ??
    `${node?.name || node?.permName || 'node'}-${index}`;
  return String(rawKey);
}

function getRoleTreePermissionId(node: any): string {
  const rawId = node?.id ?? node?.permId ?? node?.menuId ?? node?.targetId;
  if (rawId === undefined || rawId === null || rawId === '') return '';
  return String(rawId);
}

function getRoleTreePermCode(node: any): string {
  const rawCode =
    node?.permCode ??
    node?.permissionCode ??
    node?.code ??
    node?.id ??
    node?.permId ??
    node?.menuId;
  if (rawCode === undefined || rawCode === null || rawCode === '') return '';
  return String(rawCode);
}

function getRoleGroupKey(
  type: 'terminal' | 'business',
  rawKey: unknown,
  index: number,
  parentKey?: string,
): string {
  const value = String(rawKey ?? index).trim() || String(index);
  return [ROLE_TREE_GROUP_KEY_PREFIX, type, parentKey, value]
    .filter(Boolean)
    .join(':');
}

function toRolePermissionNodes(
  nodes: any[],
  metaMap: Map<string, RolePermissionMeta>,
  context: Omit<RolePermissionMeta, 'key' | 'permissionId' | 'permCode'>,
): RoleTreeNode[] {
  return (nodes || []).map((node, index) => {
    const key = getRoleTreePermissionKey(node, index);
    const permissionId = getRoleTreePermissionId(node);
    const permCode = getRoleTreePermCode(node);
    const children = toRolePermissionNodes(
      getRoleTreeChildren(node),
      metaMap,
      context,
    );

    if (permissionId || permCode) {
      metaMap.set(key, {
        ...context,
        key,
        permissionId,
        permCode,
      });
    }

    return {
      key,
      title: getRoleTreeTitle(node, index),
      children: children.length > 0 ? children : undefined,
    };
  });
}

function toOrgRoleTreeData(nodes: any[]): {
  treeData: RoleTreeNode[];
  permissionMetaMap: Map<string, RolePermissionMeta>;
} {
  const permissionMetaMap = new Map<string, RolePermissionMeta>();
  const treeData = (nodes || []).map((terminalNode, terminalIndex) => {
    const terminalKey = getRoleGroupKey(
      'terminal',
      terminalNode?.terminalCode ?? terminalNode?.terminalName,
      terminalIndex,
    );
    const terminalName = String(terminalNode?.terminalName ?? '').trim();
    const terminalCode = String(terminalNode?.terminalCode ?? '').trim();
    const terminalChildren = getRoleTreeChildren(terminalNode);
    const children = terminalChildren.map((businessNode, businessIndex) => {
      const businessKey = getRoleGroupKey(
        'business',
        businessNode?.businessCode ?? businessNode?.businessName,
        businessIndex,
        terminalKey,
      );
      const businessName = String(businessNode?.businessName ?? '').trim();
      const businessCode = String(businessNode?.businessCode ?? '').trim();
      const businessVersionId = String(
        businessNode?.businessVersionId ?? '',
      ).trim();
      const businessPermissionId = getRoleTreePermissionId(businessNode);
      const businessPermCode = getRoleTreePermCode(businessNode);
      const permissionChildren = toRolePermissionNodes(
        getRoleTreeChildren(businessNode),
        permissionMetaMap,
        {
          terminalName,
          terminalCode,
          businessName,
          businessCode,
          businessVersionId,
        },
      );
      if (businessPermissionId || businessPermCode) {
        permissionMetaMap.set(businessKey, {
          key: businessKey,
          permissionId: businessPermissionId,
          permCode: businessPermCode,
          terminalName,
          terminalCode,
          businessName,
          businessCode,
          businessVersionId,
        });
      }

      return {
        key: businessKey,
        title: getRoleTreeTitle(businessNode, businessIndex),
        children:
          permissionChildren.length > 0 ? permissionChildren : undefined,
      };
    });

    return {
      key: terminalKey,
      title: getRoleTreeTitle(terminalNode, terminalIndex),
      children: children.length > 0 ? children : undefined,
    };
  });

  return {
    treeData,
    permissionMetaMap,
  };
}

function extractOrgRoleTreeNodes(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.menuTree)) return res.menuTree;
  if (Array.isArray(res?.data?.menuTree)) return res.data.menuTree;
  return [];
}

function buildRoleTerminalList(
  checkedKeys: React.Key[],
  permissionMetaMap: Map<string, RolePermissionMeta>,
): RoleTerminalParams[] {
  const terminalMap = new Map<
    string,
    {
      terminalName?: string;
      terminalCode?: string;
      perms: Set<string>;
    }
  >();

  checkedKeys.forEach((key) => {
    const meta = permissionMetaMap.get(String(key));
    if (!meta?.permissionId) return;

    const terminalKey = meta.terminalCode || meta.terminalName || 'terminal';
    const terminalItem = terminalMap.get(terminalKey) || {
      terminalName: meta.terminalName,
      terminalCode: meta.terminalCode,
      perms: new Set<string>(),
    };

    terminalItem.perms.add(meta.permissionId);
    terminalMap.set(terminalKey, terminalItem);
  });

  return Array.from(terminalMap.values()).map((terminal) => ({
    terminalName: terminal.terminalName,
    terminalCode: terminal.terminalCode,
    perms: Array.from(terminal.perms),
  }));
}

function extractCheckedPermissionKeys(
  detail: any,
  metaMap: Map<string, RolePermissionMeta>,
) {
  const detailData = detail?.data ?? detail;
  const perms = new Set<string>();
  const rolePermMap = detailData?.rolePermMap;
  if (rolePermMap && typeof rolePermMap === 'object') {
    const permissionGroups =
      rolePermMap instanceof Map
        ? Array.from(rolePermMap.values())
        : Object.values(rolePermMap);
    permissionGroups.forEach((permissionList: any) => {
      if (Array.isArray(permissionList)) {
        permissionList.forEach((perm: any) => {
          perms.add(String(perm));
        });
      }
    });
  }

  return Array.from(metaMap.values())
    .filter((meta) => meta.permissionId && perms.has(meta.permissionId))
    .map((meta) => meta.key);
}

function getPermissionColumnTitle(levelIndex: number) {
  if (levelIndex === 0) return '模块';
  if (levelIndex === 1) return '目录/菜单';
  return '菜单';
}

function getRolePermissionCheckedState(
  node?: RolePermissionMatrixNode,
): RolePermissionCheckedState {
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
  const childStates = node.children.map(getRolePermissionCheckedState);
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

function getRolePermissionNodesCheckedState(
  nodes: RolePermissionMatrixNode[],
): RolePermissionCheckedState {
  if (nodes.length === 0) {
    return {
      checked: false,
      indeterminate: false,
    };
  }
  const childStates = nodes.map(getRolePermissionCheckedState);
  const checked = childStates.every((item) => item.checked);
  const hasCheckedChild = childStates.some(
    (item) => item.checked || item.indeterminate,
  );
  return {
    checked,
    indeterminate: hasCheckedChild && !checked,
  };
}

function syncRolePermissionNodeChecked(node: RolePermissionMatrixNode) {
  const state = getRolePermissionCheckedState(node);
  return {
    ...node,
    checked: state.checked,
  };
}

function toRolePermissionMatrixNodes(
  nodes: RoleTreeNode[] | undefined,
  checkedSet: Set<string>,
  inheritedChecked = false,
): RolePermissionMatrixNode[] {
  return (nodes || []).map((node) => {
    const checked = inheritedChecked || checkedSet.has(node.key);
    const children = toRolePermissionMatrixNodes(
      node.children,
      checkedSet,
      checked,
    );
    const nextNode: RolePermissionMatrixNode = {
      key: node.key,
      title: node.title,
      checked,
      children,
    };
    return children.length > 0
      ? syncRolePermissionNodeChecked(nextNode)
      : nextNode;
  });
}

function toRolePermissionScenes(
  treeData: RoleTreeNode[],
  checkedKeys: React.Key[],
): RolePermissionScene[] {
  const checkedSet = new Set(checkedKeys.map((key) => String(key)));
  return (treeData || []).map((scene) => ({
    key: scene.key,
    title: scene.title,
    businesses: (scene.children || []).map((business) => ({
      key: business.key,
      title: business.title,
      modules: toRolePermissionMatrixNodes(business.children, checkedSet),
    })),
  }));
}

function setRolePermissionNodeChecked(
  node: RolePermissionMatrixNode,
  checked: boolean,
): RolePermissionMatrixNode {
  return {
    ...node,
    checked,
    children: node.children.map((child) =>
      setRolePermissionNodeChecked(child, checked),
    ),
  };
}

function updateRolePermissionNodeChecked(
  node: RolePermissionMatrixNode,
  targetKey: string,
  checked: boolean,
): RolePermissionMatrixNode {
  if (node.key === targetKey) {
    return setRolePermissionNodeChecked(node, checked);
  }
  if (node.children.length === 0) return node;
  return syncRolePermissionNodeChecked({
    ...node,
    children: node.children.map((child) =>
      updateRolePermissionNodeChecked(child, targetKey, checked),
    ),
  });
}

function updateRolePermissionScenesChecked(
  scenes: RolePermissionScene[],
  options: {
    sceneKey?: string;
    businessKey?: string;
    moduleKey?: string;
    pageKey?: string;
    permissionKey?: string;
    checked: boolean;
  },
) {
  return scenes.map((scene) => {
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
              return setRolePermissionNodeChecked(moduleItem, options.checked);
            }
            return syncRolePermissionNodeChecked({
              ...moduleItem,
              children: moduleItem.children.map((page) => {
                if (options.pageKey && page.key !== options.pageKey) {
                  return page;
                }
                if (!options.permissionKey) {
                  return setRolePermissionNodeChecked(page, options.checked);
                }
                return updateRolePermissionNodeChecked(
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

function collectCheckedRolePermissionKeys(scenes: RolePermissionScene[]) {
  const result: string[] = [];
  const walk = (nodes: RolePermissionMatrixNode[]) => {
    nodes.forEach((node) => {
      const checkedState = getRolePermissionCheckedState(node);
      if (checkedState.checked || checkedState.indeterminate) {
        result.push(node.key);
      }
      if (node.children.length > 0) {
        walk(node.children);
      }
    });
  };
  scenes.forEach((scene) => {
    scene.businesses.forEach((business) => {
      const checkedState = getRolePermissionNodesCheckedState(business.modules);
      if (checkedState.checked || checkedState.indeterminate) {
        result.push(business.key);
      }
      walk(business.modules);
    });
  });
  return Array.from(new Set(result));
}

function getInitialRolePermissionState(
  scenes?: RolePermissionScene[],
): RolePermissionActiveState {
  const firstScene = scenes?.[0];
  const firstBusiness = firstScene?.businesses[0];
  const firstModule = firstBusiness?.modules[0];
  return {
    sceneKey: firstScene?.key || '',
    businessKey: firstBusiness?.key || '',
    moduleKey: firstModule?.key || '',
    pageKey: firstModule?.children[0]?.key || '',
  };
}

function getActiveRolePermissionTree(
  scenes: RolePermissionScene[],
  activeState: RolePermissionActiveState,
) {
  const scene =
    scenes.find((item) => item.key === activeState.sceneKey) || scenes[0];
  const business =
    scene?.businesses.find((item) => item.key === activeState.businessKey) ||
    scene?.businesses[0];
  return {
    scene,
    business,
    tree: business?.modules || [],
  };
}

function getStableRolePermissionState(
  scenes: RolePermissionScene[],
  currentState: RolePermissionActiveState,
): RolePermissionActiveState {
  const initialState = getInitialRolePermissionState(scenes);
  const scene =
    scenes.find((item) => item.key === currentState.sceneKey) || scenes[0];
  const business =
    scene?.businesses.find((item) => item.key === currentState.businessKey) ||
    scene?.businesses.find((item) => item.key === initialState.businessKey) ||
    scene?.businesses[0];
  const tree = business?.modules || [];
  const moduleItem =
    tree.find((item) => item.key === currentState.moduleKey) ||
    tree.find((item) => item.key === initialState.moduleKey) ||
    tree[0];
  const page =
    moduleItem?.children.find((item) => item.key === currentState.pageKey) ||
    moduleItem?.children.find((item) => item.key === initialState.pageKey) ||
    moduleItem?.children[0];
  return {
    sceneKey: scene?.key || '',
    businessKey: business?.key || '',
    moduleKey: moduleItem?.key || '',
    pageKey: page?.key || '',
  };
}

type RolePermissionMatrixProps = {
  scenes: RolePermissionScene[];
  activeState: RolePermissionActiveState;
  onActiveStateChange: (state: RolePermissionActiveState) => void;
  onCheckedKeysChange: (keys: string[]) => void;
};

const RolePermissionMatrix: React.FC<RolePermissionMatrixProps> = ({
  scenes,
  activeState,
  onActiveStateChange,
  onCheckedKeysChange,
}) => {
  const [activeNestedKeys, setActiveNestedKeys] = useState<
    Record<number, string>
  >({});
  const activePermission = getActiveRolePermissionTree(scenes, activeState);
  const displayPermissionTree = activePermission.tree;
  const activeModule =
    displayPermissionTree.find((item) => item.key === activeState.moduleKey) ||
    displayPermissionTree[0];
  const activePage =
    activeModule?.children.find((item) => item.key === activeState.pageKey) ||
    activeModule?.children[0];
  const nestedColumns: {
    key: string;
    title: string;
    items: RolePermissionMatrixNode[];
    activeKey: string;
    levelIndex: number;
  }[] = [];
  let activePermissionParent = activePage;
  let activePermissionItems: RolePermissionMatrixNode[] = [];
  let levelIndex = 2;

  while (activePermissionParent?.children.length) {
    const items = activePermissionParent.children;
    const navigationItems = items.filter((item) => item.children.length > 0);
    const actionItems = items.filter((item) => item.children.length === 0);
    const hasNextLevel = navigationItems.some(
      (item) => item.children.length > 0,
    );

    if (navigationItems.length === 0) {
      activePermissionItems = actionItems.length > 0 ? actionItems : items;
      break;
    }

    if (levelIndex >= 3 && !hasNextLevel && actionItems.length === 0) {
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

  useEffect(() => {
    setActiveNestedKeys({});
  }, [
    activeState.businessKey,
    activeState.moduleKey,
    activeState.pageKey,
    activeState.sceneKey,
  ]);

  const updateChecked = (options: {
    businessKey?: string;
    moduleKey?: string;
    pageKey?: string;
    permissionKey?: string;
    checked: boolean;
  }) => {
    const { businessKey, ...restOptions } = options;
    const nextScenes = updateRolePermissionScenesChecked(scenes, {
      sceneKey: activePermission.scene?.key,
      businessKey: businessKey ?? activePermission.business?.key,
      ...restOptions,
    });
    onCheckedKeysChange(collectCheckedRolePermissionKeys(nextScenes));
  };

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

  if (scenes.length === 0) {
    return (
      <div className="role-permission-matrix-empty">
        <Empty description="暂无权限数据" />
      </div>
    );
  }

  return (
    <>
      <div className="role-permission-matrix-scenes">
        {scenes.map((scene) => (
          <button
            key={scene.key}
            type="button"
            className={
              scene.key === activePermission.scene?.key ? 'is-active' : ''
            }
            onClick={() => {
              const firstBusiness = scene.businesses[0];
              const firstModule = firstBusiness?.modules[0];
              onActiveStateChange({
                sceneKey: scene.key,
                businessKey: firstBusiness?.key || '',
                moduleKey: firstModule?.key || '',
                pageKey: firstModule?.children[0]?.key || '',
              });
            }}
          >
            {scene.title}
          </button>
        ))}
      </div>
      <div className="role-permission-matrix-panel">
        {(activePermission.scene?.businesses.length || 0) > 0 ? (
          <div className="role-permission-matrix-tags">
            {activePermission.scene?.businesses.map((business) => {
              const businessCheckedState = getRolePermissionNodesCheckedState(
                business.modules,
              );
              const activateBusiness = () => {
                const firstModule = business.modules[0];
                onActiveStateChange({
                  sceneKey: activePermission.scene?.key || '',
                  businessKey: business.key,
                  moduleKey: firstModule?.key || '',
                  pageKey: firstModule?.children[0]?.key || '',
                });
              };
              return (
                <Tag
                  key={business.key}
                  className={
                    business.key === activePermission.business?.key
                      ? 'is-active'
                      : ''
                  }
                  onClick={activateBusiness}
                >
                  <Checkbox
                    aria-label={business.title}
                    checked={businessCheckedState.checked}
                    indeterminate={businessCheckedState.indeterminate}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      activateBusiness();
                      updateChecked({
                        businessKey: business.key,
                        checked: event.target.checked,
                      });
                    }}
                  />
                  <span className="role-permission-matrix-tag-text">
                    {business.title}
                  </span>
                </Tag>
              );
            })}
          </div>
        ) : null}
        {displayPermissionTree.length === 0 ? (
          <div className="role-permission-matrix-empty is-panel-empty">
            <Empty description="暂无权限数据" />
          </div>
        ) : (
          <div className="role-permission-matrix">
            <div className="role-permission-matrix-column">
              <div className="role-permission-matrix-column-title">模块</div>
              <div className="role-permission-matrix-column-body">
                {displayPermissionTree.map((moduleItem) => {
                  const checkedState =
                    getRolePermissionCheckedState(moduleItem);
                  return (
                    <button
                      key={moduleItem.key}
                      type="button"
                      className={
                        moduleItem.key === activeModule?.key ? 'is-active' : ''
                      }
                      onClick={() =>
                        onActiveStateChange({
                          sceneKey: activePermission.scene?.key || '',
                          businessKey: activePermission.business?.key || '',
                          moduleKey: moduleItem.key,
                          pageKey: moduleItem.children[0]?.key || '',
                        })
                      }
                    >
                      <Checkbox
                        checked={checkedState.checked}
                        indeterminate={checkedState.indeterminate}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          updateChecked({
                            moduleKey: moduleItem.key,
                            checked: event.target.checked,
                          })
                        }
                      />
                      <span>{moduleItem.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="role-permission-matrix-column is-page">
              <div className="role-permission-matrix-column-title">
                目录/菜单
              </div>
              <div className="role-permission-matrix-column-body">
                {activeModule?.children.map((page) => {
                  const checkedState = getRolePermissionCheckedState(page);
                  return (
                    <button
                      key={page.key}
                      type="button"
                      className={
                        page.key === activePage?.key ? 'is-active' : ''
                      }
                      onClick={() =>
                        onActiveStateChange({
                          ...activeState,
                          pageKey: page.key,
                        })
                      }
                    >
                      <Checkbox
                        checked={checkedState.checked}
                        indeterminate={checkedState.indeterminate}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          updateChecked({
                            moduleKey: activeModule.key,
                            pageKey: page.key,
                            checked: event.target.checked,
                          })
                        }
                      />
                      <span>{page.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {nestedColumns.map((column) => (
              <div key={column.key} className="role-permission-matrix-column">
                <div className="role-permission-matrix-column-title">
                  {column.title}
                </div>
                <div className="role-permission-matrix-column-body">
                  {column.items.map((permission) => {
                    const checkedState =
                      getRolePermissionCheckedState(permission);
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
                        <span>{permission.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="role-permission-matrix-column is-actions">
              <div className="role-permission-matrix-column-title">权限</div>
              <div className="role-permission-matrix-action-list">
                {activePermissionItems.map((permission) => (
                  <div
                    key={permission.key}
                    className="role-permission-action-item"
                  >
                    <Checkbox
                      aria-label={permission.title}
                      checked={permission.checked}
                      onChange={(event) =>
                        updateChecked({
                          moduleKey: activeModule?.key,
                          pageKey: activePage?.key,
                          permissionKey: permission.key,
                          checked: event.target.checked,
                        })
                      }
                    />
                    <span>{permission.title}</span>
                  </div>
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
        )}
      </div>
    </>
  );
};

const RolePermissionPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [permTreeLoading, setPermTreeLoading] = useState(false);
  const [permTreeData, setPermTreeData] = useState<RoleTreeNode[]>([]);
  const [permissionMetaMap, setPermissionMetaMap] = useState<
    Map<string, RolePermissionMeta>
  >(new Map());
  const [checkedPermIds, setCheckedPermIds] = useState<React.Key[]>([]);
  const [switchLoadingId, setSwitchLoadingId] = useState<string>();
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [form] = Form.useForm<CreateRoleFormValues>();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });
  const [serverTotal, setServerTotal] = useState(0);

  const currentOrgCode = initialState?.currentOrgCode;
  const current = pagination.current || 1;
  const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;
  const currentRoleType = Form.useWatch('roleType', form);
  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;
  const rolePermissionScenes = useMemo(
    () => toRolePermissionScenes(permTreeData, checkedPermIds),
    [checkedPermIds, permTreeData],
  );
  const [activePermissionState, setActivePermissionState] =
    useState<RolePermissionActiveState>(() => getInitialRolePermissionState());

  useEffect(() => {
    setActivePermissionState((currentState) =>
      getStableRolePermissionState(rolePermissionScenes, currentState),
    );
  }, [rolePermissionScenes]);

  const loadRoles = useCallback(async () => {
    if (!currentOrgCode) {
      setRoles([]);
      setServerTotal(0);
      setListError(undefined);
      return;
    }

    setLoading(true);
    setListError(undefined);
    try {
      const searchValue = searchKeyword.trim();
      if (searchMode && searchValue) {
        const list = await searchRole(currentOrgCode, searchValue, {
          skipErrorHandler: true,
        });
        setRoles(Array.isArray(list) ? list : []);
        setServerTotal(Array.isArray(list) ? list.length : 0);
        return;
      }

      const pageRes = await getRolePageList(
        {
          current,
          pageSize,
          roleName: searchValue || undefined,
        } as RolePageListParams,
        {
          skipErrorHandler: true,
        },
      );
      setRoles(Array.isArray(pageRes?.records) ? pageRes.records : []);
      setServerTotal(Number(pageRes?.total || 0));
    } catch (error) {
      console.error('load roles failed:', error);
      const nextError = getErrorMessage(error, '获取角色列表失败，请稍后重试');
      setListError(nextError);
      message.error(nextError);
      return;
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [current, currentOrgCode, pageSize, searchKeyword, searchMode]);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      await loadRoles();
      if (disposed) return;
    })();

    return () => {
      disposed = true;
    };
  }, [loadRoles]);

  const handleToggleRoleState = useCallback(
    async (record: RoleItem, checked: boolean) => {
      if (record?.isChangeable === false) {
        message.warning('该角色不支持修改状态');
        return;
      }
      if (!record?.id) {
        message.warning('缺少角色ID，无法更新状态');
        return;
      }

      const nextState = checked ? 1 : 0;
      setSwitchLoadingId(String(record.id));
      try {
        const res = await updateRoleState(
          {
            id: String(record.id),
            state: nextState,
          },
          {
            skipErrorHandler: true,
          },
        );
        setRoles((prev) =>
          prev.map((item) =>
            String(item.id) === String(record.id)
              ? {
                  ...item,
                  state: nextState,
                }
              : item,
          ),
        );
        message.success(
          getApiMessage(res, nextState === 1 ? '启用成功' : '禁用成功'),
        );
      } catch (error) {
        console.error('updateRoleState failed:', error);
        message.error(
          getErrorMessage(
            error,
            nextState === 1 ? '启用角色失败' : '禁用角色失败',
          ),
        );
      } finally {
        setSwitchLoadingId(undefined);
      }
    },
    [],
  );

  const columns = useMemo<ColumnsType<RoleItem>>(
    () => [
      {
        title: '角色名称',
        dataIndex: 'roleName',
        ellipsis: true,
      },
      {
        title: '状态',
        dataIndex: 'state',
        width: 120,
        render: (_, record) => (
          <Switch
            checked={Number(record.state) === 1}
            disabled={record.isChangeable === false}
            loading={switchLoadingId === String(record.id)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            onChange={(checked) => {
              void handleToggleRoleState(record, checked);
            }}
          />
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        ellipsis: true,
      },
      {
        title: '操作',
        key: 'action',
        width: 140,
        render: (_, record) => {
          const actionDisabled = record.isChangeable === false;

          return (
            <div className="role-permission-action-links">
              {actionDisabled ? (
                <span className="is-disabled">编辑</span>
              ) : (
                <a
                  onClick={() => {
                    void handleOpenEdit(record);
                  }}
                >
                  编辑
                </a>
              )}
              {actionDisabled ? (
                <span className="is-disabled is-danger-disabled">删除</span>
              ) : (
                <Popconfirm
                  title="确认删除该角色？"
                  onConfirm={() => {
                    void handleDeleteRole(record);
                  }}
                >
                  <a className="is-danger">删除</a>
                </Popconfirm>
              )}
            </div>
          );
        },
      },
    ],
    [handleToggleRoleState, switchLoadingId],
  );

  const pagedRoles = searchMode
    ? roles.slice((current - 1) * pageSize, current * pageSize)
    : roles;

  const handleSearch = () => {
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
    setSearchKeyword(keyword.trim());
    setSearchMode(true);
  };

  const handleResetSearch = () => {
    setKeyword('');
    setSearchKeyword('');
    setSearchMode(false);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleOpenCreate = async () => {
    if (!currentOrgCode) {
      message.warning('暂无机构编码，无法新增角色');
      return;
    }

    setEditingRole(null);
    setCreateOpen(true);
    form.setFieldsValue({
      roleName: '',
      roleType: 2,
      state: 1,
    });
    setCheckedPermIds([]);
    setPermissionMetaMap(new Map());
    setPermTreeLoading(true);
    try {
      const res = await getOrgMenuTree(currentOrgCode, {
        skipErrorHandler: true,
      });
      const { treeData, permissionMetaMap: nextMetaMap } = toOrgRoleTreeData(
        extractOrgRoleTreeNodes(res),
      );
      setPermTreeData(treeData);
      setPermissionMetaMap(nextMetaMap);
    } catch (error) {
      console.error('getOrgMenuTree failed:', error);
      setPermTreeData([]);
      setPermissionMetaMap(new Map());
      message.error(getErrorMessage(error, '获取权限树失败'));
    } finally {
      setPermTreeLoading(false);
    }
  };

  const handleOpenEdit = async (record: RoleItem) => {
    if (record?.isChangeable === false) {
      message.warning('该角色不支持编辑');
      return;
    }
    if (!currentOrgCode) {
      message.warning('暂无机构编码，无法编辑角色');
      return;
    }
    if (!record?.id) {
      message.warning('缺少角色ID，无法编辑');
      return;
    }

    setCreateLoading(true);
    setCreateOpen(true);
    setPermTreeLoading(true);
    try {
      const [detailRes, treeRes] = await Promise.all([
        getRoleDetail(String(record.id), {
          skipErrorHandler: true,
        }),
        getOrgMenuTree(currentOrgCode, {
          skipErrorHandler: true,
        }),
      ]);
      const detail = detailRes?.data ?? detailRes;
      setEditingRole({
        ...record,
        ...detail,
      });
      form.setFieldsValue({
        roleName: detail?.roleName || '',
        roleType: Number(detail?.roleType ?? 2),
        state: Number(detail?.state ?? 1),
      });
      const { treeData, permissionMetaMap: nextMetaMap } = toOrgRoleTreeData(
        extractOrgRoleTreeNodes(treeRes),
      );
      setPermTreeData(treeData);
      setPermissionMetaMap(nextMetaMap);
      setCheckedPermIds(extractCheckedPermissionKeys(detail, nextMetaMap));
    } catch (error) {
      console.error('open edit role failed:', error);
      setPermTreeData([]);
      setPermissionMetaMap(new Map());
      setCreateOpen(false);
      setEditingRole(null);
      message.error(getErrorMessage(error, '打开编辑角色失败'));
    } finally {
      setPermTreeLoading(false);
      setCreateLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const values = await form.validateFields();
      setCreateLoading(true);
      const roleTerminalList =
        Number(values.roleType) === 2
          ? buildRoleTerminalList(checkedPermIds, permissionMetaMap)
          : [];
      const res = editingRole?.id
        ? await editRole(
            {
              id: editingRole.id,
              roleName: values.roleName,
              roleType: values.roleType,
              state: values.state,
              roleTerminalList,
            },
            {
              skipErrorHandler: true,
            },
          )
        : await saveRole(
            {
              roleName: values.roleName,
              roleType: values.roleType,
              state: values.state,
              roleTerminalList,
            },
            {
              skipErrorHandler: true,
            },
          );
      message.success(
        getApiMessage(res, editingRole?.id ? '编辑角色成功' : '新增角色成功'),
      );
      setCreateOpen(false);
      setEditingRole(null);
      await loadRoles();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('saveRole failed:', error);
      message.error(
        getErrorMessage(
          error,
          editingRole?.id ? '编辑角色失败' : '新增角色失败',
        ),
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteRole = async (record: RoleItem) => {
    if (record?.isChangeable === false) {
      message.warning('该角色不支持删除');
      return;
    }
    if (!record?.id) {
      message.warning('缺少角色ID，无法删除');
      return;
    }

    try {
      const res = await deleteRole(String(record.id), {
        skipErrorHandler: true,
      });
      message.success(getApiMessage(res, '删除角色成功'));
      await loadRoles();
    } catch (error) {
      console.error('deleteRole failed:', error);
      message.error(getErrorMessage(error, '删除角色失败'));
    }
  };

  return (
    <div className="role-permission-page">
      <div className="role-permission-info-banner">
        <InfoCircleFilled className="role-permission-info-icon" />
        <span>
          新增角色后，请按实际业务勾选对应菜单权限，保存成功后该角色即可在当前机构下生效。
        </span>
      </div>

      <div className="role-permission-content-card">
        <div className="role-permission-section-title">角色列表</div>
        <div className="role-permission-toolbar">
          <div className="role-permission-toolbar-left">
            <span className="field-label">角色名称</span>
            <Input
              value={keyword}
              allowClear
              placeholder="请输入角色名称"
              className="role-permission-search-input"
              onChange={(event) => {
                setKeyword(event.target.value);
              }}
              onPressEnter={handleSearch}
            />
            <Button onClick={handleSearch}>搜索</Button>
            <Button onClick={handleResetSearch}>重置</Button>
          </div>

          <Button
            type="primary"
            className="role-permission-create-btn"
            onClick={handleOpenCreate}
          >
            新增角色
          </Button>
        </div>

        {initialListLoading ? (
          <PageSectionSkeleton rows={7} />
        ) : listError && roles.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<RoleItem>
            rowKey="id"
            loading={refreshingList}
            columns={columns}
            dataSource={pagedRoles}
            locale={{
              emptyText: currentOrgCode ? (
                <Empty description="暂无角色数据" />
              ) : (
                '暂无机构编码'
              ),
            }}
            pagination={{
              ...pagination,
              total: searchMode ? roles.length : serverTotal,
              onChange: (nextCurrent, nextPageSize) => {
                setPagination((prev) => ({
                  ...prev,
                  current: nextCurrent,
                  pageSize: nextPageSize,
                }));
              },
            }}
          />
        )}
      </div>

      <Modal
        title={editingRole?.id ? '编辑角色' : '新增角色'}
        open={createOpen}
        width={1100}
        confirmLoading={createLoading}
        destroyOnClose
        onCancel={() => {
          setCreateOpen(false);
          setEditingRole(null);
          setPermissionMetaMap(new Map());
        }}
        onOk={handleCreateRole}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            roleType: 2,
            state: 1,
          }}
        >
          <div className="role-create-form-grid">
            <Form.Item
              label="角色名称"
              name="roleName"
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input placeholder="请输入角色名称" maxLength={30} />
            </Form.Item>
            <Form.Item
              label="角色类型"
              name="roleType"
              rules={[{ required: true, message: '请选择角色类型' }]}
            >
              <Select
                options={[
                  { label: '管理员角色', value: 1 },
                  { label: '普通角色', value: 2 },
                ]}
              />
            </Form.Item>
          </div>

          <div className="role-create-form-grid">
            <Form.Item
              label="状态"
              name="state"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select
                options={[
                  { label: '启用', value: 1 },
                  { label: '禁用', value: 0 },
                ]}
              />
            </Form.Item>
          </div>

          {Number(currentRoleType) === 2 && (
            <Form.Item
              label="权限配置"
              className="role-permission-matrix-form-item"
            >
              <div className="role-permission-matrix-wrap">
                <Spin spinning={permTreeLoading}>
                  <RolePermissionMatrix
                    scenes={rolePermissionScenes}
                    activeState={activePermissionState}
                    onActiveStateChange={setActivePermissionState}
                    onCheckedKeysChange={setCheckedPermIds}
                  />
                </Spin>
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default RolePermissionPage;
