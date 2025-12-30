import { LinkOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import { Switch, Tooltip } from 'antd';
import React from 'react';
import { currentUser as queryCurrentUser } from '@/api/user';
import { AvatarDropdown, AvatarName, Footer } from '@/components';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';
import { clearToken } from '@/api/storage';

const isDev = process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/user/login';
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;

const apiBase = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : undefined;

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
      clearToken();
      history.push(loginPath);
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

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    menu: {
      locale: false,
      defaultOpenAll: true,
    },
    // 关闭sider菜单栏展开按钮
    collapsedButtonRender: false,
    actionsRender: () => {
      const checked = (initialState?.settings as any)?.navTheme === 'realDark';

      return [
        <Tooltip key="theme" title={checked ? '切换亮色模式' : '切换暗黑模式'}>
          <Switch
            checked={checked}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
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
    footerRender: () => <Footer />,
    onPageChange: () => {
      if (devBypassAuth) return;
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
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
    links: isDev
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
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
