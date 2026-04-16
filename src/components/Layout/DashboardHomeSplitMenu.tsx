import {
  AppstoreOutlined,
  BellOutlined,
  CompassOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  HomeOutlined,
  PlusOutlined,
  SettingOutlined,
  ShopOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { MenuDataItem } from '@ant-design/pro-components';
import { Menu, type MenuProps } from 'antd';
import React from 'react';
import type { CommonAction } from '@/config/menu.config';
import {
  isMenuHoverAutoOpenSuppressed,
  resumeMenuHoverAutoOpen,
  suppressMenuHoverAutoOpen,
} from '@/utils/menuHover';
import { useSplitMenuHoverIntent } from './useSplitMenuHoverIntent';

type DashboardHomeSplitMenuProps = {
  topMenus?: MenuDataItem[];
  pathname: string;
  currentTargetId?: string;
  onNavigate: (path?: string, targetId?: string, sourceSystem?: number) => void;
  commonActions?: CommonAction[];
};

type MenuNode = {
  key: string;
  name: string;
  path?: string;
  targetId?: string;
  sourceSystem?: number;
  children?: MenuNode[];
};

type MenuMeta = {
  items: MenuProps['items'];
  pathByKey: Map<string, string>;
  targetIdByKey: Map<string, string | undefined>;
  sourceSystemByKey: Map<string, number | undefined>;
  parentByKey: Map<string, string | undefined>;
  submenuKeys: string[];
};

const OPEN_COMMON_ACTIONS_DRAWER_EVENT = 'pc-admin-open-common-actions-drawer';

const FIRST_LEVEL_ICONS: React.ReactNode[] = [
  <HomeOutlined key="home" />,
  <AppstoreOutlined key="appstore" />,
  <ShopOutlined key="shop" />,
  <TagsOutlined key="tags" />,
  <TeamOutlined key="team" />,
  <ToolOutlined key="tool" />,
  <BellOutlined key="bell" />,
  <DatabaseOutlined key="database" />,
  <FileTextOutlined key="file" />,
  <CompassOutlined key="compass" />,
  <SettingOutlined key="setting" />,
];

function normalizePath(path: string | undefined): string {
  const noQuery =
    String(path || '')
      .split('?')[0]
      ?.split('#')[0] || '';
  if (!noQuery) return '';
  if (noQuery === '/') return '/';
  return noQuery.endsWith('/') ? noQuery.slice(0, -1) : noQuery;
}

function isPathMatch(basePath: string | undefined, pathname: string): boolean {
  const base = normalizePath(basePath);
  const current = normalizePath(pathname);
  if (!base || !current) return false;
  if (base === '/') return current === '/';
  return current === base || current.startsWith(`${base}/`);
}

function isDashboardHomeNode(node: MenuNode): boolean {
  const normalizedPath = normalizePath(node.path);
  return (
    normalizedPath === '/dashboard' || normalizedPath === '/dashboard/index'
  );
}

function buildNodes(
  items: MenuDataItem[] | undefined,
  parentKey: string,
  visited: WeakSet<object>,
  depth = 0,
): MenuNode[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (depth > 10) return [];

  const result: MenuNode[] = [];
  items.forEach((item, index) => {
    if (!item || (item as any)?.hideInMenu) return;
    if (typeof item === 'object') {
      if (visited.has(item as object)) return;
      visited.add(item as object);
    }

    const itemPath = item?.path ? normalizePath(String(item.path)) : '';
    const rawName = typeof item?.name === 'string' ? item.name.trim() : '';
    const itemName = rawName || `菜单${index + 1}`;
    const nodeKey = `${parentKey}__${index}__${itemPath || itemName}`;
    const children = buildNodes(
      Array.isArray(item?.children) ? (item.children as MenuDataItem[]) : [],
      nodeKey,
      visited,
      depth + 1,
    );

    if (!rawName && children.length === 0) return;

    const targetId = (item as any)?.targetId;
    const sourceSystem = Number((item as any)?.sourceSystem);
    result.push({
      key: nodeKey,
      name: itemName,
      path: itemPath || undefined,
      targetId:
        targetId === undefined || targetId === null
          ? undefined
          : String(targetId),
      sourceSystem: Number.isFinite(sourceSystem) ? sourceSystem : undefined,
      children: children.length > 0 ? children : undefined,
    });
  });
  return result;
}

function hasTargetIdInTree(node: MenuNode, targetId: string): boolean {
  const stack: MenuNode[] = [node];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop() as MenuNode;
    if (visited.has(current.key)) continue;
    visited.add(current.key);
    if (current.targetId && current.targetId === targetId) return true;
    if (current.children && current.children.length > 0) {
      for (const child of current.children) {
        stack.push(child);
      }
    }
  }
  return false;
}

