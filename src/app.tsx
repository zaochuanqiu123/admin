/**
 * 应用运行时入口（Umi Max Runtime）
 *
 * 这个文件主要负责：
 * - 初始化全局运行时状态（getInitialState）：拉取当前用户、处理登录态
 * - 配置 ProLayout（layout）：菜单渲染、顶部操作区、头像下拉等
 * - 实现“工作台-常用入口”侧边栏模块：包含本地缓存、编辑抽屉、拖拽排序
 * - 统一 request 配置（baseURL + errorConfig）
 */

/**
 * UI 图标依赖：主要用于侧边栏常用入口、拖拽列表、主题切换等
 */
import {
  AppstoreOutlined,
  CloseOutlined,
  LeftOutlined,
  MenuOutlined,
  MoonOutlined,
  PlusCircleOutlined,
  RightOutlined,
  SunOutlined,
} from '@ant-design/icons';
/**
 * ProLayout / ProComponents：
 * - LayoutSettings：运行时布局配置类型（主题、布局、菜单等）
 * - MenuDataItem：菜单项结构（用于自定义菜单渲染与筛选）
 * - SettingDrawer：仅在开发环境下启用的可视化配置面板
 */
import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';

/**
 * dnd-kit：用于实现“常用入口”编辑抽屉中的拖拽排序
 * - UniqueIdentifier：拖拽项的 id 类型
 * - DndContext/SortableContext：拖拽上下文与可排序容器
 * - useSortable/useDroppable：拖拽项/投放区 hooks
 * - arrayMove：排序后的数组重排
 */
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import {
  Button,
  Drawer,
  Dropdown,
  type MenuProps,
  message,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import React, { useEffect } from 'react';
import { outLogin, currentUser as queryCurrentUser } from '@/api/user';
import { AvatarName, NoticeBell } from '@/components';
import defaultSettings from '../config/defaultSettings';
import routes from '../config/routes';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';
import { clearToken, getToken } from '@/api/storage';

const isDev = process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/user/login';
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;

const apiBase = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : undefined;

/**
 * HeaderScrollWatcher
 *
 * 用途：监听 window 滚动位置，给 body 动态加/减 `header-scrolled` class。
 * - 典型场景：顶部 Header 在滚动后需要阴影/背景变化（由 CSS 负责具体样式）
 * - 实现要点：
 *   - 使用 passive listener 提升滚动性能
 *   - 初次挂载立即执行一次 handler，确保刷新后状态正确
 */
const HeaderScrollWatcher: React.FC = () => {
  useEffect(() => {
    const handler = () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      if (y > 16) {
        document.body.classList.add('header-scrolled');
      } else {
        document.body.classList.remove('header-scrolled');
      }
    };

    handler();
    window.addEventListener('scroll', handler, { passive: true } as any);
    return () => window.removeEventListener('scroll', handler as any);
  }, []);

  return null;
};

if (isDev && typeof window !== 'undefined') {
  (window as any).__DEV_BYPASS_AUTH__ = devBypassAuth;
  (window as any).__API_BASE__ = apiBase;
}

function getDevUser(): API.CurrentUser {
  return {
    name: 'Dev Admin',
    access: 'admin',
  };
}

