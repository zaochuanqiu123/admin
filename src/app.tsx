import { DownOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';

import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';

import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Avatar, Button, Dropdown, Modal, message, Tooltip } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { NoticeBell } from '@/components';
import HeaderIdentityDropdown from '@/components/HeaderIdentityDropdown';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';
import { logout as requestLogout } from '@/api/auth';
import { getPermContext, getUserLoginContext } from '@/api/context';
import {
  clearBusinessList,
  clearCurrentBusinessCode,
  clearLoginOrgList,
  clearLoginUserInfo,
  clearRouteTabs,
  clearSelectedOrgCode,
  clearToken,
  emitRouteTabsResetEvent,
  getBusinessList,
  getCurrentBusinessCode,
  getLoginUserInfo,
  getSelectedOrgCode,
  getToken,
  setCurrentBusinessCode,
} from '@/api/storage';
import logoDark from '@/assets/logo-dark.png';
import DashboardHomeSplitMenu from '@/components/Layout/DashboardHomeSplitMenu';
import OtherMenusSplitMenu from '@/components/Layout/OtherMenusSplitMenu';
import RouteTabsKeepAlive from '@/components/Layout/RouteTabsKeepAlive';
import WorkplaceCommonMenu from '@/components/Workplace/WorkplaceCommonMenu';
import { DEFAULT_COMMON_ACTIONS } from '@/config/menu.config';
import {
  clearPostLoginRedirect,
  redirectToLogin,
  setPostLoginRedirect,
} from '@/utils/auth-expired';
import {
  readCommonActionsFromStorage,
  writeCommonActionsToStorage,
} from '@/utils/commonActions.storage';
import { buildIframeRouteWithParams } from '@/utils/iframe';
import {
  extractPermContextNodes,
  extractButtonPermissionMap,
  findFirstLeafMenuTarget,
  findPathByTargetId,
  getValidBusinessCode,
  mapPermContextToMenuData,
  TEMP_BUSINESS_CODE,
} from '@/utils/menu';
import {
  clearWorkplaceCommonActionsCache,
  resetStoreScopedInitialState,
} from '@/utils/store-switch';

const isDev = process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/user/login';
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;
const HEADER_USER_AVATAR_SRC =
  'https://api.dicebear.com/7.x/miniavs/svg?seed=antd-yangkun';
let logoutInFlight: Promise<void> | null = null;

const apiBase = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : undefined;
const NAV_THEME_STORAGE_KEY = 'pc_admin_nav_theme';

if (isDev && typeof window !== 'undefined') {
  (window as any).__DEV_BYPASS_AUTH__ = devBypassAuth;
  (window as any).__API_BASE__ = apiBase;
}

function readPersistedNavTheme(): 'light' | 'realDark' | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const theme = localStorage.getItem(NAV_THEME_STORAGE_KEY);
    if (theme === 'light' || theme === 'realDark') return theme;
  } catch (error) {
    console.warn('read persisted navTheme failed:', error);
  }
  return undefined;
}

function persistNavTheme(navTheme: string | undefined) {
  if (typeof window === 'undefined') return;
  const normalizedTheme =
    navTheme === 'realDark' ? 'realDark' : navTheme === 'light' ? 'light' : '';
  if (!normalizedTheme) return;
  try {
    localStorage.setItem(NAV_THEME_STORAGE_KEY, normalizedTheme);
  } catch (error) {
    console.warn('persist navTheme failed:', error);
  }
}

