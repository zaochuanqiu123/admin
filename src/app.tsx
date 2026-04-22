import { DownOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';

import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';

import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Button, Dropdown, Modal, message, Tooltip } from 'antd';
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
  getCurrentBusinessCode,
  getLoginUserInfo,
  getSelectedOrgCode,
  getToken,
  setCurrentBusinessCode,
} from '@/api/storage';
import { getUserInfo as fetchUserInfoFromApi } from '@/api/user';
import logoDark from '@/assets/logo-dark.png';
import DashboardHomeSplitMenu from '@/components/Layout/DashboardHomeSplitMenu';
import OtherMenusSplitMenu from '@/components/Layout/OtherMenusSplitMenu';
import RouteTabsKeepAlive from '@/components/Layout/RouteTabsKeepAlive';
import WorkplaceCommonMenu from '@/components/Workplace/WorkplaceCommonMenu';
import {
  type CommonAction,
  DEFAULT_COMMON_ACTIONS,
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
import { buildIframeRouteWithParams } from '@/utils/iframe';
import {
  extractButtonPermissionMap,
  extractPermContextNodes,
  findFirstLeafMenuTarget,
  findPathByTargetId,
  getValidBusinessCode,
  mapPermContextToMenuData,
  TEMP_BUSINESS_CODE,
} from '@/utils/menu';
import {
  clearStoreScopedStorage,
  clearWorkplaceCommonActionsCache,
  resetStoreScopedInitialState,
} from '@/utils/store-switch';

const isDev = process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/user/login';
const DASHBOARD_HOME_TITLE = '首页';
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;
const HEADER_USER_AVATAR_SRC =
  'https://api.dicebear.com/7.x/miniavs/svg?seed=antd-yangkun';
let logoutInFlight: Promise<void> | null = null;

function normalizeCommonActionId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_/-]/g, '_');
}

function getMenuItemTargetId(item: MenuDataItem) {
  const rawTargetId = (item as any)?.targetId;
  if (rawTargetId === undefined || rawTargetId === null) return undefined;
  const targetId = String(rawTargetId).trim();
  return targetId || undefined;
}

function getMenuItemSourceSystem(item: MenuDataItem) {
  const sourceSystem = Number((item as any)?.sourceSystem);
  return Number.isFinite(sourceSystem) ? sourceSystem : undefined;
}

function getCommonActionTitle(item: MenuDataItem, fallback: string) {
  const rawTitle = item?.name ?? item?.locale;
  const title =
    typeof rawTitle === 'string' || typeof rawTitle === 'number'
      ? String(rawTitle).trim()
      : '';
  return title || fallback;
}

function buildCommonActionFromMenuItem(
  item: MenuDataItem,
  fallback: string,
): CommonAction | undefined {
  const path = typeof item?.path === 'string' ? item.path.trim() : '';
  if (!path) return undefined;
  const title = getCommonActionTitle(item, fallback);
  const targetId = getMenuItemTargetId(item);
  const sourceSystem = getMenuItemSourceSystem(item);
  const rawId = item?.key ?? targetId ?? path ?? title ?? fallback;
  return {
    id: normalizeCommonActionId(
      [path, targetId, rawId, title, fallback]
        .filter(
          (value) => value !== undefined && value !== null && value !== '',
        )
        .map((value) => String(value))
        .join('__') || fallback,
    ),
    title,
    path,
    targetId,
    sourceSystem,
  };
}

function buildDefaultCommonActionsFromMenu(
  menuData: MenuDataItem[] | undefined,
) {
  const collected: CommonAction[] = [];
  const seen = new Set<string>();
  const walk = (items: MenuDataItem[] | undefined, prefix: string) => {
    if (!Array.isArray(items)) return;
    items.forEach((item, index) => {
      const children = Array.isArray(item?.children)
        ? (item.children as MenuDataItem[])
        : [];
      if (children.length > 0) {
        walk(children, `${prefix}-${index}`);
        return;
      }
      const action = buildCommonActionFromMenuItem(item, `${prefix}-${index}`);
      if (!action) return;
      const key = [
        action.title,
        action.sourceSystem ?? '',
        action.targetId ?? '',
        action.path,
      ].join('::');
      if (seen.has(key)) return;
      seen.add(key);
      collected.push(action);
    });
  };
  walk(menuData, 'current-menu');
  const localActions = collected.filter(
    (item) => item.path !== '/app' && item.sourceSystem !== 1,
  );
  const iframeActions = collected.filter(
    (item) => item.path === '/app' || item.sourceSystem === 1,
  );
  const result = [...localActions, ...iframeActions].slice(0, 7);
  return result.length > 0 ? result : DEFAULT_COMMON_ACTIONS;
}

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
    const { permContextMenu, buttonPermissions } =
      await fetchPermState(TEMP_BUSINESS_CODE);
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

    // 登录上下文是权限/业态的来源，不能用旧本地缓存兜底。
    const businessList = Array.isArray(loginContext?.businessList)
      ? loginContext.businessList
      : [];
    if (businessList.length === 0) {
      clearStoreScopedStorage();
      const redirect = `${location.pathname}${location.search || ''}`;
      if (location.pathname !== '/user/character') {
        setPostLoginRedirect(redirect);
        history.replace({
          pathname: '/user/character',
          search: new URLSearchParams({ redirect }).toString(),
        });
      }
      message.warning('当前身份暂无可用业态，请重新选择身份');
      return {
        fetchUserInfo,
        settings: resolvedSettings,
      };
    }

    let currentBusinessCode = getCurrentBusinessCode() || undefined;

    // 验证并获取有效的业态代码
    currentBusinessCode = getValidBusinessCode(
      currentBusinessCode,
      businessList,
    );

    if (currentBusinessCode !== getCurrentBusinessCode()) {
      setCurrentBusinessCode(currentBusinessCode);
    }

    // 2. 权限上下文
    const { permContextMenu, buttonPermissions } =
      await fetchPermState(currentBusinessCode);

    // 3. 最后获取用户基本信息
    const currentUser = await fetchUserInfo();

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
  }_${initialState?.currentOrgCode ?? 'no-org'}_${initialState?.currentBusinessCode ?? 'no-business'}`;

  const loadCommonActions = () => {
    const menuDefaultActions = buildDefaultCommonActionsFromMenu(
      initialState?.permContextMenu,
    );
    if (typeof window === 'undefined') return menuDefaultActions;
    const stored = readCommonActionsFromStorage(storageKey);
    return stored || menuDefaultActions;
  };

  const saveCommonActions = (actions: any[]) => {
    if (typeof window === 'undefined') return;
    writeCommonActionsToStorage(storageKey, actions);
    setInitialState((s: any) => ({
      ...s,
      commonActions: actions,
    }));
  };
  const resolvedCommonActions =
    initialState?.commonActions || loadCommonActions();

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
            // 如果当前页面在新业态下没有权限，跳转到系统首页
            history.replace(buildIframeRouteWithParams('/dashboard/index'));
            message.success('切换业态成功，已跳转到系统首页');
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

      // 判断是否显示业态选择（loginContext 或当前选中的 business 项中 isshow / isShow 为 false 时不显示）
      const loginContext = initialState?.loginContext;
      const showBusinessPill =
        loginContext?.isshow !== false &&
        loginContext?.isShow !== false &&
        currentBusiness?.isshow !== false &&
        currentBusiness?.isShow !== false;

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
          {businessList.length > 0 && showBusinessPill && (
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
      }_${initialState?.currentOrgCode ?? 'no-org'}_${initialState?.currentBusinessCode ?? 'no-business'}`;

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