function isPathMatch(basePath: string, pathname: string) {
  if (!basePath || !pathname) return false;
  if (basePath === '/') return pathname === '/';
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function findTopLevelMenuItem(
  menuData: MenuDataItem[] | undefined,
  pathname: string,
) {
  if (!menuData || menuData.length === 0) return undefined;
  let best: MenuDataItem | undefined;
  for (const item of menuData) {
    const p = item?.path;
    if (!p) continue;
    if (isPathMatch(p, pathname)) {
      if (!best || (best.path?.length ?? 0) < p.length) {
        best = item;
      }
    }
  }
  return best;
}

function countVisibleLeaves(items: MenuDataItem[] | undefined): number {
  if (!items || items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    if ((item as any)?.hideInMenu) continue;
    const children = item?.children?.filter((c) => !(c as any)?.hideInMenu);
    if (children && children.length > 0) {
      total += countVisibleLeaves(children);
      continue;
    }
    if (item?.path) total += 1;
  }
  return total;
}

export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  if (devBypassAuth) {
    const currentUser = getDevUser();
    return {
      fetchUserInfo: async () => currentUser,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }

  const fetchUserInfo = async () => {
    try {
      const msg = await queryCurrentUser({
        skipErrorHandler: true,
      });
      return msg;
    } catch (_error) {
      if (!getToken()) {
        clearToken();
        history.push(loginPath);
      }
    }
    return undefined;
  };

  const { location } = history;
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

const MENU_ID_MAP: Record<string, number> = {
  工作台: 163,
  门店: 1457,
  商品: 1459,
  进销存: 206,
  订单: 1432,
  会员: 215,
  数据: 1917,
  财务: 1464,
  设置: 303,
  应用: 1495,
};

type TopRouteTabItem = {
  name: string;
  path: string;
  rawPath: string;
};

function resolveTopRoutePath(route: any): string {
  if (!route) return '';
  if (typeof route.redirect === 'string' && route.redirect)
    return route.redirect;
  const children = route.routes;
  if (Array.isArray(children) && children.length > 0) {
    for (const child of children) {
      if (typeof child?.redirect === 'string' && child.redirect)
        return child.redirect;
      if (typeof child?.path === 'string' && child.path) return child.path;
      if (Array.isArray(child?.routes) && child.routes.length > 0) {
        const deep = resolveTopRoutePath(child);
        if (deep) return deep;
      }
    }
  }
  return typeof route.path === 'string' ? route.path : '';
}

const WorkplaceCommonTopRouteTabs: React.FC = () => {
  const pathname = history.location.pathname;
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const lastPathRef = React.useRef<string>(pathname);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [activeKey, setActiveKey] = React.useState<string>('');

  const topRoutes = React.useMemo(() => {
    const list = (routes as any[])
      .filter((r) => r && r.name && r.path)
      .filter((r) => r.path !== '/' && r.path !== '/*' && r.path !== '/user')
      .filter((r) => !(r as any)?.hideInMenu)
      .filter((r) => (r as any)?.layout !== false);

    const mapped: TopRouteTabItem[] = [];
    for (const r of list) {
      const rawPath = String(r.path);
      const targetPath = resolveTopRoutePath(r);
      if (!targetPath) continue;
      mapped.push({ name: String(r.name), path: targetPath, rawPath });
    }
    return mapped;
  }, []);

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();

    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true } as any);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', onScroll as any);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scrollByAmount = (delta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const getActiveKeyFromPathname = React.useCallback(() => {
    const found = topRoutes.find(
      (r) => isPathMatch(r.rawPath, pathname) || isPathMatch(r.path, pathname),
    );
    return found?.rawPath ?? topRoutes[0]?.rawPath ?? '';
  }, [pathname, topRoutes]);

  React.useEffect(() => {
    // 首次渲染：用当前路由初始化高亮
    if (!activeKey) {
      setActiveKey(getActiveKeyFromPathname());
    }
  }, [activeKey, getActiveKeyFromPathname]);

  React.useEffect(() => {
    // 当外部路由变化时（例如用户通过其它方式切换页面），同步高亮
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      setActiveKey(getActiveKeyFromPathname());
    }
  }, [getActiveKeyFromPathname, pathname]);

  React.useEffect(() => {
    if (!activeKey) return;
    const el = tabRefs.current[activeKey];
    if (!el) return;
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeKey]);

  if (!topRoutes || topRoutes.length === 0) return null;

  return (
    <div className="workplace-common-drawer-top-tabs">
      <Button
        type="text"
        className="workplace-common-drawer-top-tabs-arrow"
        icon={<LeftOutlined />}
        disabled={!canScrollLeft}
        onClick={() => scrollByAmount(-220)}
      />

      <div className="workplace-common-drawer-top-tabs-scroll" ref={scrollRef}>
        <div className="workplace-common-drawer-top-tabs-list">
          {topRoutes.map((r) => {
            const active = r.rawPath === activeKey;
            return (
              <button
                key={r.rawPath}
                type="button"
                className={
                  'workplace-common-drawer-top-tab' +
                  (active ? ' workplace-common-drawer-top-tab-active' : '')
                }
                ref={(node) => {
                  tabRefs.current[r.rawPath] = node;
                }}
                onClick={() => setActiveKey(r.rawPath)}
              >
                {r.name}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        type="text"
        className="workplace-common-drawer-top-tabs-arrow"
        icon={<RightOutlined />}
        disabled={!canScrollRight}
        onClick={() => scrollByAmount(220)}
      />
    </div>
  );
};

type CommonAction = {
  id: string;
  title: string;
  path: string;
};

const DEFAULT_COMMON_ACTIONS: CommonAction[] = [
  { id: 'recharge', title: '充值', path: '/finance' },
  { id: 'coupon', title: '优惠券管理', path: '/set' },
  { id: 'batch-pay', title: '批量付款', path: '/finance' },
  { id: 'withdraw', title: '提现', path: '/finance' },
  { id: 'bill-download', title: '账单下载', path: '/finance' },
  { id: 'pay-gift', title: '支付有礼', path: '/set' },
  { id: 'transfer', title: '转账', path: '/finance' },
];

/**
 * 左侧二级菜单 Item (Level 2)
 */
function SubGroupRow({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovering, setHovering] = React.useState(false);
  const high = active || hovering;
  return (
    <button
      type="button"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 36,
        marginBottom: 8,
        padding: '12px 24px',
        cursor: 'pointer',
        userSelect: 'none',
        fontSize: 14,
        color: high ? '#005BF8' : '#333',
        background: 'transparent',
        border: 0,
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        font: 'inherit',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <RightOutlined
        style={{
          color: high ? '#005BF8' : '#999',
          fontSize: 12,
          marginLeft: 8,
        }}
      />
    </button>
  );
}

/**
 * 左侧一级菜单 Item (Level 1)
 * 支持拖拽排序
 */
function GroupRow({
  id,
  active,
  icon,
  title,
  onClick,
}: {
  id: string;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  const [hovering, setHovering] = React.useState(false);
  const sortableId = `group:${id}` as UniqueIdentifier;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    height: 36,
    marginBottom: 8,
    padding: 0,
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: 14,
    color: active || hovering ? '#005BF8' : '#333',
    background: 'transparent',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: active || hovering ? '#005BF8' : undefined,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
      </div>
      <RightOutlined
        style={{
          color: active || hovering ? '#005BF8' : '#999',
          fontSize: 12,
          marginLeft: 8,
        }}
      />
    </div>
  );
}

const COMMON_ACTION_MAX = 10;
const COMMON_ACTION_PREVIEW_COUNT = 7;

function readCommonActionsFromStorage(
  storageKey: string,
): CommonAction[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const list: CommonAction[] = parsed
      .filter((x: any) => x && typeof x === 'object')
      .filter(
        (x: any) =>
          typeof x.id === 'string' &&
          typeof x.title === 'string' &&
          typeof x.path === 'string',
      )
      .map((x: any) => ({ id: x.id, title: x.title, path: x.path }));
    return list.length ? list : null;
  } catch {
    return null;
  }
}

function writeCommonActionsToStorage(storageKey: string, list: CommonAction[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * 顶部已选中的胶囊样式
 * 支持拖拽排序
 */
function CommonChip({
  item,
  onRemove,
}: {
  item: CommonAction;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id: item.id as UniqueIdentifier });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isSorting ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
    background: '#F4F6F8',
    borderRadius: 16,
    padding: '4px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    userSelect: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    fontSize: 13,
    color: '#333',
    boxSizing: 'border-box',
    height: 28,
    lineHeight: '20px',
    width: '100%',
    justifyContent: 'space-between',
    minWidth: 0,
    willChange: 'transform',
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: 1,
        background: isDragging ? 'transparent' : style.background,
        border: isDragging
          ? '1px dashed var(--ant-color-primary)'
          : '1px solid transparent',
      }}
      {...attributes}
      {...listeners}
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
        {item.title}
      </span>
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#C0C4CC',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 8,
          border: 0,
          padding: 0,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
      >
        <CloseOutlined />
      </button>
    </div>
  );
}

