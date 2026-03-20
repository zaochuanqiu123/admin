import type { MenuDataItem } from '@ant-design/pro-components';
import { resolveTopRoutePath } from '@/utils/route.utils';
import routes from '../../config/routes';

export const TEMP_BUSINESS_CODE = 'DEFAULT';

function buildRouteNamePathMap(routeList: any[]): Record<string, string> {
  const map: Record<string, string> = {};

  const walk = (items: any[]) => {
    for (const item of items || []) {
      const routeName =
        typeof item?.name === 'string' ? item.name.trim() : undefined;
      const fallbackPath =
        typeof item?.path === 'string' ? String(item.path) : undefined;
      const resolvedPath = resolveTopRoutePath(item);
      const routePath = String(resolvedPath || fallbackPath || '');

      if (routeName && routePath.startsWith('/')) {
        map[routeName] = routePath;
      }

      if (Array.isArray(item?.routes) && item.routes.length > 0) {
        walk(item.routes);
      }
    }
  };

  walk(routeList || []);
  return map;
}

const ROUTE_NAME_TO_PATH_MAP = buildRouteNamePathMap(routes as any[]);

const LOCAL_MENU_PATH_OVERRIDES: Record<string, string> = {
  角色权限: '/set/role-permission',
};

function pickTargetId(node: any): string | undefined {
  const raw =
    node?.pathUrl ?? node?.targetId ?? node?.targetID ?? node?.target_id;
  if (raw === undefined || raw === null) return undefined;
  const value = String(raw).trim();
  return value || undefined;
}

function pickPath(node: any, menuName: string): string | undefined {
  const overridePath = LOCAL_MENU_PATH_OVERRIDES[menuName];
  if (overridePath) {
    return overridePath;
  }

  const backendPath = String(
    node?.path ??
      node?.url ??
      node?.router ??
      node?.routePath ??
      node?.href ??
      '',
  ).trim();
  if (backendPath.startsWith('/')) {
    return backendPath;
  }

  const routePath = ROUTE_NAME_TO_PATH_MAP[menuName];
  if (routePath && routePath.startsWith('/')) {
    return routePath;
  }

  return undefined;
}

function getNodeName(node: any, index: number): string {
  const rawName =
    node?.permName ??
    node?.name ??
    node?.title ??
    node?.menuName ??
    node?.text ??
    node?.label;
  const value = String(rawName ?? '').trim();
  return value || `menu-${index}`;
}

export function extractPermContextNodes(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray((res as any)?.menuTree)) return (res as any).menuTree;
  if (Array.isArray((res as any)?.data?.menuTree))
    return (res as any).data.menuTree;
  if (Array.isArray((res as any)?.list)) return (res as any).list;
  if (Array.isArray((res as any)?.menuList)) return (res as any).menuList;
  if (Array.isArray((res as any)?.menus)) return (res as any).menus;
  if (Array.isArray((res as any)?.tree)) return (res as any).tree;
  if (Array.isArray((res as any)?.data)) return (res as any).data;
  if (Array.isArray((res as any)?.data?.list)) return (res as any).data.list;
  if (Array.isArray((res as any)?.data?.menuList))
    return (res as any).data.menuList;
  if (Array.isArray((res as any)?.data?.menus)) return (res as any).data.menus;
  if (Array.isArray((res as any)?.data?.tree)) return (res as any).data.tree;
  return [];
}

export function mapPermContextToMenuData(nodes: any[]): MenuDataItem[] {
  const visit = (
    node: any,
    index: number,
    inheritedPath?: string,
  ): (MenuDataItem & { targetId?: string; sort?: number }) | null => {
    if (node?.permType === 3) {
      return null;
    }

    const name = getNodeName(node, index);
    const path = pickPath(node, name) || inheritedPath;

    const childrenSource =
      (Array.isArray(node?.children) && node.children) ||
      (Array.isArray(node?.childList) && node.childList) ||
      (Array.isArray(node?.child) && node.child) ||
      [];

    const children = (childrenSource as any[])
      .map((child, childIndex) => visit(child, childIndex, path))
      .filter(
        (item): item is MenuDataItem & { targetId?: string; sort?: number } =>
          item !== null,
      );

    if (children.length > 0) {
      children.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    }

    return {
      name,
      path,
      children: children.length > 0 ? children : undefined,
      targetId: pickTargetId(node),
      sort: node?.sort ?? 0,
    } as MenuDataItem & { targetId?: string; sort?: number };
  };

  const result = (nodes || [])
    .map((node, index) => visit(node, index))
    .filter(
      (item): item is MenuDataItem & { targetId?: string; sort?: number } =>
        item !== null,
    );

  result.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return result;
}

export function validateBusinessCode(
  businessCode: string | undefined,
  businessList: any[] | undefined,
): boolean {
  if (!businessCode || !businessList || businessList.length === 0) {
    return false;
  }
  return businessList.some((item: any) => item.businessCode === businessCode);
}

export function getValidBusinessCode(
  currentBusinessCode: string | undefined,
  businessList: any[] | undefined,
): string {
  if (!businessList || businessList.length === 0) {
    return TEMP_BUSINESS_CODE;
  }

  if (validateBusinessCode(currentBusinessCode, businessList)) {
    return currentBusinessCode as string;
  }

  return businessList[0]?.businessCode || TEMP_BUSINESS_CODE;
}

