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

type OtherMenusSplitMenuProps = {
  topMenus?: MenuDataItem[];
  pathname: string;
  currentTargetId?: string;
  onNavigate: (path?: string, targetId?: string) => void;
};

type MenuNode = {
  key: string;
  name: string;
  path?: string;
  targetId?: string;
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
const OTHER_SPLIT_MENU_ICON_WIDTH = 56;
const OTHER_SPLIT_MENU_LABEL_WIDTH = 70;
const OTHER_SPLIT_MENU_PANEL_OVERLAP = 2;
const OTHER_SPLIT_MENU_FADE_DURATION = 180;

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
    result.push({
      key: nodeKey,
      name: itemName,
      path: itemPath || undefined,
      targetId:
        targetId === undefined || targetId === null
          ? undefined
          : String(targetId),
      children: children.length > 0 ? children : undefined,
    });
  });
  return result;
}

function hasPathInTree(node: MenuNode, pathname: string): boolean {
  const stack: MenuNode[] = [node];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop() as MenuNode;
    if (visited.has(current.key)) continue;
    visited.add(current.key);
    if (current.path && isPathMatch(current.path, pathname)) return true;
    if (current.children && current.children.length > 0) {
      for (const child of current.children) {
        stack.push(child);
      }
    }
  }
  return false;
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

