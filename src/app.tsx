import { MoonOutlined, SunOutlined } from '@ant-design/icons';

import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';

import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Button, Modal, message, Tooltip } from 'antd';
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
  getLoginUserInfo,
  getSelectedOrgCode,
  getToken,
} from '@/api/storage';
import { getUserInfo as fetchUserInfoFromApi } from '@/api/user';
import logoDark from '@/assets/logo-dark.png';
import DashboardHomeSplitMenu from '@/components/Layout/DashboardHomeSplitMenu';
import OtherMenusSplitMenu from '@/components/Layout/OtherMenusSplitMenu';
import RouteTabsKeepAlive from '@/components/Layout/RouteTabsKeepAlive';
import WorkplaceCommonMenu from '@/components/Workplace/WorkplaceCommonMenu';
import {
  type CommonAction,
  filterHomepageCommonActions,
} from '@/config/menu.config';
import {
  clearPostLoginRedirect,
  redirectToLogin,
  setPostLoginRedirect,
} from '@/utils/auth-expired';
import {
  readCommonActionsFromStorage,
  writeCommonActionsToStorage,
} from '@/utils/commonActions.storage';
import {
  getCurrentIdentityItem,
  getIdentityItemsFromStorage,
} from '@/utils/identity';
import { buildIframeRouteWithParams } from '@/utils/iframe';
import {
  extractButtonPermissionMap,
  extractPermContextNodes,
  findFirstLeafMenuTarget,
  findPathByTargetId,
  mapPermContextToMenuData,
} from '@/utils/menu';
import {
  clearStoreScopedStorage,
  clearWorkplaceCommonActionsCache,
  resetStoreScopedInitialState,
} from '@/utils/store-switch';

const isDev = process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/user/login';
const DASHBOARD_HOME_TITLE = '首页';
const DEFAULT_IDENTITY_COMMON_ACTION_COUNT = 6;
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;
const HEADER_USER_AVATAR_SRC =
  'https://api.dicebear.com/7.x/miniavs/svg?seed=antd-yangkun';
let logoutInFlight: Promise<void> | null = null;

const apiBase = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : undefined;
const NAV_THEME_STORAGE_KEY = 'pc_admin_nav_theme';

function getHeaderPlatformLabel(currentOrgCode?: string) {
  const identity = getCurrentIdentityItem(
    currentOrgCode,
    getIdentityItemsFromStorage(),
  );
  const identityText = [
    identity?.levelName,
    identity?.groupLabel,
    identity?.name,
  ]
    .filter(Boolean)
    .join(' ');
  const upperText = identityText.toUpperCase();
  const isMerchant =
    identityText.includes('商户') ||
    identityText.includes('公司') ||
    upperText.includes('MER');
  return isMerchant ? '商户平台' : '门店平台';
}

function normalizeCommonStorageSegment(value: unknown) {
  return (
    String(value ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9:_/-]/g, '_') || 'unknown'
  );
}

function buildCommonActionStorageKey(
  initialState: Record<string, any> | undefined,
) {
  const currentIdentity = getCurrentIdentityItem(
    initialState?.currentOrgCode,
    getIdentityItemsFromStorage(),
  );
  const userKey = normalizeCommonStorageSegment(
    initialState?.currentUser?.name,
  );
  const identityKey = normalizeCommonStorageSegment(
    currentIdentity
      ? [
          currentIdentity.groupKey,
          currentIdentity.levelName,
          currentIdentity.orgCode,
          currentIdentity.id,
        ]
          .filter(Boolean)
          .join('_')
      : initialState?.currentOrgCode || 'no-org',
  );

  return `workplace_common_actions_${userKey}_${identityKey}`;
}

function getCommonMenuNodeTitle(node: any, fallback: string) {
  const rawTitle =
    node?.name ??
    node?.title ??
    node?.label ??
    node?.menuName ??
    node?.permName;
  const title =
    typeof rawTitle === 'string' || typeof rawTitle === 'number'
      ? String(rawTitle).trim()
      : '';
  return title || fallback;
}

function getCommonMenuNodePath(node: any, inheritedPath?: string) {
  const rawPath = typeof node?.path === 'string' ? node.path.trim() : '';
  return rawPath || inheritedPath || '';
}

function getCommonMenuNodeTargetId(node: any) {
  const rawTargetId = node?.targetId;
  if (rawTargetId === undefined || rawTargetId === null) return undefined;
  const targetId = String(rawTargetId).trim();
  return targetId || undefined;
}

function getCommonMenuNodeSourceSystem(node: any) {
  const sourceSystem = Number(node?.sourceSystem);
  return Number.isFinite(sourceSystem) ? sourceSystem : undefined;
}