function normalizePath(path: string | undefined): string {
  if (!path) return '';
  const noQuery = path.split('?')[0]?.split('#')[0] || '';
  if (!noQuery) return '';
  if (noQuery === '/') return '/';
  const normalized = noQuery.endsWith('/') ? noQuery.slice(0, -1) : noQuery;
  return normalized || '/';
}

function flattenMenuData(
  items: MenuDataItem[] | undefined,
): (MenuDataItem & { targetId?: string; depth?: number })[] {
  if (!items || items.length === 0) return [];
  const result: (MenuDataItem & { targetId?: string; depth?: number })[] = [];

  const walk = (nodes: MenuDataItem[], depth: number) => {
    for (const node of nodes) {
      result.push({
        ...(node as MenuDataItem & { targetId?: string }),
        depth,
      });
      if (Array.isArray(node?.children) && node.children.length > 0) {
        walk(node.children, depth + 1);
      }
    }
  };

  walk(items, 0);
  return result;
}

function pickBestTargetIdCandidate(
  items: (MenuDataItem & { targetId?: string; depth?: number })[],
  targetPath: string,
): string | undefined {
  const candidates = items.filter((item) => {
    const itemPath = normalizePath(item?.path as string | undefined);
    return itemPath === targetPath && item?.targetId;
  });

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    const depthA = Number(a.depth ?? Number.MAX_SAFE_INTEGER);
    const depthB = Number(b.depth ?? Number.MAX_SAFE_INTEGER);
    return depthA - depthB;
  });

  return candidates[0]?.targetId ? String(candidates[0].targetId) : undefined;
}

export function findTargetIdByPath(
  menuData: MenuDataItem[] | undefined,
  path: string | undefined,
): string | undefined {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return undefined;

  const moduleRoot = `/${normalizedPath.split('/').filter(Boolean)[0] || ''}`;
  const topLevelModuleNode =
    Array.isArray(menuData) && moduleRoot && moduleRoot !== '/'
      ? (menuData.find((item) => {
          const itemPath = normalizePath(item?.path as string | undefined);
          return itemPath === moduleRoot;
        }) as MenuNodeWithTarget | undefined)
      : undefined;

  if (topLevelModuleNode) {
    const branchMenus = flattenMenuData([topLevelModuleNode]);
    const branchExactTargetId = pickBestTargetIdCandidate(
      branchMenus,
      normalizedPath,
    );
    if (branchExactTargetId) return branchExactTargetId;

    const branchRootTargetId = pickBestTargetIdCandidate(
      branchMenus,
      moduleRoot,
    );
    if (branchRootTargetId) return branchRootTargetId;

    const branchFirstLeafTarget = findFirstLeafMenuTarget(
      topLevelModuleNode,
      getMenuNodePath(topLevelModuleNode),
    );
    if (branchFirstLeafTarget?.targetId) {
      return branchFirstLeafTarget.targetId;
    }
  }

  const flatMenus = flattenMenuData(menuData);
  const exactTargetId = pickBestTargetIdCandidate(flatMenus, normalizedPath);
  if (exactTargetId) return exactTargetId;

  if (!moduleRoot || moduleRoot === '/') return undefined;

  const rootTargetId = pickBestTargetIdCandidate(flatMenus, moduleRoot);
  if (rootTargetId) return rootTargetId;

  return undefined;
}

export function findPathByTargetId(
  menuData: MenuDataItem[] | undefined,
  targetId: string | number | undefined,
): string | undefined {
  if (targetId === undefined || targetId === null) return undefined;
  const target = String(targetId);

  const flatMenus = flattenMenuData(menuData);
  const match = flatMenus.find((item) => {
    if (!item?.targetId || !item?.path) return false;
    return String(item.targetId) === target;
  });

  const matchPath = match?.path ? String(match.path) : '';
  return matchPath.startsWith('/') ? matchPath : undefined;
}

type MenuTarget = {
  path?: string;
  targetId?: string;
};

type MenuNodeWithTarget = MenuDataItem & { targetId?: string };

function getMenuChildren(node: MenuDataItem | undefined): MenuNodeWithTarget[] {
  if (!node || !Array.isArray(node.children) || node.children.length === 0) {
    return [];
  }
  return node.children as MenuNodeWithTarget[];
}

function getMenuNodePath(node: MenuDataItem | undefined): string | undefined {
  const pathValue = node?.path ? String(node.path).trim() : '';
  return pathValue.startsWith('/') ? pathValue : undefined;
}

function getMenuNodeTargetId(
  node: MenuDataItem | undefined,
): string | undefined {
  const rawTargetId = (node as any)?.targetId;
  if (rawTargetId === undefined || rawTargetId === null) return undefined;
  const value = String(rawTargetId);
  return value || undefined;
}

export function findFirstLeafMenuTarget(
  node: MenuDataItem | undefined,
  inheritedPath?: string,
): MenuTarget | undefined {
  if (!node) return undefined;
  const currentPath = getMenuNodePath(node) || inheritedPath;

  const children = getMenuChildren(node);
  if (children.length === 0) {
    if (!currentPath) return undefined;
    return { path: currentPath, targetId: getMenuNodeTargetId(node) };
  }

  for (const child of children) {
    const leafTarget = findFirstLeafMenuTarget(child, currentPath);
    if (leafTarget?.path) return leafTarget;
  }

  return undefined;
}