function getBestPathMatchScoreInTree(node: MenuNode, pathname: string): number {
  let bestScore = -1;
  const stack: MenuNode[] = [node];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop() as MenuNode;
    if (visited.has(current.key)) continue;
    visited.add(current.key);

    if (current.path && isPathMatch(current.path, pathname)) {
      bestScore = Math.max(bestScore, normalizePath(current.path).length);
    }

    if (current.children && current.children.length > 0) {
      for (const child of current.children) {
        stack.push(child);
      }
    }
  }

  return bestScore;
}

function collectParentKeys(
  currentKey: string,
  parentByKey: Map<string, string | undefined>,
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  let cursor = parentByKey.get(currentKey);
  while (cursor) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    result.push(cursor);
    cursor = parentByKey.get(cursor);
  }
  return result;
}

function getMenuKeyDepth(
  key: string,
  parentByKey: Map<string, string | undefined>,
): number {
  if (!key) return 0;
  let depth = 0;
  let cursor: string | undefined = key;
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    depth += 1;
    cursor = parentByKey.get(cursor);
  }
  return depth;
}

function getMenuSourceNodes(node: MenuNode | undefined): MenuNode[] {
  if (!node) return [];
  if (node.children && node.children.length > 0) {
    return node.children;
  }
  return [node];
}

function getSelectedKeysFromMeta(
  pathname: string,
  currentTargetId: string | undefined,
  menuMeta: MenuMeta,
): string[] {
  if (currentTargetId) {
    let matchedByTargetKey = '';
    let matchedByTargetDepth = -1;
    menuMeta.targetIdByKey.forEach((nodeTargetId, key) => {
      if (!nodeTargetId || nodeTargetId !== currentTargetId) return;
      const depth = getMenuKeyDepth(key, menuMeta.parentByKey);
      if (
        depth > matchedByTargetDepth ||
        (depth === matchedByTargetDepth &&
          key.length > matchedByTargetKey.length)
      ) {
        matchedByTargetKey = key;
        matchedByTargetDepth = depth;
      }
    });
    if (matchedByTargetKey) return [matchedByTargetKey];
  }

  let matchedKey = '';
  let matchedLength = -1;
  let matchedDepth = -1;
  menuMeta.pathByKey.forEach((itemPath, key) => {
    if (!isPathMatch(itemPath, pathname)) return;
    const score = normalizePath(itemPath).length;
    const depth = getMenuKeyDepth(key, menuMeta.parentByKey);
    if (
      score < matchedLength ||
      (score === matchedLength && depth <= matchedDepth)
    ) {
      return;
    }
    matchedLength = score;
    matchedKey = key;
    matchedDepth = depth;
  });
  return matchedKey ? [matchedKey] : [];
}

