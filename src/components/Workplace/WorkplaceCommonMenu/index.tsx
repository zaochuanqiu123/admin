import { CloseOutlined, SendOutlined } from '@ant-design/icons';
import type { UniqueIdentifier } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useModel } from '@umijs/max';
import { Button, Drawer, Input, message, Space, Typography, theme } from 'antd';
import React, { useEffect } from 'react';
import {
  getOrgUserFavoriteMenuList,
  saveOrgUserFavoriteMenu,
} from '@/api/orgUser';
import aijiqiren from '@/assets/aijiqiren.png';
import shendusousuo from '@/assets/shendusousuo.png';
import {
  COMMON_ACTION_MAX,
  type CommonAction,
  type CommonGroup,
  filterHomepageCommonActions,
  isHomepageCommonAction,
} from '@/config/menu.config';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import {
  readGroupOrderFromStorage,
  writeGroupOrderToStorage,
} from '@/utils/commonActions.storage';
import { renderMenuIcon } from '@/utils/menuIcon';
import CandidateRow from './CandidateRow';
import CommonChip from './CommonChip';
import GroupRow from './GroupRow';
import SubGroupRow from './SubGroupRow';

const OPEN_COMMON_ACTIONS_DRAWER_EVENT = 'pc-admin-open-common-actions-drawer';

function getMenuNodeChildren(node: any): any[] {
  return Array.isArray(node?.children) ? node.children : [];
}

function getMenuNodeTitle(node: any, fallback: string) {
  const rawTitle = node?.name ?? node?.title ?? node?.label;
  const title =
    typeof rawTitle === 'string' || typeof rawTitle === 'number'
      ? String(rawTitle).trim()
      : '';
  return title || fallback;
}

function getMenuNodePath(node: any, inheritedPath?: string) {
  const path = typeof node?.path === 'string' ? node.path.trim() : '';
  return path || inheritedPath || '';
}

function getMenuNodeTargetId(node: any) {
  const rawTargetId = node?.targetId;
  if (rawTargetId === undefined || rawTargetId === null) return undefined;
  const targetId = String(rawTargetId).trim();
  return targetId || undefined;
}

function getMenuNodeSourceSystem(node: any) {
  const sourceSystem = Number(node?.sourceSystem);
  return Number.isFinite(sourceSystem) ? sourceSystem : undefined;
}

function getMenuNodeFavoriteMenuId(node: any) {
  const rawFavoriteMenuId =
    node?.favoriteMenuId ??
    node?.menuId ??
    node?.permId ??
    node?.id ??
    node?.targetId ??
    node?.key;
  if (rawFavoriteMenuId === undefined || rawFavoriteMenuId === null) {
    return undefined;
  }
  const favoriteMenuId = String(rawFavoriteMenuId).trim();
  return favoriteMenuId || undefined;
}

function normalizeMergeKey(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}

function normalizeCommonId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_/-]/g, '_');
}

function buildActionId(
  node: any,
  path: string,
  title: string,
  fallback: string,
) {
  const targetId = getMenuNodeTargetId(node);
  const rawId =
    node?.favoriteMenuId ??
    node?.key ??
    node?.id ??
    node?.menuId ??
    node?.permId ??
    targetId ??
    path ??
    title ??
    fallback;
  return normalizeCommonId(
    [path, targetId, rawId, title, fallback]
      .filter((item) => item !== undefined && item !== null && item !== '')
      .map((item) => String(item))
      .join('__') || fallback,
  );
}

function collectMenuActions(
  node: any,
  fallbackPrefix: string,
  inheritedPath?: string,
): CommonAction[] {
  const children = getMenuNodeChildren(node);
  const path = getMenuNodePath(node, inheritedPath);
  const title = getMenuNodeTitle(node, fallbackPrefix);

  if (children.length === 0) {
    if (!path) return [];
    const action = {
      id: buildActionId(node, path, title, fallbackPrefix),
      title,
      path,
      targetId: getMenuNodeTargetId(node),
      sourceSystem: getMenuNodeSourceSystem(node),
      favoriteMenuId: getMenuNodeFavoriteMenuId(node),
    };
    return isHomepageCommonAction(action) ? [] : [action];
  }

  return children.flatMap((child, index) =>
    collectMenuActions(child, `${fallbackPrefix}-${index}`, path),
  );
}

