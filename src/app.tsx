import { DownOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';

import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';

import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import {
  Button,
  Dropdown,
  type MenuProps,
  message,
  Switch,
  Tooltip,
} from 'antd';
import { AvatarName, NoticeBell } from '@/components';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';
import { logout as requestLogout } from '@/api/auth';
import { getPermContext } from '@/api/context';
import {
  clearBusinessList,
  clearCurrentBusinessCode,
  clearLoginOrgList,
  clearLoginUserInfo,
  clearSelectedOrgCode,
  clearToken,
  getBusinessList,
  getCurrentBusinessCode,
  getLoginUserInfo,
  getSelectedOrgCode,
  getToken,
  setCurrentBusinessCode,
} from '@/api/storage';
import logoDark from '@/assets/logo-dark.png';
import HeaderScrollWatcher from '@/components/Layout/HeaderScrollWatcher';
import WorkplaceCommonMenu from '@/components/Workplace/WorkplaceCommonMenu';
import { IFRAME_PATHS } from '@/config/iframe.config';
import {
  clearPostLoginRedirect,
  redirectToLogin,
  setPostLoginRedirect,
} from '@/utils/auth-expired';
import { buildIframeRouteWithParams, isIframeRoutePath } from '@/utils/iframe';
import {
  extractPermContextNodes,
  getValidBusinessCode,
  mapPermContextToMenuData,
  TEMP_BUSINESS_CODE,
} from '@/utils/menu';
import { getAllowedTopPaths } from '@/utils/route.utils';

const isDev = process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/user/login';
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;
let logoutInFlight: Promise<void> | null = null;

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

function syncBlackModeClass(navTheme?: string) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('theme-black-mode', navTheme === 'realDark');
}

function markThemeSwitching() {
  if (typeof document === 'undefined') return;
  document.body.classList.add('theme-switching');
  window.setTimeout(() => {
    document.body.classList.remove('theme-switching');
  }, 220);
}