const DashboardHomeSplitMenu: React.FC<DashboardHomeSplitMenuProps> = ({
  topMenus,
  pathname,
  currentTargetId,
  onNavigate,
  commonActions = [],
}) => {
  const topNodes = React.useMemo(
    () => buildNodes(topMenus, 'top', new WeakSet<object>()),
    [topMenus],
  );
  const [activeTopKey, setActiveTopKey] = React.useState<string>('');
  const [hoveredTopKey, setHoveredTopKey] = React.useState<string>('');
  const [hoverPanelOpen, setHoverPanelOpen] = React.useState(false);
  const [openKeys, setOpenKeys] = React.useState<string[]>([]);
  const [hoverOpenKeys, setHoverOpenKeys] = React.useState<string[]>([]);
  const closeTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (topNodes.length === 0) {
      if (activeTopKey) setActiveTopKey('');
      return;
    }
    if (currentTargetId) {
      const matchedByTarget = topNodes.find((node) =>
        hasTargetIdInTree(node, currentTargetId),
      );
      if (matchedByTarget) {
        if (matchedByTarget.key !== activeTopKey) {
          setActiveTopKey(matchedByTarget.key);
        }
        return;
      }
    }
    const matched = topNodes.reduce<
      { node: MenuNode; score: number } | undefined
    >((best, node) => {
      const score = getBestPathMatchScoreInTree(node, pathname);
      if (score < 0) return best;
      if (!best || score > best.score) {
        return { node, score };
      }
      return best;
    }, undefined);
    if (matched?.node) {
      if (matched.node.key !== activeTopKey) {
        setActiveTopKey(matched.node.key);
      }
      return;
    }
    if (!topNodes.some((node) => node.key === activeTopKey)) {
      setActiveTopKey(topNodes[0].key);
    }
  }, [activeTopKey, currentTargetId, pathname, topNodes]);

  const activeTopNode = React.useMemo(() => {
    if (topNodes.length === 0) return undefined;
    return topNodes.find((node) => node.key === activeTopKey) || topNodes[0];
  }, [activeTopKey, topNodes]);
  const displayTopKey = hoveredTopKey || activeTopNode?.key || '';
  const hoverTopNode = React.useMemo(() => {
    if (topNodes.length === 0) return undefined;
    return topNodes.find((node) => node.key === displayTopKey) || topNodes[0];
  }, [displayTopKey, topNodes]);

  const buildMenuMeta = React.useCallback(
    (
      menuSourceNodes: MenuNode[],
      menuCommonActions: CommonAction[] = [],
    ): MenuMeta => {
      const pathByKey = new Map<string, string>();
      const targetIdByKey = new Map<string, string | undefined>();
      const sourceSystemByKey = new Map<string, number | undefined>();
      const parentByKey = new Map<string, string | undefined>();
      const submenuKeys: string[] = [];

      const toMenuItem = (
        node: MenuNode,
        parentKey?: string,
        inheritedPath?: string,
      ): NonNullable<MenuProps['items']>[number] => {
        parentByKey.set(node.key, parentKey);
        const resolvedPath = node.path || inheritedPath;
        if (resolvedPath) {
          pathByKey.set(node.key, resolvedPath);
        }
        targetIdByKey.set(node.key, node.targetId);
        sourceSystemByKey.set(node.key, node.sourceSystem);
        const children =
          node.children && node.children.length > 0
            ? node.children.map((child) =>
                toMenuItem(child, node.key, resolvedPath),
              )
            : undefined;
        if (children && children.length > 0) {
          submenuKeys.push(node.key);
        }

        return {
          key: node.key,
          label: node.name,
          icon: undefined,
          className: isDashboardHomeNode(node)
            ? 'dashboard-home-workplace-font'
            : undefined,
          children,
        };
      };

      const items: MenuProps['items'] = menuSourceNodes.map((node) =>
        toMenuItem(node),
      );

      if (menuCommonActions.length > 0) {
        const commonActionsKey = 'common-actions-group';
        submenuKeys.push(commonActionsKey);

        const commonChildren: NonNullable<MenuProps['items']>[number][] =
          menuCommonActions.map((action, index) => {
            const childKey = `common-action-${action.id}-${index}`;
            pathByKey.set(childKey, action.path);
            parentByKey.set(childKey, commonActionsKey);
            return {
              key: childKey,
              label: action.title,
              icon: undefined,
            };
          });

        items.push({
          key: commonActionsKey,
          label: (
            <span className="dashboard-common-actions-name">常用数据</span>
          ),
          icon: undefined,
          children: commonChildren,
        });
      }

      return {
        items,
        pathByKey,
        targetIdByKey,
        sourceSystemByKey,
        parentByKey,
        submenuKeys,
      };
    },
    [],
  );

  const menuMeta = React.useMemo(() => {
    return buildMenuMeta(getMenuSourceNodes(activeTopNode), commonActions);
  }, [activeTopNode, buildMenuMeta, commonActions]);
  const hoverMenuMeta = React.useMemo(() => {
    return buildMenuMeta(getMenuSourceNodes(hoverTopNode));
  }, [buildMenuMeta, hoverTopNode]);

  const selectedKeys = React.useMemo(() => {
    return getSelectedKeysFromMeta(pathname, currentTargetId, menuMeta);
  }, [currentTargetId, menuMeta, pathname]);
  const hoverSelectedKeys = React.useMemo(() => {
    return getSelectedKeysFromMeta(pathname, currentTargetId, hoverMenuMeta);
  }, [currentTargetId, hoverMenuMeta, pathname]);

  React.useEffect(() => {
    if (menuMeta.submenuKeys.length === 0) {
      setOpenKeys([]);
      return;
    }
    if (selectedKeys.length === 0) {
      setOpenKeys(menuMeta.submenuKeys);
      return;
    }
    const parentKeys = collectParentKeys(selectedKeys[0], menuMeta.parentByKey);
    setOpenKeys(Array.from(new Set([...menuMeta.submenuKeys, ...parentKeys])));
  }, [menuMeta.parentByKey, menuMeta.submenuKeys, selectedKeys]);

  React.useEffect(() => {
    if (!hoverTopNode) {
      setHoverOpenKeys([]);
      return;
    }
    if (hoverMenuMeta.submenuKeys.length === 0) {
      setHoverOpenKeys([]);
      return;
    }
    if (hoverSelectedKeys.length === 0) {
      setHoverOpenKeys(hoverMenuMeta.submenuKeys);
      return;
    }
    const parentKeys = collectParentKeys(
      hoverSelectedKeys[0],
      hoverMenuMeta.parentByKey,
    );
    setHoverOpenKeys(
      Array.from(new Set([...hoverMenuMeta.submenuKeys, ...parentKeys])),
    );
  }, [
    hoverMenuMeta.parentByKey,
    hoverMenuMeta.submenuKeys,
    hoverSelectedKeys,
    hoverTopNode,
  ]);

  const handleItemClick: MenuProps['onClick'] = React.useCallback(
    (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
      const key = String(info.key || '');
      const path = menuMeta.pathByKey.get(key);
      if (!path) return;
      suppressMenuHoverAutoOpen();
      onNavigate(
        path,
        menuMeta.targetIdByKey.get(key),
        menuMeta.sourceSystemByKey.get(key),
      );
    },
    [
      menuMeta.pathByKey,
      menuMeta.sourceSystemByKey,
      menuMeta.targetIdByKey,
      onNavigate,
    ],
  );

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const openHoverPanel = React.useCallback(
    (topKey?: string) => {
      clearCloseTimer();
      if (topKey) {
        setHoveredTopKey(topKey);
      }
      setHoverPanelOpen(true);
    },
    [clearCloseTimer],
  );

  const openHoverPanelByIntent = React.useCallback(
    (topKey?: string) => {
      if (isMenuHoverAutoOpenSuppressed()) {
        return;
      }
      openHoverPanel(topKey);
    },
    [openHoverPanel],
  );

  const { clearHoverIntent, queueHoverIntent } = useSplitMenuHoverIntent({
    hoverOpen: hoverPanelOpen,
    activeHoverKey: displayTopKey,
    onIntentOpen: openHoverPanelByIntent,
    clearCloseTimer,
  });

  const handleHoverItemClick: MenuProps['onClick'] = React.useCallback(
    (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
      const key = String(info.key || '');
      const path = hoverMenuMeta.pathByKey.get(key);
      if (!path) return;
      clearHoverIntent();
      setHoverPanelOpen(false);
      setHoveredTopKey('');
      suppressMenuHoverAutoOpen();
      onNavigate(
        path,
        hoverMenuMeta.targetIdByKey.get(key),
        hoverMenuMeta.sourceSystemByKey.get(key),
      );
    },
    [
      clearHoverIntent,
      hoverMenuMeta.pathByKey,
      hoverMenuMeta.sourceSystemByKey,
      hoverMenuMeta.targetIdByKey,
      onNavigate,
    ],
  );

  const scheduleCloseHoverPanel = React.useCallback(() => {
    clearCloseTimer();
    clearHoverIntent();
    closeTimerRef.current = window.setTimeout(() => {
      setHoverPanelOpen(false);
      setHoveredTopKey('');
      closeTimerRef.current = null;
    }, 120);
  }, [clearCloseTimer, clearHoverIntent]);

  React.useEffect(() => {
    return () => {
      clearHoverIntent();
      clearCloseTimer();
    };
  }, [clearCloseTimer, clearHoverIntent]);

  const hasCommonActions = commonActions.length > 0;

  const openCommonActionsDrawer = React.useCallback(() => {
    window.dispatchEvent(new Event(OPEN_COMMON_ACTIONS_DRAWER_EVENT));
  }, []);

  if (!activeTopNode) {
    return <div className="dashboard-home-split-menu-empty" />;
  }

  return (
    <div className="dashboard-home-split-menu">
      <div
        className={
          'dashboard-home-split-menu-hover-wrap' +
          (hoverPanelOpen ? ' dashboard-home-split-menu-hover-wrap-open' : '')
        }
        onMouseEnter={() => {
          clearHoverIntent();
          clearCloseTimer();
        }}
        onMouseLeave={scheduleCloseHoverPanel}
      >
        <div className="dashboard-home-split-menu-icons">
          {topNodes.map((node, index) => {
            const active = node.key === displayTopKey;
            const icon = FIRST_LEVEL_ICONS[index % FIRST_LEVEL_ICONS.length];
            return (
              <button
                key={node.key}
                type="button"
                className={
                  'dashboard-home-split-menu-icon-btn' +
                  (active ? ' dashboard-home-split-menu-icon-btn-active' : '')
                }
                aria-label={node.name}
                onMouseEnter={() => queueHoverIntent(node.key)}
                onMouseMove={() => queueHoverIntent(node.key, true)}
                onFocus={() => {
                  clearHoverIntent();
                  resumeMenuHoverAutoOpen();
                  openHoverPanel(node.key);
                }}
              >
                <span className="dashboard-home-split-menu-icon">{icon}</span>
                <span className="dashboard-home-split-menu-icon-label">
                  {node.name}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={
            'dashboard-home-split-menu-hover-panel' +
            (hoverPanelOpen && (hoverMenuMeta.items?.length ?? 0) > 0
              ? ' dashboard-home-split-menu-hover-panel-open'
              : '')
          }
          onMouseEnter={() => {
            clearHoverIntent();
            clearCloseTimer();
          }}
          onMouseLeave={scheduleCloseHoverPanel}
        >
          <Menu
            mode="inline"
            items={hoverMenuMeta.items}
            selectedKeys={hoverSelectedKeys}
            openKeys={hoverOpenKeys}
            onOpenChange={(keys) =>
              setHoverOpenKeys((keys as React.Key[]).map((key) => String(key)))
            }
            onClick={handleHoverItemClick}
            className="dashboard-home-split-menu-ant dashboard-home-split-menu-hover-panel-ant"
          />
        </div>
      </div>

      <div className="dashboard-home-split-menu-tree">
        <Menu
          mode="inline"
          items={menuMeta.items}
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={(keys) =>
            setOpenKeys((keys as React.Key[]).map((key) => String(key)))
          }
          onClick={handleItemClick}
          className="dashboard-home-split-menu-ant"
        />
        {hasCommonActions ? (
          <div className="dashboard-common-actions-footer">
            <button
              type="button"
              className="dashboard-common-actions-drawer-trigger"
              onClick={openCommonActionsDrawer}
              aria-label="打开常用数据编辑抽屉"
            >
              <PlusOutlined />
              <span>管理常用</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DashboardHomeSplitMenu;
