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
import { Menu, type MenuProps, Tooltip } from 'antd';
import React from 'react';

type DashboardHomeSplitMenuProps = {
  topMenus?: MenuDataItem[];
  pathname: string;
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

function findFirstNavigableNode(
  node: MenuNode | undefined,
): { path?: string; targetId?: string } | undefined {
  if (!node) return undefined;
  const stack: MenuNode[] = [node];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.shift() as MenuNode;
    if (visited.has(current.key)) continue;
    visited.add(current.key);
    if (current.path) {
      return { path: current.path, targetId: current.targetId };
    }
    if (current.children && current.children.length > 0) {
      for (const child of current.children) {
        stack.push(child);
      }
    }
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

const DashboardHomeSplitMenu: React.FC<DashboardHomeSplitMenuProps> = ({
  topMenus,
  pathname,
  onNavigate,
}) => {
  const topNodes = React.useMemo(
    () => buildNodes(topMenus, 'top', new WeakSet<object>()),
    [topMenus],
  );
  const [activeTopKey, setActiveTopKey] = React.useState<string>('');
  const [openKeys, setOpenKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (topNodes.length === 0) {
      if (activeTopKey) setActiveTopKey('');
      return;
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
  }, [activeTopKey, pathname, topNodes]);

  const activeTopNode = React.useMemo(() => {
    if (topNodes.length === 0) return undefined;
    return topNodes.find((node) => node.key === activeTopKey) || topNodes[0];
  }, [activeTopKey, topNodes]);

  const menuMeta = React.useMemo(() => {
    const pathByKey = new Map<string, string>();
    const targetIdByKey = new Map<string, string | undefined>();
    const parentByKey = new Map<string, string | undefined>();
    const submenuKeys: string[] = [];
    const menuSourceNodes = activeTopNode?.children || [];

    const toMenuItem = (
      node: MenuNode,
      parentKey?: string,
    ): NonNullable<MenuProps['items']>[number] => {
      parentByKey.set(node.key, parentKey);
      if (node.path) {
        pathByKey.set(node.key, node.path);
        targetIdByKey.set(node.key, node.targetId);
      }
      const children =
        node.children && node.children.length > 0
          ? node.children.map((child) => toMenuItem(child, node.key))
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
  }, [activeTopNode]);

  const selectedKeys = React.useMemo(() => {
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
  }, [menuMeta.pathByKey, pathname]);

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

  const handleTopClick = React.useCallback(
    (node: MenuNode) => {
      setActiveTopKey(node.key);
      const defaultTarget = findFirstNavigableNode(node);
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

  if (!activeTopNode) {
    return <div className="dashboard-home-split-menu-empty" />;
  }

  return (
    <div className="dashboard-home-split-menu">
      <div className="dashboard-home-split-menu-icons">
        {topNodes.map((node, index) => {
          const active = node.key === activeTopNode.key;
          const icon = FIRST_LEVEL_ICONS[index % FIRST_LEVEL_ICONS.length];
          return (
            <Tooltip key={node.key} title={node.name} placement="right">
              <button
                type="button"
                className={
                  'dashboard-home-split-menu-icon-btn' +
                  (active ? ' dashboard-home-split-menu-icon-btn-active' : '')
                }
                aria-label={node.name}
                onClick={() => handleTopClick(node)}
              >
                <span className="dashboard-home-split-menu-icon">{icon}</span>
              </button>
            </Tooltip>
          );
        })}
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
      </div>
    </div>
  );
};

export default DashboardHomeSplitMenu;