function dedupeActions(actions: CommonAction[]) {
  const seen = new Set<string>();
  return filterHomepageCommonActions(actions).filter((item) => {
    const key = [
      item.title,
      item.sourceSystem ?? '',
      item.targetId ?? '',
      item.path,
    ].join('::');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeMenuNodesByTitle(nodes: any[], fallbackPrefix: string): any[] {
  const mergedMap = new Map<string, any>();
  const result: any[] = [];

  nodes.forEach((node, index) => {
    const title = getMenuNodeTitle(node, `${fallbackPrefix}-${index}`);
    const children = getMenuNodeChildren(node);
    const key = normalizeMergeKey(title) || `${fallbackPrefix}-${index}`;
    const existing = mergedMap.get(key);
    const normalizedNode = {
      ...node,
      name: title,
      children: mergeMenuNodesByTitle(children, `${fallbackPrefix}-${key}`),
    };

    if (!existing) {
      mergedMap.set(key, normalizedNode);
      result.push(normalizedNode);
      return;
    }

    const mergedChildren = mergeMenuNodesByTitle(
      [...getMenuNodeChildren(existing), ...children],
      `${fallbackPrefix}-${key}`,
    );
    const mergedNode = {
      ...existing,
      children: mergedChildren,
    };
    mergedMap.set(key, mergedNode);
    const existingIndex = result.indexOf(existing);
    if (existingIndex >= 0) {
      result[existingIndex] = mergedNode;
    }
  });

  return result;
}

function mergeCommonSubGroups(subGroups: CommonGroup['children']) {
  const mergedMap = new Map<string, CommonGroup['children'][number]>();
  subGroups.forEach((subGroup) => {
    const key = normalizeMergeKey(subGroup.title) || subGroup.id;
    const existing = mergedMap.get(key);
    if (!existing) {
      mergedMap.set(key, {
        ...subGroup,
        children: dedupeActions(subGroup.children),
      });
      return;
    }
    mergedMap.set(key, {
      ...existing,
      children: dedupeActions([...existing.children, ...subGroup.children]),
    });
  });
  return Array.from(mergedMap.values()).filter(
    (item) => item.children.length > 0,
  );
}

function mergeCommonGroups(groups: CommonGroup[]) {
  const mergedMap = new Map<string, CommonGroup>();
  groups.forEach((group) => {
    const key = normalizeMergeKey(group.title) || group.id;
    const existing = mergedMap.get(key);
    if (!existing) {
      mergedMap.set(key, {
        ...group,
        children: mergeCommonSubGroups(group.children),
      });
      return;
    }
    mergedMap.set(key, {
      ...existing,
      children: mergeCommonSubGroups([...existing.children, ...group.children]),
    });
  });
  return Array.from(mergedMap.values()).filter(
    (group) => group.children.length > 0,
  );
}

function buildCommonGroupsFromMenuData(menuData?: any[]): CommonGroup[] {
  if (!Array.isArray(menuData) || menuData.length === 0) return [];

  const groups = mergeMenuNodesByTitle(menuData, 'root')
    .map((groupNode, groupIndex) => {
      const groupTitle = getMenuNodeTitle(groupNode, `菜单${groupIndex + 1}`);
      const groupId = buildActionId(
        groupNode,
        getMenuNodePath(groupNode),
        groupTitle,
        `group-${groupIndex}`,
      );
      const childNodes = getMenuNodeChildren(groupNode);
      const subGroups =
        childNodes.length > 0
          ? childNodes.map((subNode, subIndex) => {
              const subTitle = getMenuNodeTitle(
                subNode,
                `${groupTitle}${subIndex + 1}`,
              );
              const subId = buildActionId(
                subNode,
                getMenuNodePath(subNode, getMenuNodePath(groupNode)),
                subTitle,
                `${groupId}-${subIndex}`,
              );
              return {
                id: subId,
                title: subTitle,
                children: dedupeActions(
                  collectMenuActions(
                    subNode,
                    `${groupId}-${subIndex}`,
                    getMenuNodePath(groupNode),
                  ),
                ),
              };
            })
          : [
              {
                id: `${groupId}-all`,
                title: '全部',
                children: dedupeActions(
                  collectMenuActions(groupNode, `${groupId}-all`),
                ),
              },
            ];

      return {
        id: groupId,
        title: groupTitle,
        icon: renderMenuIcon(groupNode.icon),
        children: subGroups.filter((item) => item.children.length > 0),
      };
    })
    .filter((group) => group.children.length > 0);
  return mergeCommonGroups(groups);
}

function getActionFavoriteMenuId(action: CommonAction) {
  const favoriteMenuId = String(
    action.favoriteMenuId || action.id || '',
  ).trim();
  return favoriteMenuId || '';
}

function collectCommonGroupActions(groups: CommonGroup[]) {
  return groups.flatMap((group) =>
    group.children.flatMap((subGroup) => subGroup.children),
  );
}

function normalizeFavoriteMenuIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => {
      const raw =
        typeof item === 'string' || typeof item === 'number'
          ? item
          : (item?.favoriteMenuId ??
            item?.menuId ??
            item?.permId ??
            item?.id ??
            item?.targetId ??
            item?.key);
      return String(raw ?? '').trim();
    })
    .filter(Boolean);
}

function pickFavoriteActionsByIds(
  favoriteMenuIds: string[],
  availableActions: CommonAction[],
) {
  const actionMap = new Map<string, CommonAction>();
  availableActions.forEach((action) => {
    const favoriteMenuId = getActionFavoriteMenuId(action);
    if (favoriteMenuId && !actionMap.has(favoriteMenuId)) {
      actionMap.set(favoriteMenuId, action);
    }
    if (!actionMap.has(action.id)) {
      actionMap.set(action.id, action);
    }
  });

  const seen = new Set<string>();
  return favoriteMenuIds
    .map((favoriteMenuId) => actionMap.get(favoriteMenuId))
    .filter((action): action is CommonAction => Boolean(action))
    .filter((action) => {
      const key = getActionFavoriteMenuId(action) || action.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const WorkplaceCommonMenu: React.FC<{
  storageKey: string;
  commonActions: CommonAction[];
  setCommonActions: (actions: CommonAction[]) => void;
}> = ({ storageKey, commonActions, setCommonActions }) => {
  const { initialState } = useModel('@@initialState');
  const { token } = theme.useToken();
  const [open, setOpen] = React.useState(false);
  const [draftList, setDraftList] = React.useState<CommonAction[]>(
    filterHomepageCommonActions(commonActions),
  );
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [savedGroupOrder, setSavedGroupOrder] = React.useState<string[]>([]);
  const [draftGroupOrder, setDraftGroupOrder] = React.useState<string[]>([]);
  const [activeGroupId, setActiveGroupId] = React.useState<string>('');
  const [activeSubGroupId, setActiveSubGroupId] = React.useState<string>('');
  const [assistantQuestion, setAssistantQuestion] = React.useState('');
  const [favoriteSaving, setFavoriteSaving] = React.useState(false);
  const favoriteLoadKeyRef = React.useRef('');
  const setCommonActionsRef = React.useRef(setCommonActions);
  const isDarkMode = (initialState?.settings as any)?.navTheme === 'realDark';
  const drawerSurfaceBg = isDarkMode ? token.colorBgLayout : '#E7EDFB';
  const drawerPanelBg = isDarkMode ? token.colorBgContainer : '#FFFFFF';
  const drawerNestedPanelBg = isDarkMode ? token.colorBgElevated : '#E7EDFB';
  const drawerBorderColor = isDarkMode ? token.colorBorderSecondary : '#D6DEEA';
  const drawerTextPrimary = token.colorText;
  const drawerTextSecondary = token.colorTextSecondary;
  const drawerTextTertiary = token.colorTextDescription;
  const drawerOverlayBg = token.colorFillTertiary;
  const drawerOverlayIconBg = token.colorFillSecondary;
  const drawerOverlayShadow = token.boxShadowSecondary;
  const commonGroups = React.useMemo(() => {
    return buildCommonGroupsFromMenuData(
      (initialState as any)?.permContextMenu,
    );
  }, [(initialState as any)?.permContextMenu]);
  const commonGroupIds = React.useMemo(
    () => commonGroups.map((group) => group.id),
    [commonGroups],
  );
  const availableFavoriteActions = React.useMemo(
    () => collectCommonGroupActions(commonGroups),
    [commonGroups],
  );
  const favoriteActionSignature = React.useMemo(
    () =>
      availableFavoriteActions
        .map((action) => getActionFavoriteMenuId(action) || action.id)
        .join('|'),
    [availableFavoriteActions],
  );

  useEffect(() => {
    setCommonActionsRef.current = setCommonActions;
  }, [setCommonActions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDraftList(filterHomepageCommonActions(commonActions));

    const defaultOrder = commonGroupIds;
    const groupOrder = readGroupOrderFromStorage(storageKey, defaultOrder);
    setSavedGroupOrder(groupOrder);
    setDraftGroupOrder(groupOrder);
  }, [storageKey, commonActions, commonGroupIds]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const loadKey = `${storageKey}:${favoriteActionSignature}`;
    if (favoriteLoadKeyRef.current === loadKey) return;
    favoriteLoadKeyRef.current = loadKey;
    if (availableFavoriteActions.length === 0) {
      setCommonActionsRef.current([]);
      return;
    }

    let ignore = false;
    const loadFavoriteMenu = async () => {
      try {
        const res = await getOrgUserFavoriteMenuList({
          skipErrorHandler: true,
        });
        if (ignore) return;
        const favoriteActions = pickFavoriteActionsByIds(
          normalizeFavoriteMenuIds(res),
          availableFavoriteActions,
        );
        setCommonActionsRef.current(
          filterHomepageCommonActions(favoriteActions).map((item) => ({
            ...item,
          })),
        );
      } catch (error) {
        console.warn('load favorite menu failed:', error);
        if (!ignore) {
          setCommonActionsRef.current([]);
          message.error(getErrorMessage(error, '查询快捷导航失败'));
        }
      }
    };

    void loadFavoriteMenu();

    return () => {
      ignore = true;
    };
  }, [availableFavoriteActions, favoriteActionSignature, storageKey]);

  useEffect(() => {
    if (commonGroups.length === 0) return;
    setActiveGroupId((prev) =>
      commonGroups.some((group) => group.id === prev)
        ? prev
        : commonGroups[0]?.id || '',
    );
  }, [commonGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const drawerBodyRef = React.useRef<HTMLDivElement | null>(null);
  const restrictToDrawer = React.useMemo(() => {
    return ({ transform, activeNodeRect }: any) => {
      const el = drawerBodyRef.current;
      if (!el || !activeNodeRect) return transform;
      const rect = el.getBoundingClientRect();

      const left = activeNodeRect.left + transform.x;
      const right = activeNodeRect.right + transform.x;
      const top = activeNodeRect.top + transform.y;
      const bottom = activeNodeRect.bottom + transform.y;

      let x = transform.x;
      let y = transform.y;

      if (left < rect.left) x += rect.left - left;
      if (right > rect.right) x -= right - rect.right;
      if (top < rect.top) y += rect.top - top;
      if (bottom > rect.bottom) y -= bottom - rect.bottom;

      return { ...transform, x, y };
    };
  }, []);

  const openDrawer = React.useCallback(() => {
    setDraftList(
      filterHomepageCommonActions(commonActions).map((x) => ({ ...x })),
    );
    setDraftGroupOrder(savedGroupOrder.map((x) => x));
    setOpen(true);
  }, [commonActions, savedGroupOrder]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOpenDrawer = () => {
      openDrawer();
    };
    window.addEventListener(OPEN_COMMON_ACTIONS_DRAWER_EVENT, handleOpenDrawer);
    return () => {
      window.removeEventListener(
        OPEN_COMMON_ACTIONS_DRAWER_EVENT,
        handleOpenDrawer,
      );
    };
  }, [openDrawer]);

  const restoreDefault = () => {
    setDraftList(
      filterHomepageCommonActions(commonActions).map((x) => ({ ...x })),
    );
  };

  const cancelEdit = () => {
    setOpen(false);
    setDraftList(
      filterHomepageCommonActions(commonActions).map((x) => ({ ...x })),
    );
    setDraftGroupOrder(savedGroupOrder.map((x) => x));
  };

  const confirmEdit = async () => {
    const nextCommonActions = filterHomepageCommonActions(draftList).map(
      (x) => ({ ...x }),
    );
    const favoriteMenuIds = nextCommonActions
      .map(getActionFavoriteMenuId)
      .filter(Boolean);

    setFavoriteSaving(true);
    try {
      const res = await saveOrgUserFavoriteMenu(favoriteMenuIds, {
        skipErrorHandler: true,
      });
      message.success(getApiMessage(res, '保存成功'));
      setCommonActions(nextCommonActions);
      setSavedGroupOrder(draftGroupOrder.map((x) => x));
      writeGroupOrderToStorage(storageKey, draftGroupOrder);
      setOpen(false);
    } catch (error) {
      message.error(getErrorMessage(error, '保存快捷导航失败'));
    } finally {
      setFavoriteSaving(false);
    }
  };

  const removeFromDraft = (id: string) => {
    setDraftList((prev) => prev.filter((x) => x.id !== id));
  };

  const addToDraft = (item: CommonAction) => {
    if (isHomepageCommonAction(item)) return;
    setDraftList((prev) => {
      if (prev.some((x) => x.id === item.id)) return prev;
      if (prev.length >= COMMON_ACTION_MAX) {
        message.warning(`最多可添加 ${COMMON_ACTION_MAX} 个常用入口`);
        return prev;
      }
      return [...prev, item];
    });
  };

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeStr = String(active.id);
    const overStr = String(over.id);

    // 1. 处理左侧 Level 1 菜单排序
    if (activeStr.startsWith('group:') && overStr.startsWith('group:')) {
      const from = activeStr.replace('group:', '');
      const to = overStr.replace('group:', '');
      setDraftGroupOrder((prev) => {
        const oldIndex = prev.indexOf(from);
        const newIndex = prev.indexOf(to);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    // 2. 处理顶部已选 Chips 排序
    if (active.id !== over.id && overStr !== 'selected') {
      // 确保是在 Top Area 内部拖拽
      const oldIndex = draftList.findIndex((x) => x.id === active.id);
      const newIndex = draftList.findIndex((x) => x.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        setDraftList((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  const draftIds = draftList.map((x) => x.id);
  const { setNodeRef: setSelectedDroppableRef } = useDroppable({
    id: 'selected' as UniqueIdentifier,
  });

  const orderedGroups = React.useMemo(() => {
    const map = new Map(commonGroups.map((g) => [g.id, g] as const));
    return draftGroupOrder
      .map((id) => map.get(id))
      .filter(Boolean) as CommonGroup[];
  }, [commonGroups, draftGroupOrder]);

  const activeGroup =
    orderedGroups.find((g) => g.id === activeGroupId) ?? orderedGroups[0];

  const selectGroup = React.useCallback((group: CommonGroup) => {
    setActiveGroupId(group.id);
    setActiveSubGroupId(group.children?.[0]?.id ?? '');
  }, []);

  React.useEffect(() => {
    const first = activeGroup?.children?.[0]?.id ?? '';
    setActiveSubGroupId((prev) => {
      if (!first) return '';
      return prev && activeGroup?.children?.some((x) => x.id === prev)
        ? prev
        : first;
    });
  }, [activeGroupId, activeGroup]);

  const activeSubGroup =
    activeGroup?.children?.find((x) => x.id === activeSubGroupId) ??
    activeGroup?.children?.[0];

  const handleAssistantSend = () => {
    message.info('功能正在开发中~');
  };

  return (
    <>
      <div className="workplace-common pc-admin-workplace-common">
        <div className="workplace-common-card workplace-user-info-card">
          <div className="workplace-user-info-content">
            <div className="workplace-ai-card">
              <div className="workplace-ai-card__hero">
                <div className="workplace-ai-card__copy">
                  <div className="workplace-ai-card__title">Hi～我是小达!</div>
                  <div className="workplace-ai-card__desc">
                    您可以向我咨询任何
                    <br />
                    经营问题哦！
                  </div>
                </div>
                <img
                  className="workplace-ai-card__robot"
                  src={aijiqiren}
                  alt="小达机器人"
                />
              </div>

              <div className="workplace-ai-card__editor">
                <Input.TextArea
                  className="workplace-ai-card__textarea"
                  value={assistantQuestion}
                  maxLength={200}
                  autoSize={{ minRows: 2, maxRows: 2 }}
                  placeholder="请输入您想了解的问题！"
                  onChange={(event) => setAssistantQuestion(event.target.value)}
                />
                <div className="workplace-ai-card__toolbar">
                  <span className="workplace-ai-card__search">
                    <img
                      className="workplace-ai-card__search-icon"
                      src={shendusousuo}
                      alt=""
                    />
                    <span>深度搜索</span>
                  </span>
                  <div className="workplace-ai-card__actions">
                    <span className="workplace-ai-card__count">
                      {assistantQuestion.length}/200
                    </span>
                    <Button
                      type="primary"
                      className="workplace-ai-card__send"
                      onClick={handleAssistantSend}
                      aria-label="发送问题"
                    >
                      <SendOutlined />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Drawer
        open={open}
        closable={false}
        placement="right"
        width={650}
        className="workplace-common-drawer"
        onClose={cancelEdit}
        style={{ background: drawerSurfaceBg }}
        styles={{
          header: {
            padding: '16px 24px',
            borderBottom: `1px solid ${drawerBorderColor}`,
            background: drawerSurfaceBg,
          },
          body: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            padding: 0,
            background: drawerSurfaceBg,
          },
        }}
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: drawerTextPrimary,
              }}
            >
              编辑快捷导航
            </span>
            <Space size={12}>
              <Button
                type="link"
                size="small"
                onClick={restoreDefault}
                style={{ padding: 0, fontSize: 13 }}
              >
                恢复默认
              </Button>
              <Button
                size="small"
                onClick={cancelEdit}
                style={{
                  borderRadius: 16,
                  fontSize: 14,
                  padding: '0 15px',
                  height: 32,
                  lineHeight: '32px',
                }}
              >
                取消
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={confirmEdit}
                loading={favoriteSaving}
                style={{
                  borderRadius: 16,
                  fontSize: 14,
                  padding: '0 15px',
                  height: 32,
                  lineHeight: '32px',
                }}
              >
                确定
              </Button>
            </Space>
          </div>
        }
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToDrawer]}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={onDragEnd}
        >
          <div
            ref={drawerBodyRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
            }}
          >
            {/* 顶部已选中区域 */}
            <div style={{ padding: '20px 24px' }}>
              <Typography.Text
                style={{
                  fontSize: 13,
                  color: drawerTextTertiary,
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    color: drawerTextPrimary,
                    fontWeight: 700,
                  }}
                >
                  常用模块
                </span>
                （当前已选中 {draftList.length}/{COMMON_ACTION_MAX}）{' '}
                <span style={{ color: drawerTextSecondary, marginLeft: 8 }}>
                  移动可调整顺序
                </span>
              </Typography.Text>

              <SortableContext items={draftIds} strategy={rectSortingStrategy}>
                <div
                  ref={setSelectedDroppableRef}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gridAutoFlow: 'row',
                    alignContent: 'start',
                    minHeight: 40,
                    gap: '12px',
                  }}
                >
                  {draftList.map((item) => (
                    <CommonChip
                      key={item.id}
                      item={item}
                      isDarkMode={isDarkMode}
                      onRemove={removeFromDraft}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>

            {/* 底部选择区域 */}
            <div style={{ padding: '16px 24px 0' }}>
              <Typography.Text
                style={{
                  fontSize: 16,
                  color: drawerTextPrimary,
                  fontWeight: 700,
                }}
              >
                选择菜单添加{' '}
              </Typography.Text>
              <span
                style={{
                  color: drawerTextSecondary,
                  fontSize: 12,
                  marginLeft: 10,
                }}
              >
                {' '}
                一级菜单支持拖拽排序
              </span>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                marginTop: 12,
                padding: '0 24px',
                background: 'transparent',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  background: 'transparent',
                }}
              >
                {/* 左侧：Level 1 一级菜单 (可拖拽) */}
                <div
                  style={{
                    width: 170,
                    background: 'transparent',
                    overflowY: 'auto',
                    padding: 0,
                    margin: 0,
                  }}
                >
                  <SortableContext
                    items={draftGroupOrder.map(
                      (id) => `group:${id}` as UniqueIdentifier,
                    )}
                    strategy={verticalListSortingStrategy}
                  >
                    {orderedGroups.map((g) => (
                      <GroupRow
                        key={g.id}
                        id={g.id}
                        isDarkMode={isDarkMode}
                        active={g.id === activeGroupId}
                        onClick={() => selectGroup(g)}
                        icon={g.icon}
                        title={g.title}
                      />
                    ))}
                  </SortableContext>
                </div>

                {/* 中间：Level 2 二级菜单列表 */}
                <div
                  style={{
                    width: 202,
                    background: drawerNestedPanelBg,
                    borderRadius: 0,
                    overflowY: 'auto',
                    padding: 0,
                    marginLeft: 8,
                  }}
                >
                  {activeGroup?.children?.map((sub) => (
                    <SubGroupRow
                      key={sub.id}
                      title={sub.title}
                      isDarkMode={isDarkMode}
                      active={sub.id === activeSubGroupId}
                      onClick={() => setActiveSubGroupId(sub.id)}
                    />
                  ))}
                  {(!activeGroup?.children ||
                    activeGroup.children.length === 0) && (
                    <div
                      style={{
                        color: drawerTextSecondary,
                        textAlign: 'center',
                        marginTop: 40,
                      }}
                    >
                      暂无子菜单
                    </div>
                  )}
                </div>

                {/* 右侧：Level 3 三级菜单列表 */}
                <div
                  style={{
                    width: 210,
                    overflowY: 'auto',
                    padding: '0 24px 12px 32px',
                    background: drawerNestedPanelBg,
                    borderRadius: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {(activeSubGroup?.children ?? []).map((item) => {
                      const exists = draftList.some((x) => x.id === item.id);
                      const disabled =
                        exists || draftList.length >= COMMON_ACTION_MAX;
                      return (
                        <CandidateRow
                          key={item.id}
                          item={item}
                          isDarkMode={isDarkMode}
                          disabled={disabled}
                          onAdd={() => addToDraft(item)}
                        />
                      );
                    })}
                  </div>

                  {(!activeSubGroup?.children ||
                    activeSubGroup.children.length === 0) && (
                    <div
                      style={{
                        color: drawerTextSecondary,
                        textAlign: 'center',
                        marginTop: 40,
                      }}
                    >
                      暂无三级菜单
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeId
              ? (() => {
                  const activeStr = String(activeId);

                  // 拖拽左侧 Level 1 菜单的效果
                  if (activeStr.startsWith('group:')) {
                    const id = activeStr.replace('group:', '');
                    const it = orderedGroups.find((x) => x.id === id);
                    if (!it) return null;
                    return (
                      <div
                        style={{
                          padding: '12px 24px',
                          background: drawerPanelBg,
                          boxShadow: drawerOverlayShadow,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          color: drawerTextPrimary,
                        }}
                      >
                        {it.icon}
                        {it.title}
                      </div>
                    );
                  }

                  // 拖拽顶部 Chips：拖动时展示完整样式（含背景/关闭按钮）
                  const it = draftList.find((x) => x.id === activeId);
                  if (!it) return null;
                  return (
                    <div
                      style={{
                        background: drawerOverlayBg,
                        borderRadius: 16,
                        padding: '4px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        userSelect: 'none',
                        cursor: 'grabbing',
                        fontSize: 13,
                        color: drawerTextPrimary,
                        boxSizing: 'border-box',
                        height: 28,
                        lineHeight: '20px',
                        minWidth: 0,
                        boxShadow: drawerOverlayShadow,
                      }}
                    >
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        {it.title}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: drawerOverlayIconBg,
                          color: 'var(--ant-color-text-light-solid, #fff)',
                          fontSize: 8,
                        }}
                      >
                        <CloseOutlined />
                      </span>
                    </div>
                  );
                })()
              : null}
          </DragOverlay>
        </DndContext>
      </Drawer>
    </>
  );
};

export default WorkplaceCommonMenu;
