import { CloseOutlined, UserOutlined } from '@ant-design/icons';
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
import {
  Avatar,
  Button,
  Drawer,
  message,
  Space,
  Typography,
  theme,
} from 'antd';
import React, { useEffect } from 'react';
import {
  COMMON_ACTION_MAX,
  COMMON_GROUPS,
  type CommonAction,
  type CommonGroup,
  DEFAULT_COMMON_ACTIONS,
} from '@/config/menu.config';
import {
  readGroupOrderFromStorage,
  writeGroupOrderToStorage,
} from '@/utils/commonActions.storage';
import WorkplaceCommonTopRouteTabs from '../WorkplaceCommonTopRouteTabs';
import CandidateRow from './CandidateRow';
import CommonChip from './CommonChip';
import GroupRow from './GroupRow';
import SubGroupRow from './SubGroupRow';

const OPEN_COMMON_ACTIONS_DRAWER_EVENT = 'pc-admin-open-common-actions-drawer';
const DEMO_AVATAR_SRC =
  'https://api.dicebear.com/7.x/miniavs/svg?seed=antd-yangkun';

const WorkplaceCommonMenu: React.FC<{
  storageKey: string;
  commonActions: CommonAction[];
  setCommonActions: (actions: CommonAction[]) => void;
}> = ({ storageKey, commonActions, setCommonActions }) => {
  const { initialState } = useModel('@@initialState');
  const { token } = theme.useToken();
  const [open, setOpen] = React.useState(false);
  const [draftList, setDraftList] =
    React.useState<CommonAction[]>(commonActions);
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [savedGroupOrder, setSavedGroupOrder] = React.useState<string[]>(
    COMMON_GROUPS.map((g) => g.id),
  );
  const [draftGroupOrder, setDraftGroupOrder] = React.useState<string[]>(
    COMMON_GROUPS.map((g) => g.id),
  );
  const [activeGroupId, setActiveGroupId] = React.useState<string>(
    COMMON_GROUPS[0]?.id ?? 'goods',
  );
  const [activeSubGroupId, setActiveSubGroupId] = React.useState<string>(
    COMMON_GROUPS[0]?.children?.[0]?.id ?? '',
  );
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDraftList(commonActions);

    const defaultOrder = COMMON_GROUPS.map((g) => g.id);
    const groupOrder = readGroupOrderFromStorage(storageKey, defaultOrder);
    setSavedGroupOrder(groupOrder);
    setDraftGroupOrder(groupOrder);
  }, [storageKey, commonActions]);

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
    setDraftList(commonActions.map((x) => ({ ...x })));
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
    setDraftList(DEFAULT_COMMON_ACTIONS.map((x) => ({ ...x })));
  };

  const cancelEdit = () => {
    setOpen(false);
    setDraftList(commonActions.map((x) => ({ ...x })));
    setDraftGroupOrder(savedGroupOrder.map((x) => x));
  };

  const confirmEdit = () => {
    setCommonActions(draftList.map((x) => ({ ...x })));
    setSavedGroupOrder(draftGroupOrder.map((x) => x));
    writeGroupOrderToStorage(storageKey, draftGroupOrder);
    setOpen(false);
  };

  const removeFromDraft = (id: string) => {
    setDraftList((prev) => prev.filter((x) => x.id !== id));
  };

  const addToDraft = (item: CommonAction) => {
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
    const map = new Map(COMMON_GROUPS.map((g) => [g.id, g] as const));
    return draftGroupOrder
      .map((id) => map.get(id))
      .filter(Boolean) as CommonGroup[];
  }, [draftGroupOrder]);

  const activeGroup =
    orderedGroups.find((g) => g.id === activeGroupId) ?? orderedGroups[0];

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

  // 获取时间段问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '凌晨好';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '夜深了';
  };

  return (
    <>
      <div className="workplace-common pc-admin-workplace-common">
        <div className="workplace-common-card workplace-user-info-card">
          <div className="workplace-user-info-content">
            <Avatar
              size={48}
              icon={<UserOutlined />}
              src={DEMO_AVATAR_SRC}
              className="workplace-user-avatar"
            />
            <div className="workplace-user-text">
              <div className="workplace-user-greeting">
                {getGreeting()}！尊敬的杨坤
              </div>
              <div className="workplace-user-ukey-block">
                <div className="workplace-user-ukey-serial">
                  U盾序号 283****738
                </div>
                <div className="workplace-user-ukey-action">财务提交</div>
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

            <div style={{ padding: '12px 24px 0' }}>
              <WorkplaceCommonTopRouteTabs />
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
                        onClick={() => setActiveGroupId(g.id)}
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
                    padding: '12px 24px 12px 32px',
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
                          color: '#fff',
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
