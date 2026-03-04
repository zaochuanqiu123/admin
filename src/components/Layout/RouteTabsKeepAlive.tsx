import {
  AppstoreOutlined,
  CloseOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';
import { Button, Dropdown, type MenuProps } from 'antd';
import React, { Activity } from 'react';
import { createPortal } from 'react-dom';
import {
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext,
  useOutlet,
} from 'react-router-dom';
import routes from '../../../config/routes';

type RouteTabItem = {
  key: string;
  path: string;
  title: string;
};

type FlatRouteItem = {
  name?: string;
  path: string;
  score: number;
  defaultRedirect?: string;
};

type CacheEntry = {
  node: React.ReactNode;
  locationContext: any;
  navigationContext: any;
  routeContext: any;
};

const EXCLUDED_PREFIXES = ['/user', '/micro-app', '/admin'];
const FIXED_TAB_PATH = '/dashboard/index';
const TAGGABLE_ROOTS = ['/dashboard', '/form'];

function normalizePath(pathname: string): string {
  const pathOnly =
    String(pathname || '')
      .split('?')[0]
      .split('#')[0] || '/';
  if (pathOnly === '/') return '/';
  return pathOnly.endsWith('/') ? pathOnly.slice(0, -1) : pathOnly;
}

function joinPath(base: string, next: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const n = next.startsWith('/') ? next.slice(1) : next;
  return `${b}/${n}`;
}

function normalizeRedirect(redirect: string, parentPath: string): string {
  if (redirect.startsWith('/')) return normalizePath(redirect);
  if (redirect.startsWith('./')) {
    return normalizePath(joinPath(parentPath, redirect.slice(2)));
  }
  return normalizePath(joinPath(parentPath, redirect));
}

function isExcludedPath(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  return EXCLUDED_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function getModuleRoot(pathname: string): string {
  const normalized = normalizePath(pathname);
  const first = normalized.split('/').filter(Boolean)[0] || '';
  return first ? `/${first}` : '/';
}

function isTaggableRoot(pathname: string): boolean {
  const root = getModuleRoot(pathname);
  return TAGGABLE_ROOTS.includes(root);
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isRoutePatternMatch(pattern: string, pathname: string): boolean {
  const normalizedPattern = normalizePath(pattern);
  const normalizedPath = normalizePath(pathname);

  if (normalizedPattern === normalizedPath) return true;
  if (normalizedPattern === '/*') return true;
  if (normalizedPattern.includes('*')) {
    const prefix = normalizedPattern.replace(/\*+$/, '');
    if (!prefix) return true;
    return (
      normalizedPath === normalizePath(prefix) ||
      normalizedPath.startsWith(`${normalizePath(prefix)}/`)
    );
  }

  if (normalizedPattern.includes(':')) {
    const regexSource = `^${normalizedPattern
      .split('/')
      .map((segment) => {
        if (!segment) return '';
        if (segment === '*') return '.*';
        if (segment.startsWith(':')) return '[^/]+';
        return escapeRegex(segment);
      })
      .join('/')}(?:/.*)?$`;
    const regex = new RegExp(regexSource);
    return regex.test(normalizedPath);
  }

  return (
    normalizedPath === normalizedPattern ||
    normalizedPath.startsWith(`${normalizedPattern}/`)
  );
}

function flattenRoutes(routeItems: any[], result: FlatRouteItem[] = []) {
  for (const item of routeItems || []) {
    const path = typeof item?.path === 'string' ? item.path : '';
    let defaultRedirect: string | undefined;

    if (
      path.startsWith('/') &&
      Array.isArray(item?.routes) &&
      item.routes.length > 0
    ) {
      const normalizedPath = normalizePath(path);
      const directRedirectChild = item.routes.find((child: any) => {
        if (typeof child?.redirect !== 'string' || !child.redirect)
          return false;
        const childPath =
          typeof child?.path === 'string' ? normalizePath(child.path) : '';
        return childPath === normalizedPath;
      });
      if (directRedirectChild?.redirect) {
        defaultRedirect = normalizeRedirect(
          String(directRedirectChild.redirect),
          normalizedPath,
        );
      }
    }

    if (path.startsWith('/')) {
      result.push({
        path,
        name: typeof item?.name === 'string' ? item.name : undefined,
        score: path.length,
        defaultRedirect,
      });
    }
    if (Array.isArray(item?.routes) && item.routes.length > 0) {
      flattenRoutes(item.routes, result);
    }
  }
  return result;
}

const FLAT_ROUTES = flattenRoutes(routes as any[]);

const DEFAULT_REDIRECT_BY_PATH = new Map(
  FLAT_ROUTES.filter((item) => !!item.defaultRedirect).map((item) => [
    normalizePath(item.path),
    normalizePath(item.defaultRedirect as string),
  ]),
);

function resolveTagPath(pathname: string): string {
  const normalized = normalizePath(pathname);
  const redirectPath = DEFAULT_REDIRECT_BY_PATH.get(normalized);
  return redirectPath || normalized;
}

function fallbackTitleFromPath(pathname: string): string {
  const normalized = normalizePath(pathname);
  const seg = normalized.split('/').filter(Boolean).pop() || normalized;
  if (!seg || seg === '/') return '页面';
  return decodeURIComponent(seg);
}

function resolveTabTitle(pathname: string): string {
  const normalized = normalizePath(pathname);
  const matches = FLAT_ROUTES.filter(
    (item) => item.name && isRoutePatternMatch(item.path, normalized),
  ).sort((a, b) => b.score - a.score);
  const best = matches[0];
  return best?.name || fallbackTitleFromPath(normalized);
}

function isFixedTabKey(key: string): boolean {
  return normalizePath(key) === FIXED_TAB_PATH;
}

const RouteTabsKeepAlive: React.FC<{
  children: React.ReactNode;
  themeCacheKey?: string;
}> = ({ children, themeCacheKey }) => {
  const outlet = useOutlet();
  const activeNode = outlet ?? children;
  const locationContextValue = React.useContext(UNSAFE_LocationContext);
  const navigationContextValue = React.useContext(UNSAFE_NavigationContext);
  const routeContextValue = React.useContext(UNSAFE_RouteContext);
  const location = useLocation();
  const rawPathname = normalizePath(location.pathname);
  const pathname = resolveTagPath(rawPathname);
  const isPathMappedFromRedirect = rawPathname !== pathname;
  const [tabs, setTabs] = React.useState<RouteTabItem[]>(() => [
    {
      key: FIXED_TAB_PATH,
      path: FIXED_TAB_PATH,
      title: resolveTabTitle(FIXED_TAB_PATH),
    },
  ]);
  const cacheEntryMapRef = React.useRef<Record<string, CacheEntry>>({});
  const suppressedPathRef = React.useRef<string>('');
  const cacheKeyRef = React.useRef<string>(themeCacheKey || '');
  const [headerTabsSlot, setHeaderTabsSlot] =
    React.useState<HTMLElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [refreshVersionMap, setRefreshVersionMap] = React.useState<
    Record<string, number>
  >({});

  // AntD cssVar class may change after theme switch (e.g. css-var-r_0 -> css-var-r_2).
  // Clear cached route nodes so stale theme-scope nodes are not reused.
  React.useEffect(() => {
    const nextKey = themeCacheKey || '';
    if (cacheKeyRef.current === nextKey) return;
    cacheKeyRef.current = nextKey;
    cacheEntryMapRef.current = {};
  }, [themeCacheKey]);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const resolveSlot = () => {
      setHeaderTabsSlot(
        document.getElementById('pc-admin-header-route-tabs-slot'),
      );
    };

    resolveSlot();
    const timerId = window.setTimeout(resolveSlot, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [pathname]);

  const isTaggablePage =
    isTaggableRoot(rawPathname) &&
    isTaggableRoot(pathname) &&
    !isExcludedPath(rawPathname) &&
    !isExcludedPath(pathname);
  const canUseCacheForCurrentRoute =
    isTaggablePage && !isPathMappedFromRedirect;
  const suppressCurrentAutoAdd = suppressedPathRef.current === pathname;

  const renderedTabs = React.useMemo(() => {
    if (!isTaggablePage || suppressCurrentAutoAdd) return tabs;
    if (isPathMappedFromRedirect && !tabs.some((tab) => tab.key === pathname)) {
      return tabs;
    }
    if (tabs.some((tab) => tab.key === pathname)) return tabs;
    return [
      ...tabs,
      {
        key: pathname,
        path: pathname,
        title: resolveTabTitle(pathname),
      },
    ];
  }, [
    isPathMappedFromRedirect,
    isTaggablePage,
    pathname,
    suppressCurrentAutoAdd,
    tabs,
  ]);

  const hasActiveTab = renderedTabs.some((tab) => tab.key === pathname);
  const shouldRenderTabsInHeader = !!headerTabsSlot;
  const barInlineStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 0,
    margin: '2px 0 12px',
    padding: 0,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
  };
  const tabBaseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    flex: '0 0 auto',
    width: 'fit-content',
    gap: 6,
    height: 28,
    maxWidth: 'fit-content',
    padding: '0 8px 0 10px',
    borderRadius: 7,
    cursor: 'pointer',
    transition: 'all .2s ease',
    fontSize: 13,
    lineHeight: '26px',
  };
  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setHasOverflow(false);
      return;
    }
    const maxScrollLeft = Math.max(el.scrollWidth - el.clientWidth, 0);
    setHasOverflow(maxScrollLeft > 1);
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  }, []);

  const scrollByAmount = React.useCallback((delta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    if (suppressedPathRef.current && suppressedPathRef.current !== pathname) {
      suppressedPathRef.current = '';
    }

    if (!isTaggablePage) return;
    if (suppressedPathRef.current === pathname) return;
    if (isPathMappedFromRedirect) return;

    setTabs((prev) => {
      if (prev.some((tab) => tab.key === pathname)) return prev;
      return [
        ...prev,
        {
          key: pathname,
          path: pathname,
          title: resolveTabTitle(pathname),
        },
      ];
    });
  }, [isPathMappedFromRedirect, isTaggablePage, pathname]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const emitResize = () => {
      window.dispatchEvent(new Event('resize'));
    };
    const frameId = window.requestAnimationFrame(emitResize);
    const timerId = window.setTimeout(emitResize, 120);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [pathname, rawPathname]);

  React.useEffect(() => {
    if (!canUseCacheForCurrentRoute) return;
    if (cacheEntryMapRef.current[pathname]) return;
    cacheEntryMapRef.current[pathname] = {
      node: activeNode,
      locationContext: locationContextValue,
      navigationContext: navigationContextValue,
      routeContext: routeContextValue,
    };
  }, [
    activeNode,
    canUseCacheForCurrentRoute,
    locationContextValue,
    navigationContextValue,
    pathname,
    routeContextValue,
  ]);

  const handleTabClick = React.useCallback(
    (path: string) => {
      if (!path || path === pathname) return;
      history.push(path);
    },
    [pathname],
  );

  const handleCloseTab = React.useCallback(
    (targetKey: string) => {
      setTabs((prev) => {
        if (isFixedTabKey(targetKey)) return prev;

        const index = prev.findIndex((tab) => tab.key === targetKey);
        if (index < 0) return prev;

        const nextTabs = prev.filter((tab) => tab.key !== targetKey);
        delete cacheEntryMapRef.current[targetKey];
        delete tabRefs.current[targetKey];
        setRefreshVersionMap((versionsPrev) => {
          if (!(targetKey in versionsPrev)) return versionsPrev;
          const nextVersions = { ...versionsPrev };
          delete nextVersions[targetKey];
          return nextVersions;
        });

        if (targetKey !== pathname) {
          return nextTabs;
        }

        if (nextTabs.length === 0) {
          suppressedPathRef.current = pathname;
          return nextTabs;
        }

        const leftTab = prev[index - 1];
        const rightTab = prev[index + 1];
        const nextActive = leftTab || rightTab;
        if (nextActive?.path) {
          history.push(nextActive.path);
        }

        return nextTabs;
      });
    },
    [pathname],
  );

  const handleRefreshCurrentTab = React.useCallback(() => {
    delete cacheEntryMapRef.current[pathname];
    setRefreshVersionMap((prev) => ({
      ...prev,
      [pathname]: (prev[pathname] || 0) + 1,
    }));
  }, [pathname]);

  const handleCloseCurrentTab = React.useCallback(() => {
    if (isFixedTabKey(pathname)) return;
    handleCloseTab(pathname);
  }, [handleCloseTab, pathname]);

  const handleCloseOtherTabs = React.useCallback(() => {
    setTabs((prev) => {
      const keepKeys = new Set([FIXED_TAB_PATH, pathname]);
      const removedKeys = prev
        .filter((tab) => !keepKeys.has(tab.key))
        .map((tab) => tab.key);
      if (removedKeys.length === 0) return prev;

      removedKeys.forEach((key) => {
        delete cacheEntryMapRef.current[key];
        delete tabRefs.current[key];
      });
      setRefreshVersionMap((versionsPrev) => {
        let changed = false;
        const nextVersions = { ...versionsPrev };
        removedKeys.forEach((key) => {
          if (key in nextVersions) {
            delete nextVersions[key];
            changed = true;
          }
        });
        return changed ? nextVersions : versionsPrev;
      });
      return prev.filter((tab) => keepKeys.has(tab.key));
    });
  }, [pathname]);

  const handleCloseAllTabs = React.useCallback(() => {
    setTabs((prev) => {
      const removedKeys = prev
        .filter((tab) => !isFixedTabKey(tab.key))
        .map((tab) => tab.key);
      if (removedKeys.length === 0) return prev;

      removedKeys.forEach((key) => {
        delete cacheEntryMapRef.current[key];
        delete tabRefs.current[key];
      });
      setRefreshVersionMap((versionsPrev) => {
        let changed = false;
        const nextVersions = { ...versionsPrev };
        removedKeys.forEach((key) => {
          if (key in nextVersions) {
            delete nextVersions[key];
            changed = true;
          }
        });
        return changed ? nextVersions : versionsPrev;
      });
      return prev.filter((tab) => isFixedTabKey(tab.key));
    });
    if (pathname !== FIXED_TAB_PATH) {
      history.push(FIXED_TAB_PATH);
    }
  }, [pathname]);

  const canCloseCurrentTab = !isFixedTabKey(pathname);
  const canCloseOtherTabs = renderedTabs.some(
    (tab) => !isFixedTabKey(tab.key) && tab.key !== pathname,
  );
  const canCloseAllTabs = renderedTabs.some((tab) => !isFixedTabKey(tab.key));

  const tabActionItems = React.useMemo<MenuProps['items']>(
    () => [
      {
        key: 'refresh',
        label: '刷新当前',
        icon: <ReloadOutlined />,
      },
      {
        key: 'close-current',
        label: '关闭当前',
        disabled: !canCloseCurrentTab,
      },
      {
        key: 'close-others',
        label: '关闭其他',
        disabled: !canCloseOtherTabs,
      },
      {
        key: 'close-all',
        label: '关闭全部',
        disabled: !canCloseAllTabs,
      },
    ],
    [canCloseAllTabs, canCloseCurrentTab, canCloseOtherTabs],
  );

  const handleTabActionMenuClick = React.useCallback<
    NonNullable<MenuProps['onClick']>
  >(
    ({ key }) => {
      switch (key) {
        case 'refresh':
          handleRefreshCurrentTab();
          break;
        case 'close-current':
          handleCloseCurrentTab();
          break;
        case 'close-others':
          handleCloseOtherTabs();
          break;
        case 'close-all':
          handleCloseAllTabs();
          break;
        default:
          break;
      }
    },
    [
      handleCloseAllTabs,
      handleCloseCurrentTab,
      handleCloseOtherTabs,
      handleRefreshCurrentTab,
    ],
  );

  React.useEffect(() => {
    const el = scrollRef.current;
    updateScrollState();
    if (!el) return;

    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [renderedTabs.length, shouldRenderTabsInHeader, updateScrollState]);

  React.useEffect(() => {
    const activeTabEl = tabRefs.current[pathname];
    if (!activeTabEl) return;
    activeTabEl.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [pathname, renderedTabs.length]);

  if (!isTaggablePage) {
    return (
      <>
        {activeNode}
        {tabs.map((tab) => (
          <div key={tab.key} style={{ display: 'none' }}>
            <UNSAFE_NavigationContext.Provider
              value={
                cacheEntryMapRef.current[tab.key]?.navigationContext ??
                navigationContextValue
              }
            >
              <UNSAFE_LocationContext.Provider
                value={
                  cacheEntryMapRef.current[tab.key]?.locationContext ??
                  locationContextValue
                }
              >
                <UNSAFE_RouteContext.Provider
                  value={
                    cacheEntryMapRef.current[tab.key]?.routeContext ??
                    routeContextValue
                  }
                >
                  <Activity name={`route-tab:${tab.key}`} mode="hidden">
                    {cacheEntryMapRef.current[tab.key]?.node}
                  </Activity>
                </UNSAFE_RouteContext.Provider>
              </UNSAFE_LocationContext.Provider>
            </UNSAFE_NavigationContext.Provider>
          </div>
        ))}
      </>
    );
  }

  if (renderedTabs.length === 0 || !hasActiveTab) {
    return (
      <>
        <div className="pc-admin-route-tabs-bar pc-admin-route-tabs-bar-empty" />
        {activeNode}
      </>
    );
  }

  const tabsBarStyle: React.CSSProperties = shouldRenderTabsInHeader
    ? {
        ...barInlineStyle,
        margin: 0,
        minHeight: 32,
      }
    : barInlineStyle;

  const tabsBarNode = (
    <div
      role="tablist"
      aria-label="页面标签"
      className={`pc-admin-route-tabs-bar${shouldRenderTabsInHeader ? ' pc-admin-route-tabs-bar-in-header' : ''}`}
      style={tabsBarStyle}
    >
      <div className="pc-admin-route-tabs-main">
        {hasOverflow && (
          <Button
            type="text"
            className="pc-admin-route-tabs-arrow"
            icon={<LeftOutlined />}
            disabled={!canScrollLeft}
            onClick={() => scrollByAmount(-220)}
          />
        )}
        <div className="pc-admin-route-tabs-scroll" ref={scrollRef}>
          <div className="pc-admin-route-tabs-scroll-inner">
            {renderedTabs.map((tab) => {
              const active = tab.key === pathname;
              const fixed = isFixedTabKey(tab.key);
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`pc-admin-route-tab${active ? ' pc-admin-route-tab-active' : ''}`}
                  onClick={() => handleTabClick(tab.path)}
                  ref={(node) => {
                    tabRefs.current[tab.key] = node;
                  }}
                  style={{
                    ...tabBaseStyle,
                    border: active ? '1px solid #8fb4ff' : '1px solid #d6e0f3',
                    background:
                      'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
                    color: active ? '#0f4fd6' : '#42526b',
                    fontWeight: active ? 600 : 400,
                    boxShadow: 'none',
                  }}
                >
                  <span className="pc-admin-route-tab-title">{tab.title}</span>
                  {!fixed && (
                    <span
                      className="pc-admin-route-tab-close"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCloseTab(tab.key);
                      }}
                    >
                      <CloseOutlined />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {hasOverflow && (
          <Button
            type="text"
            className="pc-admin-route-tabs-arrow"
            icon={<RightOutlined />}
            disabled={!canScrollRight}
            onClick={() => scrollByAmount(220)}
          />
        )}
      </div>
      <div className="pc-admin-route-tabs-ops">
        <Dropdown
          menu={{ items: tabActionItems, onClick: handleTabActionMenuClick }}
          trigger={['click']}
          placement="bottomRight"
          overlayClassName="pc-admin-route-tabs-more-menu"
        >
          <Button
            type="text"
            className="pc-admin-route-tabs-more"
            icon={<AppstoreOutlined />}
            aria-label="综合操作"
          />
        </Dropdown>
      </div>
    </div>
  );

  return (
    <>
      {!shouldRenderTabsInHeader && tabsBarNode}
      {shouldRenderTabsInHeader && headerTabsSlot
        ? createPortal(tabsBarNode, headerTabsSlot)
        : null}

      {renderedTabs.map((tab) => {
        const visible = tab.key === pathname;
        const cacheEntry = cacheEntryMapRef.current[tab.key];
        const useLiveNode = visible && isPathMappedFromRedirect;
        const node = useLiveNode
          ? activeNode
          : cacheEntry?.node || (visible ? activeNode : null);
        const locationContextForTab = useLiveNode
          ? locationContextValue
          : (cacheEntry?.locationContext ?? locationContextValue);
        const navigationContextForTab = useLiveNode
          ? navigationContextValue
          : (cacheEntry?.navigationContext ?? navigationContextValue);
        const routeContextForTab = useLiveNode
          ? routeContextValue
          : (cacheEntry?.routeContext ?? routeContextValue);
        const refreshVersion = refreshVersionMap[tab.key] || 0;
        return (
          <div key={tab.key}>
            <UNSAFE_NavigationContext.Provider value={navigationContextForTab}>
              <UNSAFE_LocationContext.Provider value={locationContextForTab}>
                <UNSAFE_RouteContext.Provider value={routeContextForTab}>
                  <Activity
                    key={`route-tab-activity:${tab.key}:${refreshVersion}`}
                    name={`route-tab:${tab.key}:${refreshVersion}`}
                    mode={visible ? 'visible' : 'hidden'}
                  >
                    {node}
                  </Activity>
                </UNSAFE_RouteContext.Provider>
              </UNSAFE_LocationContext.Provider>
            </UNSAFE_NavigationContext.Provider>
          </div>
        );
      })}
    </>
  );
};

export default RouteTabsKeepAlive;