/**
 * 右侧待选列表项 (Level 3)
 * **移除拖拽功能**，仅保留点击添加，修复占位问题
 */
function CandidateRow({
  item,
  disabled,
  onAdd,
}: {
  item: CommonAction;
  disabled: boolean;
  onAdd: () => void;
}) {
  const [hovering, setHovering] = React.useState(false);

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    background: 'transparent',
    cursor: 'default',
    userSelect: 'none',
    fontSize: 14,
    color: hovering && !disabled ? '#005BF8' : disabled ? '#ccc' : '#333',
  };
  return (
    <div
      style={style}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{ whiteSpace: 'nowrap', paddingRight: 12 }}>{item.title}</div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onAdd();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: 0,
          padding: 0,
          background: 'transparent',
        }}
      >
        <PlusCircleOutlined
          style={{
            fontSize: 12,
            color: disabled
              ? '#ccc'
              : hovering
                ? '#005BF8'
                : 'var(--ant-color-primary)',
          }}
        />
      </button>
    </div>
  );
}

type CommonSubGroup = {
  id: string;
  title: string;
  children: CommonAction[];
};

type CommonGroup = {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: CommonSubGroup[];
};

const BASE_COMMON_GROUPS: CommonGroup[] = [
  {
    id: 'goods',
    title: '商品',
    icon: <AppstoreOutlined />,
    children: [
      {
        id: 'goods-manage',
        title: '商品管理',
        children: [
          { id: 'goods', title: '商品', path: '/goods' },
          { id: 'category', title: '类目管理', path: '/category' }, // 模拟数据填充 Grid
          { id: 'inventory', title: '库存查询', path: '/inventory' },
        ],
      },
      {
        id: 'goods-settings',
        title: '商品设置',
        children: [{ id: 'tags', title: '标签管理', path: '/tags' }],
      },
    ],
  },
  {
    id: 'service',
    title: '服务',
    icon: <AppstoreOutlined />,
    children: [
      {
        id: 'service-manage',
        title: '服务管理',
        children: [{ id: 'service', title: '服务', path: '/service' }],
      },
    ],
  },
  {
    id: 'order',
    title: '订单',
    icon: <AppstoreOutlined />,
    children: [
      {
        id: 'order-manage',
        title: '订单管理',
        children: [{ id: 'order', title: '订单', path: '/order' }],
      },
    ],
  },
];