function getResolvedLayoutSettings(): Partial<LayoutSettings> {
  const navTheme = readPersistedNavTheme();
  if (!navTheme) return defaultSettings as Partial<LayoutSettings>;
  return {
    ...(defaultSettings as Partial<LayoutSettings>),
    navTheme,
  };
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

function normalizePathname(pathname: string | undefined): string {
  const value =
    String(pathname || '')
      .split('?')[0]
      ?.split('#')[0] || '';
  if (!value) return '/';
  if (value === '/') return '/';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function stripIframeQueryParams(path: string): string {
  const [pathname, query = ''] = String(path || '').split('?');
  if (!query) return pathname;

  const searchParams = new URLSearchParams(query);
  searchParams.delete('targetId');
  searchParams.delete('token');

  const nextQuery = searchParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function getTargetIdFromSearch(search: string | undefined): string | undefined {
  const rawSearch = String(search || '');
  if (!rawSearch) return undefined;
  const value = new URLSearchParams(
    rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch,
  ).get('targetId');
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function hasLegacyIframeAccess(
  menuData: MenuDataItem[] | undefined,
  search: string | undefined,
): boolean {
  const targetId = getTargetIdFromSearch(search);
  if (!targetId) return false;
  return !!findPathByTargetId(menuData, targetId);
}

function isDashboardRoute(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return normalized === '/dashboard' || normalized.startsWith('/dashboard/');
}

function isWorkplaceMenuItem(item: MenuDataItem | undefined): boolean {
  const normalizedPath = normalizePathname(
    item?.path ? String(item.path) : undefined,
  );
  if (normalizedPath === '/dashboard') return true;

  const menuName = typeof item?.name === 'string' ? item.name.trim() : '';
  return menuName === '工作台';
}

class DashboardHomeMenuBoundary extends Component<
  {
    fallback: ReactNode;
    children: ReactNode;
  },
  {
    hasError: boolean;
  }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DashboardHomeSplitMenu render failed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loginContext?: any;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
  currentOrgCode?: string;
  permContextMenu?: MenuDataItem[];
  buttonPermissions?: API.ButtonPermissionMap;
  businessList?: any[];
  currentBusinessCode?: string;
  commonActions?: any[];
  setCommonActions?: (actions: any[]) => void;
}> {
  const fetchPermState = async (businessCode?: string) => {
    try {
      const res = await getPermContext(businessCode);
      const nodes = extractPermContextNodes(res);
      const menu = mapPermContextToMenuData(nodes);
      const buttonPermissions = extractButtonPermissionMap(res);
      return {
        permContextMenu: menu.length > 0 ? menu : undefined,
        buttonPermissions:
          buttonPermissions.length > 0 ? buttonPermissions : undefined,
      };
    } catch (error) {
      console.error('getPermContext failed:', error);
      return {
        permContextMenu: undefined,
        buttonPermissions: undefined,
      };
    }
  };
  const resolvedSettings = getResolvedLayoutSettings();

  if (devBypassAuth) {
    const currentUser = getDevUser();
    const { permContextMenu, buttonPermissions } = await fetchPermState(
      TEMP_BUSINESS_CODE,
    );
    return {
      fetchUserInfo: async () => currentUser,
      currentUser,
      permContextMenu,
      buttonPermissions,
      settings: resolvedSettings,
    };
  }

  const fetchUserInfo = async () => {
    const cachedUser = getLoginUserInfo<
      API.CurrentUser & Record<string, any>
    >();
    let mergedUser = cachedUser ? { ...cachedUser } : undefined;

    try {
      const rawAuthUser = localStorage.getItem('auth_current_user');
      if (rawAuthUser) {
        const authUser = JSON.parse(rawAuthUser) as Record<string, any>;
        mergedUser = {
          ...(authUser || {}),
          ...(mergedUser || {}),
          name:
            mergedUser?.name ||
            authUser?.name ||
            authUser?.userName ||
            authUser?.nickName,
          nickName:
            mergedUser?.nickName ||
            authUser?.nickName ||
            authUser?.nickname ||
            authUser?.name,
          account:
            mergedUser?.account ||
            mergedUser?.loginName ||
            authUser?.account ||
            authUser?.loginName ||
            authUser?.userName,
          avatar:
            mergedUser?.avatar ||
            authUser?.avatar ||
            authUser?.headImg ||
            authUser?.avatarUrl,
        };
      }
    } catch {
      // ignore cache parse errors
    }

    if (mergedUser && (mergedUser as any)?.name) {
      return mergedUser as API.CurrentUser;
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
    if (!hasToken) {
      return {
        fetchUserInfo,
        settings: resolvedSettings,
      };
    }
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
        settings: resolvedSettings,
      };
    }

    const currentUser = await fetchUserInfo();

    let loginContext: any;
    try {
      loginContext = await getUserLoginContext(selectedOrgCode!);
    } catch (error) {
      console.error('getUserLoginContext failed:', error);
    }

    // 优先使用登录上下文里的业态数据，避免切换门店后头部昵称不同步
    const businessList =
      (Array.isArray(loginContext?.businessList)
        ? loginContext.businessList
        : undefined) ||
      getBusinessList<any[]>() ||
      [];
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
    const { permContextMenu, buttonPermissions } = await fetchPermState(
      currentBusinessCode,
    );

    return {
      fetchUserInfo,
      currentUser,
      loginContext,
      currentOrgCode: selectedOrgCode,
      businessList,
      currentBusinessCode,
      permContextMenu,
      buttonPermissions,
      settings: resolvedSettings,
    };
  }
  return {
    fetchUserInfo,
    settings: resolvedSettings,
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

  // 常用数据管理
  const storageKey = `workplace_common_actions_${
    initialState?.currentUser?.name ?? 'guest'
  }`;

  const loadCommonActions = () => {
    if (typeof window === 'undefined') return DEFAULT_COMMON_ACTIONS;
    const stored = readCommonActionsFromStorage(storageKey);
    return stored || DEFAULT_COMMON_ACTIONS;
  };

  const saveCommonActions = (actions: any[]) => {
    if (typeof window === 'undefined') return;
    writeCommonActionsToStorage(storageKey, actions);
    setInitialState((s: any) => ({
      ...s,
      commonActions: actions,
    }));
  };

  // 初始化常用数据
  if (!initialState?.commonActions) {
    const actions = loadCommonActions();
    setInitialState((s: any) => ({
      ...s,
      commonActions: actions,
      setCommonActions: saveCommonActions,
    }));
  }

  const buildTopMenus = (
    menuData: MenuDataItem[] | undefined,
  ): MenuDataItem[] => {
    const dashboardFromRoutes = (menuData || []).find(
      (item) => item?.path === '/dashboard',
    );

    const dashboardMenu: MenuDataItem = {
      name: '工作台',
      path: '/dashboard',
      children: dashboardFromRoutes?.children,
    } as any;

    if (
      initialState?.permContextMenu &&
      initialState.permContextMenu.length > 0
    ) {
      const visiblePermContextMenu = initialState.permContextMenu.filter(
        (item) => {
          const path = String(item?.path || '');
          return path !== '/dashboard' && path !== '/dashboard/index';
        },
      );
      return [dashboardMenu, ...visiblePermContextMenu];
    }

    return [dashboardMenu];
  };

  const navigateMenu = (
    path: string | undefined,
    targetId?: string,
    sourceSystem?: number,
  ) => {
    const targetPath = String(path || '').trim();
    if (!targetPath) return;

    if (sourceSystem === 1 || (sourceSystem === undefined && targetId)) {
      const nextUrl = buildIframeRouteWithParams(targetPath, targetId);
      history.push(nextUrl);
      return;
    }

    history.push(stripIframeQueryParams(targetPath));
  };

  return {
    menuDataRender: (menuData) => {
      return buildTopMenus(menuData);
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
            const clickedItem = item as MenuDataItem & {
              targetId?: string;
              sourceSystem?: number;
            };
            const fallbackPath = clickedItem?.path
              ? String(clickedItem.path)
              : undefined;
            const rawTargetId = clickedItem?.targetId;
            const fallbackTargetId =
              rawTargetId === undefined || rawTargetId === null
                ? undefined
                : String(rawTargetId);
            const fallbackSourceSystem = Number(clickedItem?.sourceSystem);
            const firstLeafTarget = findFirstLeafMenuTarget(
              clickedItem,
              fallbackPath,
              fallbackTargetId,
              Number.isFinite(fallbackSourceSystem)
                ? fallbackSourceSystem
                : undefined,
            );
            const nextTarget = isWorkplaceMenuItem(clickedItem)
              ? {
                  path: fallbackPath,
                  targetId: fallbackTargetId,
                  sourceSystem: Number.isFinite(fallbackSourceSystem)
                    ? fallbackSourceSystem
                    : undefined,
                }
              : firstLeafTarget?.path
                ? firstLeafTarget
                : fallbackPath
                  ? {
                      path: fallbackPath,
                      targetId: fallbackTargetId,
                      sourceSystem: Number.isFinite(fallbackSourceSystem)
                        ? fallbackSourceSystem
                        : undefined,
                    }
                  : undefined;

            if (!nextTarget?.path) return;

            navigateMenu(
              nextTarget.path,
              nextTarget.targetId,
              nextTarget.sourceSystem,
            );
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
          const buttonPermissions = extractButtonPermissionMap(permRes);

          // 保存到 localStorage
          setCurrentBusinessCode(businessCode);

          // 更新 initialState
          setInitialState((s: any) => {
            const next = {
              ...s,
              currentBusinessCode: businessCode,
              permContextMenu:
                permContextMenu.length > 0 ? permContextMenu : undefined,
              buttonPermissions:
                buttonPermissions.length > 0 ? buttonPermissions : undefined,
            };
            if (typeof window !== 'undefined') {
              (window as any).g_initialState = next;
            }
            return next;
          });

          // 清理旧业态的 tabs 和 KeepAlive 缓存
          clearRouteTabs();
          emitRouteTabsResetEvent();

          // 检查当前页面是否还有权限
          const currentTargetId = getTargetIdFromSearch(
            history.location.search,
          );

          if (
            currentTargetId &&
            !hasLegacyIframeAccess(
              permContextMenu.length > 0 ? permContextMenu : undefined,
              history.location.search,
            )
          ) {
            // 如果当前页面在新业态下没有权限，跳转到工作台
            history.replace(buildIframeRouteWithParams('/dashboard/index'));
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
            width: 218,
            height: 60,
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
              overlayClassName="business-switch-menu"
              overlayStyle={{
                minWidth: 200,
              }}
            >
              <Button
                type="text"
                size="small"
                className="business-switch-pill"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <span className="business-switch-pill__label">
                  {currentBusiness?.businessName || '请选择业态'}
                </span>
                <DownOutlined className="business-switch-pill__icon" />
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
          <Button
            type="text"
            shape="circle"
            className="pc-admin-header-circle-action"
            icon={checked ? <MoonOutlined /> : <SunOutlined />}
            aria-label={checked ? '切换亮色模式' : '切换暗黑模式'}
            onClick={() => {
              const nextNavTheme = checked ? 'light' : 'realDark';
              markThemeSwitching();
              persistNavTheme(nextNavTheme);
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
      const currentTargetId = getTargetIdFromSearch(history.location.search);
      const isInDashboard = isDashboardRoute(pathname);
      const topMenus = buildTopMenus(menuProps?.menuData);
      const useSplitMenu = topMenus.length > 0;
      const menuScopeKey = `${initialState?.currentOrgCode || 'no-org'}::${
        initialState?.currentBusinessCode || 'no-business'
      }`;

      if (!isInDashboard) {
        if (useSplitMenu) {
          return (
            <div className="plain-sider-menu plain-sider-menu-split">
              <div className="plain-sider-split-content">
                <DashboardHomeMenuBoundary fallback={defaultDom}>
                  <OtherMenusSplitMenu
                    key={`other-split-${menuScopeKey}`}
                    topMenus={topMenus}
                    pathname={pathname}
                    currentTargetId={currentTargetId}
                    onNavigate={navigateMenu}
                  />
                </DashboardHomeMenuBoundary>
              </div>
            </div>
          );
        }
        return (
          <div className="plain-sider-menu">
            <div className="plain-sider-menu-content">{defaultDom}</div>
          </div>
        );
      }

      const storageKey = `workplace_common_actions_${
        initialState?.currentUser?.name ?? 'guest'
      }`;

      const commonActions = initialState?.commonActions || [];
      const setCommonActions = initialState?.setCommonActions || (() => {});

      return (
        <div className="dashboard-sider">
          <div className="dashboard-sider-common">
            <WorkplaceCommonMenu
              key={`workplace-common-${menuScopeKey}`}
              storageKey={storageKey}
              commonActions={commonActions}
              setCommonActions={setCommonActions}
            />
          </div>

          <div
            className={`dashboard-sider-menu${useSplitMenu ? ' dashboard-sider-menu-split' : ''}`}
          >
            <div
              className={`dashboard-sider-menu-content${useSplitMenu ? ' dashboard-sider-menu-content-split' : ''}`}
            >
              {useSplitMenu ? (
                <DashboardHomeMenuBoundary fallback={defaultDom}>
                  <DashboardHomeSplitMenu
                    key={`dashboard-split-${menuScopeKey}`}
                    topMenus={topMenus}
                    pathname={pathname}
                    currentTargetId={currentTargetId}
                    onNavigate={navigateMenu}
                    commonActions={commonActions}
                  />
                </DashboardHomeMenuBoundary>
              ) : (
                defaultDom
              )}
            </div>
          </div>
        </div>
      );
    },
    headerContentRender: () => {
      return (
        <div
          id="pc-admin-header-route-tabs-slot"
          className="pc-admin-header-route-tabs-slot"
        />
      );
    },

    avatarProps: {
      src: HEADER_USER_AVATAR_SRC,
      title: undefined,
      render: () => {
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
              clearRouteTabs();
              clearPostLoginRedirect();
              clearWorkplaceCommonActionsCache();

              setInitialState((s) =>
                resetStoreScopedInitialState({
                  ...(s || {}),
                  currentUser: undefined,
                }),
              );

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

        return (
          <HeaderIdentityDropdown
            currentOrgCode={initialState?.currentOrgCode}
            currentUser={initialState?.currentUser}
            loginContext={(initialState as any)?.loginContext}
            onLogout={handleLogout}
            setInitialState={setInitialState as any}
          />
        );
      },
    },
    waterMarkProps: {
      content: initialState?.currentUser?.name,
    },
    onPageChange: () => {
      if (devBypassAuth) return;
      const { location } = history;
      if (location.pathname === loginPath) {
        Modal.destroyAll();
        return;
      }

      const hasToken = !!getToken();
      if (!hasToken) {
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

      const pathname = location.pathname;
      const isDashboard =
        pathname === '/dashboard' || pathname.startsWith('/dashboard/');
      if (isDashboard) return;

      if (
        getTargetIdFromSearch(location.search) &&
        !hasLegacyIframeAccess(initialState?.permContextMenu, location.search)
      ) {
        history.replace(buildIframeRouteWithParams('/dashboard/index'));
      }
    },

    menuHeaderRender: undefined,
    childrenRender: (children) => {
      const keepAliveThemeKey = `${
        (initialState?.settings as any)?.navTheme || 'light'
      }::${(initialState?.settings as any)?.colorPrimary || ''}`;

      return (
        <>
          <RouteTabsKeepAlive
            key={initialState?.currentOrgCode || 'no-org'}
            themeCacheKey={keepAliveThemeKey}
            menuData={initialState?.permContextMenu}
          >
            {children}
          </RouteTabsKeepAlive>
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                markThemeSwitching();
                persistNavTheme((settings as any)?.navTheme);
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
