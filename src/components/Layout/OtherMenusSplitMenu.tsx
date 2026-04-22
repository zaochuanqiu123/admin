import {
  AppstoreOutlined,
  BellOutlined,
  CompassOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  HomeOutlined,
  SettingOutlined,
  ShopOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { MenuDataItem } from '@ant-design/pro-components';
import { Menu, type MenuProps } from 'antd';
import React from 'react';
import {
  isMenuHoverAutoOpenSuppressed,
  resumeMenuHoverAutoOpen,
  suppressMenuHoverAutoOpen,
} from '@/utils/menuHover';
import { useSplitMenuHoverIntent } from './useSplitMenuHoverIntent';

type OtherMenusSplitMenuProps = {
  topMenus?: MenuDataItem[];
  pathname: string;
  currentTargetId?: string;
  onNavigate: (path?: string, targetId?: string, sourceSystem?: number) => void;
};

type MenuNode = {
  key: string;
  name: string;
  path?: string;
  targetId?: string;
  sourceSystem?: number;
  children?: MenuNode[];
};

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
const OTHER_SPLIT_MENU_FADE_DURATION = 180;
const DISABLED_INLINE_MENU_MOTION: MenuProps['motion'] = {
  motionAppear: false,
  motionEnter: false,
  motionLeave: false,
};

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
    node.name.trim() === '首页' ||
    normalizedPath === '/dashboard' ||
    normalizedPath === '/dashboard/index'
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

    // 跳过重定向/占位类节点：无标题且无可展示子节点
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

function findFirstLeafNavigableNode(
  node: MenuNode | undefined,
  inheritedPath?: string,
  inheritedTargetId?: string,
  inheritedSourceSystem?: number,
): { path?: string; targetId?: string; sourceSystem?: number } | undefined {
  if (!node) return undefined;
  const currentPath = node.path || inheritedPath;
  const currentTargetId = node.targetId || inheritedTargetId;
  const currentSourceSystem = node.sourceSystem ?? inheritedSourceSystem;

  const children = node.children || [];
  if (children.length === 0) {
    if (!currentPath) return undefined;
    return {
      path: currentPath,
      targetId: currentTargetId,
      sourceSystem: currentSourceSystem,
    };
  }

  for (const child of children) {
    const leafTarget = findFirstLeafNavigableNode(
      child,
      currentPath,
      currentTargetId,
      currentSourceSystem,
    );
    if (leafTarget?.path) return leafTarget;
  }

  return undefined;
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

function isFocusVisible(element: HTMLElement) {
  return element.matches(':focus-visible');
}

const OtherMenusSplitMenu: React.FC<OtherMenusSplitMenuProps> = ({
  topMenus,
  pathname,
  currentTargetId,
  onNavigate,
}) => {
  const topNodes = React.useMemo(
    () => buildNodes(topMenus, 'top', new WeakSet<object>()),
    [topMenus],
  );
  const [activeTopKey, setActiveTopKey] = React.useState<string>('');
  const [hoveredTopKey, setHoveredTopKey] = React.useState<string>('');
  const [hoverListOpen, setHoverListOpen] = React.useState(false);
  const [openKeys, setOpenKeys] = React.useState<string[]>([]);
  const [hoverOpenKeys, setHoverOpenKeys] = React.useState<string[]>([]);
  const closeTimerRef = React.useRef<number | null>(null);
  const closeCleanupTimerRef = React.useRef<number | null>(null);

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

  const buildMenuMeta = React.useCallback((menuSourceNodes: MenuNode[]) => {
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
          ? 'other-menus-workplace-font'
          : undefined,
        children,
      };
    };

    const items: MenuProps['items'] = menuSourceNodes.map((node) =>
      toMenuItem(node),
    );

    return {
      items,
      pathByKey,
      targetIdByKey,
      sourceSystemByKey,
      parentByKey,
      submenuKeys,
    };
  }, []);

  const menuMeta = React.useMemo(() => {
    return buildMenuMeta(getMenuSourceNodes(activeTopNode));
  }, [activeTopNode, buildMenuMeta]);
  const hoverMenuMeta = React.useMemo(() => {
    return buildMenuMeta(getMenuSourceNodes(hoverTopNode));
  }, [buildMenuMeta, hoverTopNode]);

  const selectedKeys = React.useMemo(() => {
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
  }, [
    currentTargetId,
    menuMeta.parentByKey,
    menuMeta.pathByKey,
    menuMeta.targetIdByKey,
    pathname,
  ]);
  const hoverSelectedKeys = React.useMemo(() => {
    if (currentTargetId) {
      let matchedByTargetKey = '';
      let matchedByTargetDepth = -1;
      hoverMenuMeta.targetIdByKey.forEach((nodeTargetId, key) => {
        if (!nodeTargetId || nodeTargetId !== currentTargetId) return;
        const depth = getMenuKeyDepth(key, hoverMenuMeta.parentByKey);
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
    hoverMenuMeta.pathByKey.forEach((itemPath, key) => {
      if (!isPathMatch(itemPath, pathname)) return;
      const score = normalizePath(itemPath).length;
      const depth = getMenuKeyDepth(key, hoverMenuMeta.parentByKey);
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
  }, [
    currentTargetId,
    hoverMenuMeta.parentByKey,
    hoverMenuMeta.pathByKey,
    hoverMenuMeta.targetIdByKey,
    pathname,
  ]);

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

  const handleTopClick = React.useCallback(
    (node: MenuNode) => {
      setActiveTopKey(node.key);
      const defaultTarget = findFirstLeafNavigableNode(
        node,
        node.path,
        node.targetId,
        node.sourceSystem,
      );
      if (defaultTarget?.path) {
        suppressMenuHoverAutoOpen();
        onNavigate(
          defaultTarget.path,
          defaultTarget.targetId,
          defaultTarget.sourceSystem,
        );
        return;
      }
      if (!node.path) return;
      suppressMenuHoverAutoOpen();
      onNavigate(node.path, node.targetId, node.sourceSystem);
    },
    [onNavigate],
  );

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

  const clearCloseCleanupTimer = React.useCallback(() => {
    if (closeCleanupTimerRef.current === null) return;
    window.clearTimeout(closeCleanupTimerRef.current);
    closeCleanupTimerRef.current = null;
  }, []);

  // 关闭动画进行中标记，用于禁用 pointer-events 防止二次触发 hover
  const [panelClosing, setPanelClosing] = React.useState(false);

  const closeHoverPanelsImmediately = React.useCallback(() => {
    clearCloseTimer();
    clearCloseCleanupTimer();
    setPanelClosing(false);
    setHoverListOpen(false);
    setHoveredTopKey('');
    setHoverOpenKeys([]);
  }, [clearCloseCleanupTimer, clearCloseTimer]);

  React.useEffect(() => {
    closeHoverPanelsImmediately();
  }, [closeHoverPanelsImmediately, currentTargetId, pathname]);

  React.useEffect(() => {
    const handleWindowLeave = () => {
      closeHoverPanelsImmediately();
      suppressMenuHoverAutoOpen();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleWindowLeave();
      }
    };

    window.addEventListener('blur', handleWindowLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', handleWindowLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [closeHoverPanelsImmediately]);

  const openHoverPanels = React.useCallback(
    (topKey?: string) => {
      clearCloseTimer();
      clearCloseCleanupTimer();
      setPanelClosing(false);
      const nextTopKey =
        topKey || hoveredTopKey || activeTopNode?.key || topNodes[0]?.key || '';
      if (nextTopKey) {
        setHoveredTopKey(nextTopKey);
      }
      setHoverListOpen(true);
    },
    [
      activeTopNode?.key,
      clearCloseCleanupTimer,
      clearCloseTimer,
      hoveredTopKey,
      topNodes,
    ],
  );

  const openHoverPanelsByIntent = React.useCallback(
    (topKey?: string) => {
      if (isMenuHoverAutoOpenSuppressed()) {
        return;
      }
      openHoverPanels(topKey);
    },
    [openHoverPanels],
  );

  const { clearHoverIntent, queueHoverIntent } = useSplitMenuHoverIntent({
    hoverOpen: hoverListOpen,
    activeHoverKey: displayTopKey,
    onIntentOpen: openHoverPanelsByIntent,
    clearCloseTimer,
    clearCloseCleanupTimer,
  });

  const scheduleCloseHoverPanels = React.useCallback(() => {
    clearCloseTimer();
    clearCloseCleanupTimer();
    clearHoverIntent();
    // 立刻标记关闭中，禁用 pointer-events 防止鼠标移出过程中再次触发 hover
    setPanelClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setHoverListOpen(false);
      closeTimerRef.current = null;
      closeCleanupTimerRef.current = window.setTimeout(() => {
        setHoveredTopKey('');
        setHoverOpenKeys([]);
        setPanelClosing(false);
        closeCleanupTimerRef.current = null;
      }, OTHER_SPLIT_MENU_FADE_DURATION);
    }, 60);
  }, [clearCloseCleanupTimer, clearCloseTimer, clearHoverIntent]);

  const handleHoverItemClick: MenuProps['onClick'] = React.useCallback(
    (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
      const key = String(info.key || '');
      const path = hoverMenuMeta.pathByKey.get(key);
      if (!path) return;
      clearHoverIntent();
      closeHoverPanelsImmediately();
      suppressMenuHoverAutoOpen();
      onNavigate(
        path,
        hoverMenuMeta.targetIdByKey.get(key),
        hoverMenuMeta.sourceSystemByKey.get(key),
      );
    },
    [
      clearHoverIntent,
      closeHoverPanelsImmediately,
      hoverMenuMeta.pathByKey,
      hoverMenuMeta.sourceSystemByKey,
      hoverMenuMeta.targetIdByKey,
      onNavigate,
    ],
  );

  const handleHoverZoneEnter = React.useCallback(() => {
    clearCloseTimer();
    clearCloseCleanupTimer();
  }, [clearCloseCleanupTimer, clearCloseTimer]);

  const handleHoverZoneLeave = React.useCallback(() => {
    scheduleCloseHoverPanels();
  }, [scheduleCloseHoverPanels]);

  React.useEffect(() => {
    return () => {
      clearHoverIntent();
      clearCloseTimer();
      clearCloseCleanupTimer();
    };
  }, [clearCloseCleanupTimer, clearCloseTimer, clearHoverIntent]);

  if (!activeTopNode) {
    return <div className="other-menus-split-menu-empty" />;
  }

  return (
    <div className="other-menus-split-menu">
      <div
        className={
          'other-menus-split-menu-shell' +
          (hoverListOpen ? ' other-menus-split-menu-shell-open' : '') +
          (panelClosing ? ' other-menus-split-menu-shell-closing' : '')
        }
        onMouseEnter={() => {
          clearHoverIntent();
          handleHoverZoneEnter();
        }}
        onMouseLeave={handleHoverZoneLeave}
      >
        <div
          className={
            'other-menus-split-menu-list' +
            (hoverListOpen ? ' other-menus-split-menu-list-open' : '')
          }
        >
          {topNodes.map((node, index) => {
            const active = node.key === displayTopKey;
            const icon = FIRST_LEVEL_ICONS[index % FIRST_LEVEL_ICONS.length];
            return (
              <button
                key={node.key}
                type="button"
                className={
                  'other-menus-split-menu-icon-btn' +
                  (active ? ' other-menus-split-menu-icon-btn-active' : '')
                }
                aria-label={node.name}
                onMouseEnter={() => queueHoverIntent(node.key)}
                onMouseMove={() => queueHoverIntent(node.key, true)}
                onFocus={(event) => {
                  if (!isFocusVisible(event.currentTarget)) return;
                  clearHoverIntent();
                  resumeMenuHoverAutoOpen();
                  openHoverPanels(node.key);
                }}
                onClick={() => {
                  clearHoverIntent();
                  closeHoverPanelsImmediately();
                  handleTopClick(node);
                }}
              >
                <span className="other-menus-split-menu-item-icon">{icon}</span>
                <span
                  className={
                    'other-menus-split-menu-item-label' +
                    (isDashboardHomeNode(node)
                      ? ' other-menus-workplace-font-label'
                      : '')
                  }
                >
                  {node.name}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={
            'other-menus-split-menu-submenu-panel' +
            (hoverListOpen && hoverMenuMeta.items.length > 0
              ? ' other-menus-split-menu-submenu-panel-open'
              : '')
          }
          onMouseEnter={() => {
            clearHoverIntent();
            handleHoverZoneEnter();
          }}
          onMouseLeave={handleHoverZoneLeave}
        >
          <Menu
            mode="inline"
            items={hoverMenuMeta.items}
            selectedKeys={hoverSelectedKeys}
            openKeys={hoverOpenKeys}
            motion={DISABLED_INLINE_MENU_MOTION}
            onOpenChange={(keys) =>
              setHoverOpenKeys((keys as React.Key[]).map((key) => String(key)))
            }
            onClick={handleHoverItemClick}
            className="other-menus-split-menu-ant other-menus-split-menu-submenu-ant"
          />
        </div>
      </div>

      <div className="other-menus-split-menu-tree">
        <Menu
          mode="inline"
          items={menuMeta.items}
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          motion={DISABLED_INLINE_MENU_MOTION}
          onOpenChange={(keys) =>
            setOpenKeys((keys as React.Key[]).map((key) => String(key)))
          }
          onClick={handleItemClick}
          className="other-menus-split-menu-ant"
        />
      </div>
    </div>
  );
};

export default OtherMenusSplitMenu;