function normalizeCommonActionPath(path?: string) {
  const rawPath = typeof path === 'string' ? path.trim() : '';
  if (!rawPath) return '';
  const pathname = rawPath.split(/[?#]/)[0] || '';
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function buildCommonPermissionKey(action: CommonAction) {
  return [
    action.title.trim(),
    action.sourceSystem ?? '',
    action.targetId ?? '',
    normalizeCommonActionPath(action.path),
  ].join('::');
}

function buildCommonActionIdFromMenuNode(
  node: any,
  path: string,
  title: string,
  fallback: string,
) {
  return normalizeCommonStorageSegment(
    [
      path,
      getCommonMenuNodeTargetId(node),
      node?.key,
      node?.id,
      node?.menuId,
      node?.permId,
      title,
      fallback,
    ]
      .filter((item) => item !== undefined && item !== null && item !== '')
      .map((item) => String(item))
      .join('__'),
  );
}

function collectDefaultCommonActionsFromMenu(
  menuData: MenuDataItem[] | undefined,
  limit?: number,
): CommonAction[] {
  const result: CommonAction[] = [];
  const visit = (nodes: any[] | undefined, inheritedPath?: string) => {
    if (!Array.isArray(nodes) || (limit && result.length >= limit)) return;

    nodes.forEach((node, index) => {
      if (!node || node?.hideInMenu || (limit && result.length >= limit)) {
        return;
      }

      const title = getCommonMenuNodeTitle(node, `菜单${index + 1}`);
      const path = getCommonMenuNodePath(node, inheritedPath);
      const children = Array.isArray(node?.children) ? node.children : [];

      if (children.length > 0) {
        visit(children, path);
        return;
      }

      if (!path) return;
      result.push({
        id: buildCommonActionIdFromMenuNode(
          node,
          path,
          title,
          `common-${index}`,
        ),
        title,
        path,
        targetId: getCommonMenuNodeTargetId(node),
        sourceSystem: getCommonMenuNodeSourceSystem(node),
      });
    });
  };

  visit(menuData as any[]);
  return filterHomepageCommonActions(result);
}

function filterCommonActionsByPermissionTree(
  actions: CommonAction[],
  permissionActions: CommonAction[],
) {
  const allowedKeys = new Set(
    permissionActions.map((action) => buildCommonPermissionKey(action)),
  );
  if (allowedKeys.size === 0) return [];
  return filterHomepageCommonActions(actions).filter((action) =>
    allowedKeys.has(buildCommonPermissionKey(action)),
  );
}

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

function isExternalUrl(path: string): boolean {
  return /^(https?:)?\/\//i.test(String(path || '').trim());
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

function isDashboardHomeMenuItem(item: MenuDataItem | undefined): boolean {
  const normalizedPath = normalizePathname(
    item?.path ? String(item.path) : undefined,
  );
  if (normalizedPath === '/dashboard' || normalizedPath === '/dashboard/index')
    return true;

  const menuName = typeof item?.name === 'string' ? item.name.trim() : '';
  return menuName === DASHBOARD_HOME_TITLE;
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
  commonActions?: any[];
  setCommonActions?: (actions: any[]) => void;
}> {
  const fetchPermState = async () => {
    try {
      const res = await getPermContext();
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
    const { permContextMenu, buttonPermissions } = await fetchPermState();
    return {
      fetchUserInfo: async () => currentUser,
      currentUser,
      permContextMenu,
      buttonPermissions,
      settings: resolvedSettings,
    };
  }

  const fetchUserInfo = async () => {
    // 优先走接口获取最新用户信息
    try {
      const apiUser = await fetchUserInfoFromApi({ skipErrorHandler: true });
      if (apiUser && (apiUser.nickName || apiUser.name || apiUser.account)) {
        return {
          userid: apiUser.account,
          // 展示名字优先使用 nickName（昵称），兜底 name
          name: apiUser.nickName || apiUser.name,
          nickName: apiUser.nickName || apiUser.name,
          account: apiUser.account,
          avatar: apiUser.avatarUrl || apiUser.avatar,
          phone: apiUser.phone,
        } as API.CurrentUser;
      }
    } catch (_e) {
      // 接口失败，回退到本地缓存
    }

    // 回退：从本地缓存读取
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
    } catch (_e) {
      // ignore cache parse errors
    }

    if (mergedUser && (mergedUser as any)?.name) {
      return mergedUser as API.CurrentUser;
    }
    return undefined;
  };

  const { location } = history;
  if (location.pathname !== loginPath) {
    const hasToken = !!getToken();
    if (!hasToken) {
      return {
        fetchUserInfo,
        settings: resolvedSettings,
      };
    }
    const selectedOrgCode = getSelectedOrgCode();
    if (!selectedOrgCode) {
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

    // 1. 登录上下文
    let loginContext: any;
    try {
      loginContext = await getUserLoginContext(selectedOrgCode);
    } catch (error) {
      console.error('getUserLoginContext failed:', error);
      if ((error as any)?.info?.authHandled) {
        return {
          fetchUserInfo,
          settings: resolvedSettings,
        };
      }

      clearStoreScopedStorage();
      const redirect = `${location.pathname}${location.search || ''}`;
      if (location.pathname !== '/user/character') {
        setPostLoginRedirect(redirect);
        history.replace({
          pathname: '/user/character',
          search: new URLSearchParams({ redirect }).toString(),
        });
      }
      message.error('登录上下文获取失败，请重新选择身份或稍后重试');
      return {
        fetchUserInfo,
        settings: resolvedSettings,
      };
    }

    // 2. 权限上下文
    const { permContextMenu, buttonPermissions } = await fetchPermState();

    // 3. 最后获取用户基本信息
    const currentUser = await fetchUserInfo();

    return {
      fetchUserInfo,
      currentUser,
      loginContext,
      currentOrgCode: selectedOrgCode,
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
  const storageKey = buildCommonActionStorageKey(initialState);
  const permissionCommonActions = collectDefaultCommonActionsFromMenu(
    initialState?.permContextMenu,
  );

  const loadCommonActions = () => {
    const defaultActions = permissionCommonActions.slice(
      0,
      DEFAULT_IDENTITY_COMMON_ACTION_COUNT,
    );
    if (typeof window === 'undefined') return defaultActions;
    const stored = readCommonActionsFromStorage(storageKey);
    if (!stored) return defaultActions;
    const safeStored = filterCommonActionsByPermissionTree(
      stored,
      permissionCommonActions,
    );
    return safeStored.length > 0 ? safeStored : defaultActions;
  };

  const saveCommonActions = (actions: any[]) => {
    if (typeof window === 'undefined') return;
    const safeActions = filterCommonActionsByPermissionTree(
      actions as CommonAction[],
      permissionCommonActions,
    );
    writeCommonActionsToStorage(storageKey, safeActions);
    setInitialState((s: any) => ({
      ...s,
      commonActions: safeActions,
    }));
  };
  const resolvedCommonActions = filterHomepageCommonActions(
    loadCommonActions(),
  );

  const buildTopMenus = (
    menuData: MenuDataItem[] | undefined,
  ): MenuDataItem[] => {
    const dashboardFromRoutes = (menuData || []).find(
      (item) => item?.path === '/dashboard',
    );

    const dashboardMenu: MenuDataItem = {
      name: DASHBOARD_HOME_TITLE,
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

    if (isExternalUrl(targetPath)) {
      window.location.assign(targetPath);
      return;
    }

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
            const nextTarget = isDashboardHomeMenuItem(clickedItem)
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
      const platformLabel = getHeaderPlatformLabel(
        initialState?.currentOrgCode,
      );

      return (
        <div className="header-platform-brand">
          <img
            src={logoDark}
            alt="logo"
            className="header-platform-logo"
            style={{
              display: 'block',
              flex: 'none',
              width: 'auto',
              height: 48,
              maxWidth: 'none',
            }}
          />
          <span className="header-platform-label">{platformLabel}</span>
        </div>
      );
    },
    actionsRender: () => {
      return [];
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
      const menuScopeKey = storageKey;

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

      const commonActions = resolvedCommonActions;
      const setCommonActions = saveCommonActions;

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
            fetchUserInfo={initialState?.fetchUserInfo}
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
      const checked = (initialState?.settings as any)?.navTheme === 'realDark';
      const routeTabsExtraOps = (
        <>
          <Tooltip title={checked ? '切换亮色模式' : '切换暗黑模式'}>
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
          </Tooltip>
          <NoticeBell />
        </>
      );

      return (
        <>
          <RouteTabsKeepAlive
            key={initialState?.currentOrgCode || 'no-org'}
            themeCacheKey={keepAliveThemeKey}
            menuData={initialState?.permContextMenu}
            extraOps={routeTabsExtraOps}
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
                // 打印最新设置到控制台，作为拷贝失效的临时替代方案
                console.log('--- 当前布局最新配置（拷贝失败请复制这里） ---');
                console.log(JSON.stringify(settings, null, 2));
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