function findFirstLeafNavigableNode(
  node: MenuNode | undefined,
  inheritedPath?: string,
): { path?: string; targetId?: string } | undefined {
  if (!node) return undefined;
  const currentPath = node.path || inheritedPath;

  const children = node.children || [];
  if (children.length === 0) {
    if (!currentPath) return undefined;
    return { path: currentPath, targetId: node.targetId };
  }

  for (const child of children) {
    const leafTarget = findFirstLeafNavigableNode(child, currentPath);
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
  const [hoverSubmenuOpen, setHoverSubmenuOpen] = React.useState(false);
  const [openKeys, setOpenKeys] = React.useState<string[]>([]);
  const [hoverOpenKeys, setHoverOpenKeys] = React.useState<string[]>([]);
  const closeTimerRef = React.useRef<number | null>(null);
  const closeCleanupTimerRef = React.useRef<number | null>(null);
  const submenuPanelRectRef = React.useRef<{
    top: number;
    left: number;
    height: number;
  } | null>(null);
  const menuShellRef = React.useRef<HTMLDivElement | null>(null);
  const menuListRef = React.useRef<HTMLDivElement | null>(null);
  const submenuPanelRef = React.useRef<HTMLDivElement | null>(null);
  const [submenuPanelStyle, setSubmenuPanelStyle] =
    React.useState<React.CSSProperties>();

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
    const matched = topNodes.find((node) => hasPathInTree(node, pathname));
    if (matched) {
      if (matched.key !== activeTopKey) {
        setActiveTopKey(matched.key);
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
      parentByKey,
      submenuKeys,
    };
  }, []);

  const menuMeta = React.useMemo(() => {
    return buildMenuMeta(activeTopNode?.children || []);
  }, [activeTopNode, buildMenuMeta]);
  const hoverMenuMeta = React.useMemo(() => {
    return buildMenuMeta(hoverTopNode?.children || []);
  }, [buildMenuMeta, hoverTopNode]);

  const selectedKeys = React.useMemo(() => {
    if (currentTargetId) {
      let matchedByTargetKey = '';
      menuMeta.targetIdByKey.forEach((nodeTargetId, key) => {
        if (!nodeTargetId || nodeTargetId !== currentTargetId) return;
        if (key.length > matchedByTargetKey.length) {
          matchedByTargetKey = key;
        }
      });
      if (matchedByTargetKey) return [matchedByTargetKey];
    }

    let matchedKey = '';
    let matchedLength = -1;
    menuMeta.pathByKey.forEach((itemPath, key) => {
      if (!isPathMatch(itemPath, pathname)) return;
      const score = normalizePath(itemPath).length;
      if (score <= matchedLength) return;
      matchedLength = score;
      matchedKey = key;
    });
    return matchedKey ? [matchedKey] : [];
  }, [currentTargetId, menuMeta.pathByKey, menuMeta.targetIdByKey, pathname]);
  const hoverSelectedKeys = React.useMemo(() => {
    if (currentTargetId) {
      let matchedByTargetKey = '';
      hoverMenuMeta.targetIdByKey.forEach((nodeTargetId, key) => {
        if (!nodeTargetId || nodeTargetId !== currentTargetId) return;
        if (key.length > matchedByTargetKey.length) {
          matchedByTargetKey = key;
        }
      });
      if (matchedByTargetKey) return [matchedByTargetKey];
    }

    let matchedKey = '';
    let matchedLength = -1;
    hoverMenuMeta.pathByKey.forEach((itemPath, key) => {
      if (!isPathMatch(itemPath, pathname)) return;
      const score = normalizePath(itemPath).length;
      if (score <= matchedLength) return;
      matchedLength = score;
      matchedKey = key;
    });
    return matchedKey ? [matchedKey] : [];
  }, [
    currentTargetId,
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
      if (normalizePath(node.path) === '/dashboard' && node.path) {
        onNavigate(node.path, node.targetId);
        return;
      }
      const defaultTarget = findFirstLeafNavigableNode(node, node.path);
      if (!defaultTarget?.path) return;
      onNavigate(defaultTarget.path, defaultTarget.targetId);
    },
    [onNavigate],
  );

  const handleItemClick: MenuProps['onClick'] = React.useCallback(
    (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
      const key = String(info.key || '');
      const path = menuMeta.pathByKey.get(key);
      if (!path) return;
      onNavigate(path, menuMeta.targetIdByKey.get(key));
    },
    [menuMeta.pathByKey, menuMeta.targetIdByKey, onNavigate],
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

  const closeHoverPanelsImmediately = React.useCallback(() => {
    clearCloseTimer();
    clearCloseCleanupTimer();
    submenuPanelRectRef.current = null;
    setHoverSubmenuOpen(false);
    setHoverListOpen(false);
    setHoveredTopKey('');
    setHoverOpenKeys([]);
    setSubmenuPanelStyle(undefined);
  }, [clearCloseCleanupTimer, clearCloseTimer]);

  const openHoverPanels = React.useCallback(
    (topKey?: string) => {
      clearCloseTimer();
      clearCloseCleanupTimer();
      const nextTopKey =
        topKey || hoveredTopKey || activeTopNode?.key || topNodes[0]?.key || '';
      if (nextTopKey) {
        setHoveredTopKey(nextTopKey);
      }
      setHoverListOpen(true);
      if (!hoverSubmenuOpen) {
        setHoverSubmenuOpen(true);
      }
    },
    [
      activeTopNode?.key,
      clearCloseCleanupTimer,
      clearCloseTimer,
      hoverSubmenuOpen,
      hoveredTopKey,
      topNodes,
    ],
  );

  const scheduleCloseHoverPanels = React.useCallback(() => {
    clearCloseTimer();
    clearCloseCleanupTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHoverSubmenuOpen(false);
      setHoverListOpen(false);
      submenuPanelRectRef.current = null;
      closeTimerRef.current = null;
      closeCleanupTimerRef.current = window.setTimeout(() => {
        setHoveredTopKey('');
        setHoverOpenKeys([]);
        setSubmenuPanelStyle(undefined);
        closeCleanupTimerRef.current = null;
      }, OTHER_SPLIT_MENU_FADE_DURATION);
    }, 120);
  }, [clearCloseCleanupTimer, clearCloseTimer]);

  const handleHoverItemClick: MenuProps['onClick'] = React.useCallback(
    (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
      const key = String(info.key || '');
      const path = hoverMenuMeta.pathByKey.get(key);
      if (!path) return;
      closeHoverPanelsImmediately();
      onNavigate(path, hoverMenuMeta.targetIdByKey.get(key));
    },
    [
      closeHoverPanelsImmediately,
      hoverMenuMeta.pathByKey,
      hoverMenuMeta.targetIdByKey,
      onNavigate,
    ],
  );

  const isWithinHoverPanels = React.useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return Boolean(
        menuShellRef.current?.contains(target) ||
          submenuPanelRef.current?.contains(target),
      );
    },
    [],
  );

  const handleHoverZoneEnter = React.useCallback(() => {
    clearCloseTimer();
    clearCloseCleanupTimer();
  }, [clearCloseCleanupTimer, clearCloseTimer]);

  const handleHoverZoneLeave = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (isWithinHoverPanels(event.relatedTarget)) return;
      scheduleCloseHoverPanels();
    },
    [isWithinHoverPanels, scheduleCloseHoverPanels],
  );

  const syncSubmenuPanelPosition = React.useCallback(() => {
    const menuListElement = menuListRef.current;
    if (!menuListElement || hoverMenuMeta.items.length === 0) {
      return;
    }
    const rect = menuListElement.getBoundingClientRect();
    const nextTop = Math.round(rect.top);
    const nextLeft = Math.round(
      (hoverListOpen
        ? rect.left + OTHER_SPLIT_MENU_ICON_WIDTH + OTHER_SPLIT_MENU_LABEL_WIDTH
        : rect.right) -
        OTHER_SPLIT_MENU_PANEL_OVERLAP * 2,
    );
    const nextHeight = Math.round(rect.height);
    const prevRect = submenuPanelRectRef.current;
    if (
      prevRect &&
      prevRect.top === nextTop &&
      prevRect.left === nextLeft &&
      prevRect.height === nextHeight
    ) {
      return;
    }
    submenuPanelRectRef.current = {
      top: nextTop,
      left: nextLeft,
      height: nextHeight,
    };
    setSubmenuPanelStyle({
      top: nextTop,
      left: nextLeft,
      height: nextHeight,
    });
  }, [hoverListOpen, hoverMenuMeta.items.length]);

  React.useLayoutEffect(() => {
    syncSubmenuPanelPosition();
  }, [
    displayTopKey,
    hoverSubmenuOpen,
    hoverMenuMeta.items.length,
    syncSubmenuPanelPosition,
  ]);

  React.useEffect(() => {
    if (!hoverSubmenuOpen || hoverMenuMeta.items.length === 0) return undefined;
    const handlePositionSync = () => {
      syncSubmenuPanelPosition();
    };
    window.addEventListener('resize', handlePositionSync);
    window.addEventListener('scroll', handlePositionSync, true);
    return () => {
      window.removeEventListener('resize', handlePositionSync);
      window.removeEventListener('scroll', handlePositionSync, true);
    };
  }, [hoverMenuMeta.items.length, hoverSubmenuOpen, syncSubmenuPanelPosition]);

  React.useEffect(() => {
    if (!hoverListOpen || !hoverSubmenuOpen) return undefined;
    const menuListElement = menuListRef.current;
    if (!menuListElement) return undefined;
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== 'width' || event.target !== menuListElement)
        return;
      syncSubmenuPanelPosition();
    };
    menuListElement.addEventListener('transitionend', handleTransitionEnd);
    return () => {
      menuListElement.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, [hoverListOpen, hoverSubmenuOpen, syncSubmenuPanelPosition]);

  React.useEffect(() => {
    return () => {
      clearCloseTimer();
      clearCloseCleanupTimer();
    };
  }, [clearCloseCleanupTimer, clearCloseTimer]);

  if (!activeTopNode) {
    return <div className="other-menus-split-menu-empty" />;
  }

  return (
    <div className="other-menus-split-menu">
      <div
        ref={menuShellRef}
        className="other-menus-split-menu-shell"
        onMouseEnter={() => {
          handleHoverZoneEnter();
          openHoverPanels();
        }}
        onMouseLeave={handleHoverZoneLeave}
      >
        <div
          ref={menuListRef}
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
                onMouseEnter={() => openHoverPanels(node.key)}
                onFocus={() => openHoverPanels(node.key)}
                onClick={() => {
                  closeHoverPanelsImmediately();
                  handleTopClick(node);
                }}
              >
                <span className="other-menus-split-menu-item-icon">{icon}</span>
                <span className="other-menus-split-menu-item-label">
                  {node.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={submenuPanelRef}
        style={submenuPanelStyle}
        className={
          'other-menus-split-menu-submenu-panel' +
          (hoverSubmenuOpen && hoverMenuMeta.items.length > 0
            ? ' other-menus-split-menu-submenu-panel-open'
            : '')
        }
        onMouseEnter={handleHoverZoneEnter}
        onMouseLeave={handleHoverZoneLeave}
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
          className="other-menus-split-menu-ant other-menus-split-menu-submenu-ant"
        />
      </div>

      <div className="other-menus-split-menu-tree">
        <Menu
          mode="inline"
          items={menuMeta.items}
          selectedKeys={selectedKeys}
          openKeys={openKeys}
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