const EXTRA_COMMON_GROUPS: CommonGroup[] = [
  {
    id: 'private',
    title: '私域',
    icon: <AppstoreOutlined />,
    children: [
      {
        id: 'private-mini',
        title: '小程序',
        children: [
          {
            id: 'private-mini-home',
            title: '小程序首页',
            path: '/private/mini/home',
          },
        ],
      },
    ],
  },
];

const COMMON_GROUPS: CommonGroup[] = [
  ...EXTRA_COMMON_GROUPS,
  ...BASE_COMMON_GROUPS,
];

const WorkplaceCommonMenu: React.FC<{ storageKey: string }> = ({
  storageKey,
}) => {
  const [open, setOpen] = React.useState(false);
  const [savedList, setSavedList] = React.useState<CommonAction[]>(
    DEFAULT_COMMON_ACTIONS,
  );
  const [draftList, setDraftList] = React.useState<CommonAction[]>(
    DEFAULT_COMMON_ACTIONS,
  );
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = readCommonActionsFromStorage(storageKey);
    if (stored) {
      setSavedList(stored);
      setDraftList(stored);
    }

    try {
      const rawOrder = localStorage.getItem(`${storageKey}__groupOrder`);
      if (rawOrder) {
        const parsed = JSON.parse(rawOrder);
        if (Array.isArray(parsed)) {
          const base = COMMON_GROUPS.map((g) => g.id);
          const filtered = parsed.filter((x: any) => typeof x === 'string');
          const uniq: string[] = [];
          for (const x of filtered) if (!uniq.includes(x)) uniq.push(x);
          const merged = [
            ...uniq.filter((x) => base.includes(x)),
            ...base.filter((x) => !uniq.includes(x)),
          ];
          setSavedGroupOrder(merged);
          setDraftGroupOrder(merged);
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

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

  const openDrawer = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDraftList(savedList.map((x) => ({ ...x })));
    setDraftGroupOrder(savedGroupOrder.map((x) => x));
    setOpen(true);
  };

  const restoreDefault = () => {
    setDraftList(DEFAULT_COMMON_ACTIONS.map((x) => ({ ...x })));
  };

  const cancelEdit = () => {
    setOpen(false);
    setDraftList(savedList.map((x) => ({ ...x })));
    setDraftGroupOrder(savedGroupOrder.map((x) => x));
  };

  const confirmEdit = () => {
    setSavedList(draftList.map((x) => ({ ...x })));
    writeCommonActionsToStorage(storageKey, draftList);
    setSavedGroupOrder(draftGroupOrder.map((x) => x));
    try {
      localStorage.setItem(
        `${storageKey}__groupOrder`,
        JSON.stringify(draftGroupOrder),
      );
    } catch {
      // ignore
    }
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

  const previewList = savedList.slice(0, COMMON_ACTION_PREVIEW_COUNT);
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

  return (
    <>
      <div className="workplace-common pc-admin-workplace-common">
        <div className="workplace-common-card">
          <button
            type="button"
            className="ant-menu-submenu-title workplace-common-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              background: 'transparent',
              border: 0,
              padding: 0,
              textAlign: 'left',
              cursor: 'default',
            }}
          >
            <span className="ant-menu-item-icon">
              <AppstoreOutlined />
            </span>
            <span className="ant-menu-title-content">常用</span>
            <MenuOutlined
              className="workplace-common-header-extra"
              onClick={(e) => {
                e.stopPropagation();
                openDrawer(e as any);
              }}
            />
          </button>
          <div
            className="ant-menu-sub ant-menu-inline workplace-common-actions"
            role="menu"
          >
            {previewList.map((a) => (
              <div
                key={a.id}
                className="ant-menu-item"
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    history.push(a.path);
                  }
                }}
                onClick={() => {
                  history.push(a.path);
                }}
              >
                <span className="ant-menu-title-content">{a.title}</span>
              </div>
            ))}
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
        // 自定义 Header：按钮胶囊样式，恢复默认文字链接
        style={{ background: '#FAFCFF' }}
        styles={{
          header: {
            padding: '16px 24px',
            borderBottom: '1px solid #f0f0f0',
            background: '#FAFCFF',
          },
          body: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            padding: 0,
            background: '#FAFCFF',
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
            <span style={{ fontSize: 16, fontWeight: 600 }}>编辑快捷导航</span>
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
                  color: '#666',
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                当前已选中 ({draftList.length}/{COMMON_ACTION_MAX}){' '}
                <span style={{ color: '#999', marginLeft: 8 }}>
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
                      onRemove={removeFromDraft}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>

            {/* 底部选择区域 */}
            <div style={{ padding: '16px 24px 0' }}>
              <Typography.Text style={{ fontSize: 13, color: '#333' }}>
                选择菜单添加{' '}
                <span style={{ color: '#999', fontSize: 12, marginLeft: 10 }}>
                  {' '}
                  一级菜单支持拖拽排序
                </span>
              </Typography.Text>
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
              }}
            >
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                {/* 左侧：Level 1 一级菜单 (可拖拽) */}
                <div
                  style={{
                    width: 170,
                    background: '#FAFCFF',
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
                    background: '#fff',
                    borderRadius: 16,
                    overflowY: 'auto',
                    padding: 0,
                    marginLeft: 8,
                  }}
                >
                  {activeGroup?.children?.map((sub) => (
                    <SubGroupRow
                      key={sub.id}
                      title={sub.title}
                      active={sub.id === activeSubGroupId}
                      onClick={() => setActiveSubGroupId(sub.id)}
                    />
                  ))}
                  {(!activeGroup?.children ||
                    activeGroup.children.length === 0) && (
                    <div
                      style={{
                        color: '#999',
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
                    background: '#fff',
                    borderRadius: 16,
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
                        color: '#999',
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
                          background: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
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
                        background: '#F4F6F8',
                        borderRadius: 16,
                        padding: '4px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        userSelect: 'none',
                        cursor: 'grabbing',
                        fontSize: 13,
                        color: '#333',
                        boxSizing: 'border-box',
                        height: 28,
                        lineHeight: '20px',
                        minWidth: 0,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
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
                          background: '#C0C4CC',
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

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    menu: {
      locale: false,
      defaultOpenAll: true,
      autoClose: false,
    },
    menuItemRender: (item, dom) => {
      // 定义 iframe 路由白名单
      const IFRAME_PATHS = [
        '/admin',
        '/dashboard/index',
        '/dashboard',
        '/account',
        '/form',
        '/list',
        '/profile',
        '/exception',
        '/result',
        '/set',
        '/finance',
      ];

      return (
        <div
          style={{ cursor: 'pointer', width: '100%', height: '100%' }}
          onClickCapture={() => {
            const currentId = MENU_ID_MAP[item.name || ''] || 0;
            console.log(`🔥 点击菜单: [${item.name}], 匹配 ID: ${currentId}`);
            const isIframePage = item.path && IFRAME_PATHS.includes(item.path);

            if (isIframePage) {
              let finalPath = item.path;
              if (finalPath === '/dashboard') {
                finalPath = '/dashboard/index';
              }
              if (finalPath) {
                history.push(`${finalPath}?targetId=${currentId}`);
              }
            } else {
              history.push(`${item.path}`);
            }
          }}
        >
          {dom}
        </div>
      );
    },
    collapsedButtonRender: false,
    actionsRender: () => {
      const checked = (initialState?.settings as any)?.navTheme === 'realDark';

      return [
        <Tooltip key="theme" title={checked ? '切换亮色模式' : '切换暗黑模式'}>
          <Switch
            checked={checked}
            className="theme-switch"
            style={{ minWidth: 52, borderRadius: 999, marginRight: 20 }}
            checkedChildren={
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  lineHeight: 1,
                }}
              >
                <MoonOutlined style={{ fontSize: 11, lineHeight: 1 }} />
              </span>
            }
            unCheckedChildren={
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  lineHeight: 1,
                }}
              >
                <SunOutlined style={{ fontSize: 11, lineHeight: 1 }} />
              </span>
            }
            onChange={(nextChecked) => {
              setInitialState((preInitialState) => ({
                ...preInitialState,
                settings: {
                  ...(preInitialState?.settings || {}),
                  navTheme: nextChecked ? 'realDark' : 'light',
                } as Partial<LayoutSettings>,
              }));
            }}
          />
        </Tooltip>,
        <NoticeBell key="notice" />,
      ];
    },
    menuRender: (
      menuProps: {
        menuData?: MenuDataItem[];
        location?: { pathname?: string };
      },
      defaultDom,
    ) => {
      const pathname =
        menuProps?.location?.pathname ?? history.location.pathname;
      const top = findTopLevelMenuItem(menuProps?.menuData, pathname);

      if (!top) return defaultDom;
      const leafCount = countVisibleLeaves(top.children) || (top.path ? 1 : 0);
      return leafCount <= 1 ? null : defaultDom;
    },

    menuContentRender: (
      menuProps: {
        menuData?: MenuDataItem[];
        location?: { pathname?: string };
      },
      defaultDom,
    ) => {
      const pathname =
        menuProps?.location?.pathname ?? history.location.pathname;
      const isInDashboard =
        pathname === '/dashboard' || pathname.startsWith('/dashboard/');

      if (!isInDashboard) return defaultDom;

      const storageKey = `workplace_common_actions_${
        initialState?.currentUser?.name ?? 'guest'
      }`;

      return (
        <div className="dashboard-sider">
          <div className="dashboard-sider-common">
            <WorkplaceCommonMenu storageKey={storageKey} />
          </div>

          <div className="dashboard-sider-menu">
            <div className="dashboard-sider-menu-content">{defaultDom}</div>
          </div>
        </div>
      );
    },

    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        // 退出登录处理函数
        const handleLogout = async () => {
          try {
            // 调用退出登录 API
            await outLogin();
          } catch (error) {
            // 即使 API 调用失败，也继续执行退出流程
            console.error('退出登录 API 调用失败:', error);
          } finally {
            // 清除本地 token
            clearToken();
            // 清除用户信息
            setInitialState((s) => ({
              ...s,
              currentUser: undefined,
            }));
            // 跳转到登录页
            history.push(loginPath);
            message.success('已退出登录');
          }
        };

        // 下拉菜单配置
        const menuItems: MenuProps['items'] = [
          {
            key: 'logout',
            label: '退出登录',
            onClick: handleLogout,
          },
        ];

        return (
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomRight"
            trigger={['hover']}
          >
            <span
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                height: 48,
                padding: '0 16px',
                margin: 16,
                borderRadius: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLSpanElement).style.backgroundColor =
                  'rgba(0, 0, 0, 0.04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLSpanElement).style.backgroundColor =
                  'transparent';
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLSpanElement).style.backgroundColor =
                  'rgba(0, 0, 0, 0.08)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLSpanElement).style.backgroundColor =
                  'rgba(0, 0, 0, 0.04)';
              }}
              onClick={() => history.push('/dashboard/settings')}
            >
              {avatarChildren}
            </span>
          </Dropdown>
        );
      },
    },
    waterMarkProps: {
      content: initialState?.currentUser?.name,
    },
    onPageChange: () => {
      if (devBypassAuth) return;
      const { location } = history;
      const hasToken = !!getToken();
      if (
        !initialState?.currentUser &&
        !hasToken &&
        location.pathname !== loginPath
      ) {
        history.push(loginPath);
      }
    },

    menuHeaderRender: undefined,
    childrenRender: (children) => {
      return (
        <>
          <HeaderScrollWatcher />
          {children}
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

export const request: RequestConfig = {
  baseURL: apiBase,
  ...errorConfig,
};