export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
  currentOrgCode?: string;
  permContextMenu?: MenuDataItem[];
  businessList?: any[];
  currentBusinessCode?: string;
}> {
  const fetchPermMenu = async (businessCode?: string) => {
    try {
      const res = await getPermContext(businessCode);
      const nodes = extractPermContextNodes(res);
      const menu = mapPermContextToMenuData(nodes);
      return menu.length > 0 ? menu : undefined;
    } catch (error) {
      console.error('getPermContext failed:', error);
      return undefined;
    }
  };

  if (devBypassAuth) {
    const currentUser = getDevUser();
    const permContextMenu = await fetchPermMenu(TEMP_BUSINESS_CODE);
    return {
      fetchUserInfo: async () => currentUser,
      currentUser,
      permContextMenu,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }

  const fetchUserInfo = async () => {
    const cachedUser = getLoginUserInfo<API.CurrentUser>();
    if (cachedUser && (cachedUser as any)?.name) {
      return cachedUser;
    }
    return undefined;
  };

  const { location } = history;
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
    const hasToken = !!getToken();
    const selectedOrgCode = getSelectedOrgCode() || undefined;
    if (hasToken && !selectedOrgCode) {
      // 如果有 token 但没有选择身份，无论是否在 character 页面都提前返回
      // 不调用 getPermContext，等用户选择身份后再调用
      if (location.pathname !== '/user/character') {
        const redirect = `${location.pathname}${location.search || ''}`;
        setPostLoginRedirect(redirect);
        history.replace({
          pathname: '/user/character',
          search: new URLSearchParams({ redirect }).toString(),
        });
      }
      return {
        fetchUserInfo,
        settings: defaultSettings as Partial<LayoutSettings>,
      };
    }

    const currentUser = await fetchUserInfo();

    // 从 localStorage 读取业态数据
    const businessList = getBusinessList<any[]>() || [];
    let currentBusinessCode = getCurrentBusinessCode() || undefined;

    // 验证并获取有效的业态代码
    currentBusinessCode = getValidBusinessCode(
      currentBusinessCode,
      businessList,
    );

    // 如果业态代码发生变化，更新到 localStorage
    if (currentBusinessCode !== getCurrentBusinessCode()) {
      setCurrentBusinessCode(currentBusinessCode);
    }

    // 使用 currentBusinessCode 调用 getPermContext
    const permContextMenu = await fetchPermMenu(currentBusinessCode);

    return {
      fetchUserInfo,
      currentUser,
      currentOrgCode: selectedOrgCode,
      businessList,
      currentBusinessCode,
      permContextMenu,
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
  syncBlackModeClass((initialState?.settings as any)?.navTheme);

  if (typeof window !== 'undefined') {
    (window as any).g_initialState = initialState;
  }
  return {
    menuDataRender: (menuData) => {
      const dashboardFromRoutes = (menuData || []).find(
        (item) => item?.path === '/dashboard',
      );

      // 如果有接口返回的菜单：严格只展示「工作台 + 权限菜单」，不混入 routes 的默认菜单
      if (
        initialState?.permContextMenu &&
        initialState.permContextMenu.length > 0
      ) {
        const dashboardMenu: MenuDataItem = {
          name: '工作台',
          path: '/dashboard',
          children: dashboardFromRoutes?.children,
        } as any;
        const visiblePermContextMenu = initialState.permContextMenu.filter(
          (item) => {
            const path = String(item?.path || '');
            return path !== '/dashboard' && path !== '/dashboard/index';
          },
        );
        return [dashboardMenu, ...visiblePermContextMenu];
      }

      // 无权限菜单数据时：仅展示工作台（隐藏顶部全量 tabs）
      const dashboardMenu: MenuDataItem = {
        name: '工作台',
        path: '/dashboard',
        children: dashboardFromRoutes?.children,
      } as any;
      return [dashboardMenu];
    },
    menu: {
      locale: false,
      defaultOpenAll: true,
      autoClose: false,
    },
    menuItemRender: (item, dom) => {
      return (
        <div
          style={{ cursor: 'pointer', width: '100%', height: '100%' }}
          onClickCapture={() => {
            const path = item.path ? String(item.path) : '';
            if (!path) return;

            if (isIframeRoutePath(path)) {
              const nextUrl = buildIframeRouteWithParams(
                path,
                initialState?.permContextMenu,
                (item as any)?.targetId,
              );
              history.push(nextUrl);
              return;
            }

            history.push(path);
          }}
        >
          {dom}
        </div>
      );
    },
    collapsedButtonRender: false,
    headerTitleRender: (_logo, _title, _) => {
      // 获取业态列表和当前选中的业态
      const businessList = initialState?.businessList || [];
      const currentBusinessCode = initialState?.currentBusinessCode;

      // 找到当前选中的业态
      const currentBusiness =
        businessList.find((b: any) => b.businessCode === currentBusinessCode) ||
        businessList[0];

      // 切换业态的处理函数
      const handleBusinessChange = async (businessCode: string) => {
        // 如果选择的是当前业态，不做任何操作
        if (businessCode === currentBusinessCode) {
          return;
        }

        try {
          // 使用新的 businessCode 调用 getPermContext
          const permRes = await getPermContext(businessCode);
          const permNodes = extractPermContextNodes(permRes);
          const permContextMenu = mapPermContextToMenuData(permNodes);

          // 保存到 localStorage
          setCurrentBusinessCode(businessCode);

          // 更新 initialState
          setInitialState((s: any) => {
            const next = {
              ...s,
              currentBusinessCode: businessCode,
              permContextMenu:
                permContextMenu.length > 0 ? permContextMenu : undefined,
            };
            if (typeof window !== 'undefined') {
              (window as any).g_initialState = next;
            }
            return next;
          });

          // 检查当前页面是否还有权限
          const currentPath = history.location.pathname;
          const allowedPaths = getAllowedTopPaths(
            permContextMenu.length > 0 ? permContextMenu : undefined,
          );
          const moduleRoot = `/${String(currentPath || '').split('/')[1] || ''}`;
          const isIframeModule = IFRAME_PATHS.some((p) => moduleRoot === p);

          if (isIframeModule && !allowedPaths.has(moduleRoot)) {
            // 如果当前页面在新业态下没有权限，跳转到工作台
            history.replace(
              buildIframeRouteWithParams('/dashboard/index', permContextMenu),
            );
            message.success('切换业态成功，已跳转到工作台');
          } else {
            message.success('切换业态成功');
          }
        } catch (error) {
          console.error('getPermContext failed:', error);
          message.error('切换业态失败，请稍后重试');
        }
      };

      // 构建下拉菜单项
      const menuItems = businessList.map((business: any) => ({
        key: business.businessCode,
        label: business.businessName,
      }));

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 208,
            boxSizing: 'border-box',
          }}
        >
          <img
            src={logoDark}
            alt="logo"
            style={{ height: 48, display: 'block' }}
          />
          {businessList.length > 0 && (
            <Dropdown
              menu={{
                items: menuItems,
                selectedKeys: [currentBusinessCode || ''],
                onClick: ({ key }) => handleBusinessChange(key),
              }}
              trigger={['click']}
              placement="bottomLeft"
              overlayStyle={{
                minWidth: 200,
              }}
            >
              <Button
                type="text"
                size="small"
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '4px 8px',
                  fontSize: 16,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {currentBusiness?.businessName || '请选择业态'}
                <DownOutlined style={{ marginLeft: 4, fontSize: 10 }} />
              </Button>
            </Dropdown>
          )}
        </div>
      );
    },
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
              const nextNavTheme = nextChecked ? 'realDark' : 'light';
              markThemeSwitching();
              setInitialState((preInitialState) => ({
                ...preInitialState,
                settings: {
                  ...(preInitialState?.settings || {}),
                  navTheme: nextNavTheme,
                } as Partial<LayoutSettings>,
              }));
            }}
          />
        </Tooltip>,
        <NoticeBell key="notice" />,
      ];
    },
    menuRender: (
      _menuProps: {
        menuData?: MenuDataItem[];
        location?: { pathname?: string };
      },
      defaultDom,
    ) => {
      return defaultDom;
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
      src: (initialState?.currentUser?.avatar || undefined) as any,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        const clearWorkplaceCache = () => {
          try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i += 1) {
              const k = localStorage.key(i);
              if (!k) continue;
              if (k.startsWith('workplace_common_actions_')) keys.push(k);
              if (
                k.includes('workplace_common_actions_') &&
                k.endsWith('__groupOrder')
              )
                keys.push(k);
            }
            keys.forEach((k) => {
              try {
                localStorage.removeItem(k);
              } catch {
                // ignore
              }
            });
          } catch {
            // ignore
          }
        };

        // 退出登录处理函数
        const handleLogout = async () => {
          if (logoutInFlight) {
            await logoutInFlight;
            return;
          }

          const doLogout = async () => {
            const hasToken = !!getToken();
            let logoutApiFailed = false;

            try {
              if (hasToken) {
                await requestLogout({
                  skipErrorHandler: true,
                });
              }
            } catch (error) {
              logoutApiFailed = true;
              console.error('requestLogout failed:', error);
            } finally {
              clearLoginUserInfo();
              clearLoginOrgList();
              clearSelectedOrgCode();
              clearBusinessList();
              clearCurrentBusinessCode();
              clearToken();
              clearPostLoginRedirect();
              clearWorkplaceCache();

              setInitialState((s) => {
                const next = {
                  ...(s || {}),
                  currentUser: undefined,
                  currentOrgCode: undefined,
                  permContextMenu: undefined,
                  businessList: undefined,
                  currentBusinessCode: undefined,
                };
                if (typeof window !== 'undefined') {
                  (window as any).g_initialState = next;
                }
                return next;
              });

              if (history.location.pathname !== loginPath) {
                history.replace(loginPath);
              }
              if (logoutApiFailed) {
                message.warning('退出接口调用失败，已清理本地登录态');
              } else {
                message.success('已退出登录');
              }
            }
          };

          logoutInFlight = doLogout();
          try {
            await logoutInFlight;
          } finally {
            logoutInFlight = null;
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
        const redirect = `${location.pathname}${location.search || ''}`;
        redirectToLogin(redirect);
        return;
      }

      const orgCode = getSelectedOrgCode();
      if (
        hasToken &&
        !orgCode &&
        location.pathname !== '/user/character' &&
        location.pathname !== loginPath
      ) {
        const redirect = `${location.pathname}${location.search || ''}`;
        setPostLoginRedirect(redirect);
        history.push({
          pathname: '/user/character',
          search: new URLSearchParams({ redirect }).toString(),
        });
        return;
      }

      const allowedTopPaths = getAllowedTopPaths(initialState?.permContextMenu);
      const pathname = location.pathname;
      const isDashboard =
        pathname === '/dashboard' || pathname.startsWith('/dashboard/');
      if (isDashboard) return;

      const moduleRoot = `/${String(pathname || '').split('/')[1] || ''}`;
      const isIframeModule = IFRAME_PATHS.some((p) => moduleRoot === p);
      if (isIframeModule && !allowedTopPaths.has(moduleRoot)) {
        history.replace(
          buildIframeRouteWithParams(
            '/dashboard/index',
            initialState?.permContextMenu,
          ),
        );
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
                markThemeSwitching();
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
