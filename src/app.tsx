import { LinkOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import { Switch, Tooltip } from 'antd';
import React, { useEffect } from 'react';
import { currentUser as queryCurrentUser } from '@/api/user';
import { AvatarDropdown, AvatarName, Footer, NoticeBell } from '@/components';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';
import { clearToken, getToken } from '@/api/storage';

const isDev = process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/user/login';
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;

const apiBase = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : undefined;

// 监听滚动：用于“滚动经过 Header 后，Header 变白 + 分割线 + 阴影”
const HeaderScrollWatcher: React.FC = () => {
  useEffect(() => {
    const handler = () => {
      // 兼容 window 滚动与容器滚动
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      if (y > 0) {
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

// 判断当前 pathname 是否落在某个菜单 path 下（用于匹配“一级菜单”）
function isPathMatch(basePath: string, pathname: string) {
  if (!basePath || !pathname) return false;
  if (basePath === '/') return pathname === '/';

  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return pathname === base || pathname.startsWith(`${base}/`);
}

// 在一级菜单中找到与当前 pathname 最匹配的那一项（取 path 最长的命中项）
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

// 统计某个菜单节点下“可展示的叶子页面数量”（用于 A2：<=1 则认为无需展示左侧菜单）
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

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
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
      // 方案1（临时策略）：用户信息接口未接通前，不要因为拉用户信息失败就清 token/踢回登录
      // 只要本地有 token，就先允许进入系统；等用户信息接口就绪后再恢复严格逻辑。
      // TODO(接口完成后回滚)：恢复为“拉用户信息失败 => clearToken() + history.push(loginPath)”
      if (!getToken()) {
        clearToken();
        history.push(loginPath);
      }
    }
    return undefined;
  };
  // 如果不是登录页面，执行
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

//ID 的对照表
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
//=======================//

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
      ]; // 你的实际 iframe 路由

      return (
        <div
          style={{ cursor: 'pointer', width: '100%', height: '100%' }}
          // 建议用 onClickCapture 以防被 Antd 内部拦截
          onClickCapture={() => {
            // 2. 🔥 核心：根据菜单名字查 ID
            // 如果查不到，默认给个 0 或者空字符串
            const currentId = MENU_ID_MAP[item.name || ''] || 0;

            console.log(`🔥 点击菜单: [${item.name}], 匹配 ID: ${currentId}`);

            const isIframePage = item.path && IFRAME_PATHS.includes(item.path);

            if (isIframePage) {
              // ==============================
              // 情况 A: Iframe 页面 -> 传值并跳转
              // ==============================
              let finalPath = item.path;
              if (finalPath === '/dashboard') {
                finalPath = '/dashboard/index';
              }
              // 执行带参跳转
              if (finalPath) {
                history.push(`${finalPath}?targetId=${currentId}`);
              }
              // 4. 带参跳转 (带上 targetId)
              // 这样 iframe 刷新或刚进来也能拿到 ID
              // if (item.path) {
              //   history.push(`${item.path}?targetId=${currentId}`);
              // }
            } else {
              // ==============================
              // 情况 B: 普通页面 -> 正常跳转
              // ==============================
              // 如果普通页面也需要这个 ID，也可以在这里 push 带参数
              history.push(`${item.path}`);
            }
          }}
        >
          {dom}
        </div>
      );
    },
    // 关闭sider菜单栏展开按钮
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
        // <Question key="doc" />,
        // <SelectLang key="SelectLang" />,
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
      // 1) 先定位：当前属于哪个“一级菜单”
      const top = findTopLevelMenuItem(menuProps?.menuData, pathname);

      if (!top) return defaultDom;

      // 2) 统计：该一级菜单下可达的“叶子页面”数量
      const leafCount = countVisibleLeaves(top.children) || (top.path ? 1 : 0);
      // 3) 规则：叶子页面数量 <= 1 时隐藏左侧（只保留 Header 和内容区）
      return leafCount <= 1 ? null : defaultDom;
    },

    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    waterMarkProps: {
      content: initialState?.currentUser?.name,
    },
    // footerRender: () => <Footer />,
    onPageChange: () => {
      if (devBypassAuth) return;
      const { location } = history;

      // 方案1（临时策略）：用户信息接口未接通前，允许“仅凭 token”进入系统
      // TODO(接口完成后回滚)：恢复为“!initialState?.currentUser 时直接跳登录”（不以 token 放行）
      const hasToken = !!getToken();

      // 如果既没有 currentUser，也没有 token，才认为未登录
      if (
        !initialState?.currentUser &&
        !hasToken &&
        location.pathname !== loginPath
      ) {
        history.push(loginPath);
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
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

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  baseURL: apiBase,
  ...errorConfig,
};
