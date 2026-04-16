import type { MenuDataItem } from '@ant-design/pro-components';
import { extractButtonPermissionTokens } from '@/utils/button-permission';
import { resolveTopRoutePath } from '@/utils/route.utils';
import routes from '../../config/routes';

export const TEMP_BUSINESS_CODE = 'DEFAULT';

function normalizeLookupPath(path: string | undefined): string {
  const raw = String(path || '').trim();
  if (!raw) return '';
  const noQuery = raw.split('?')[0]?.split('#')[0] || '';
  if (!noQuery) return '';
  if (noQuery === '/') return '/';
  return noQuery.endsWith('/') ? noQuery.slice(0, -1) : noQuery;
}

function buildRouteLookupMaps(routeList: any[]) {
  const nameToPathMap: Record<string, string> = {};
  const backendPathToRouteMap: Record<string, string> = {};
  const navigableRoutePaths = new Set<string>();

  const walk = (items: any[]) => {
    for (const item of items || []) {
      const routeName =
        typeof item?.name === 'string' ? item.name.trim() : undefined;
      const fallbackPath =
        typeof item?.path === 'string' ? String(item.path) : undefined;
      const resolvedPath = resolveTopRoutePath(item);
      const routePath = normalizeLookupPath(
        String(resolvedPath || fallbackPath || ''),
      );

      if (routeName && routePath.startsWith('/')) {
        nameToPathMap[routeName] = routePath;
      }

      if (
        routePath.startsWith('/') &&
        !Array.isArray(item?.routes) &&
        (typeof item?.component === 'string' ||
          typeof item?.redirect === 'string')
      ) {
        navigableRoutePaths.add(routePath);
      }

      if (Array.isArray(item?.backendPathUrls) && routePath.startsWith('/')) {
        item.backendPathUrls.forEach((backendPath: unknown) => {
          const normalizedBackendPath = normalizeLookupPath(
            typeof backendPath === 'string' ? backendPath : '',
          );
          if (normalizedBackendPath) {
            backendPathToRouteMap[normalizedBackendPath] = routePath;
          }
        });
      }

      if (Array.isArray(item?.routes) && item.routes.length > 0) {
        walk(item.routes);
      }
    }
  };

  walk(routeList || []);
  return {
    nameToPathMap,
    backendPathToRouteMap,
    navigableRoutePaths,
  };
}

const {
  nameToPathMap: ROUTE_NAME_TO_PATH_MAP,
  backendPathToRouteMap: BACKEND_PATH_TO_ROUTE_MAP,
  navigableRoutePaths: NAVIGABLE_ROUTE_PATHS,
} = buildRouteLookupMaps(routes as any[]);

function pickSourceSystem(node: any): number | undefined {
  const value = Number(node?.sourceSystem);
  return Number.isFinite(value) ? value : undefined;
}

function pickTargetId(node: any): string | undefined {
  if (pickSourceSystem(node) !== 1) return undefined;

  const raw =
    node?.oldId ??
    node?.oldID ??
    node?.oldid ??
    node?.targetId ??
    node?.targetID ??
    node?.target_id;
  if (raw === undefined || raw === null) return undefined;
  const value = String(raw).trim();
  return value || undefined;
}

function collectPathCandidates(
  node: any,
  sourceSystem: number | undefined,
): string[] {
  const preferredKeys =
    sourceSystem === 0
      ? ['pathUrl', 'path', 'url', 'router', 'routePath', 'href']
      : ['path', 'url', 'router', 'routePath', 'href', 'pathUrl'];
  const result: string[] = [];

  preferredKeys.forEach((key) => {
    const rawValue = node?.[key];
    if (typeof rawValue !== 'string') return;
    const value = rawValue.trim();
    if (!value || result.includes(value)) return;
    result.push(value);
  });

  return result;
}

function resolveKnownRoutePath(path: string | undefined): string | undefined {
  const normalizedPath = normalizeLookupPath(path);
  if (!normalizedPath) return undefined;
  return NAVIGABLE_ROUTE_PATHS.has(normalizedPath) ? normalizedPath : undefined;
}

function pickPath(node: any, menuName: string): string | undefined {
  const sourceSystem = pickSourceSystem(node);
  const pathCandidates = collectPathCandidates(node, sourceSystem);

  if (sourceSystem !== 1) {
    // 优先通过 backendPathUrls 映射表查找
    for (const candidate of pathCandidates) {
      const mappedLocalPath =
        BACKEND_PATH_TO_ROUTE_MAP[normalizeLookupPath(candidate)];
      if (mappedLocalPath) {
        return mappedLocalPath;
      }
    }

    // 然后在已知路由路径中精确匹配
    for (const candidate of pathCandidates) {
      const knownRoutePath = resolveKnownRoutePath(candidate);
      if (knownRoutePath) {
        return knownRoutePath;
      }
    }
  } else {
    // sourceSystem=1（iframe），优先精确匹配已知路由
    for (const candidate of pathCandidates) {
      const knownRoutePath = resolveKnownRoutePath(candidate);
      if (knownRoutePath) {
        return knownRoutePath;
      }
    }
  }

  // 按菜单名称回退查找
  const fallbackRoutePath = ROUTE_NAME_TO_PATH_MAP[menuName];
  if (fallbackRoutePath?.startsWith('/')) {
    return fallbackRoutePath;
  }

  // === fallback：白名单中找不到时，尝试一级路径段匹配 ===
  // 注意：不能直接返回后端原始路径（如 /Retail/Store/store），
  // 那些是后端 API 路径而非前端路由，会导致 404。
  // 这里只匹配一级路径段已知的情况（如 /app、/device 等 iframe-view 路由）
  for (const candidate of pathCandidates) {
    const normalized = normalizeLookupPath(candidate);
    if (!normalized || !normalized.startsWith('/')) continue;
    const firstSegment = `/${normalized.split('/').filter(Boolean)[0] || ''}`;
    if (
      firstSegment &&
      firstSegment !== '/' &&
      NAVIGABLE_ROUTE_PATHS.has(firstSegment)
    ) {
      return firstSegment;
    }
  }

  // sourceSystem=1（iframe 嵌入）的菜单：使用默认 iframe 路由兜底
  // 所有 iframe 路由（/app、/device 等）都渲染同一个 MicroIframe 组件，
  // 实际页面内容由 targetId 区分，因此 path 用哪个 iframe 路由都可以
  if (sourceSystem === 1) {
    return '/app';
  }

  // sourceSystem≠1 的菜单：返回 undefined，让 mapPermContextToMenuData 继承父级 path
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
    inheritedTargetId?: string,
    inheritedSourceSystem?: number,
  ):
    | (MenuDataItem & {
        targetId?: string;
        sourceSystem?: number;
        sort?: number;
      })
    | null => {
    if (node?.permType === 3) {
      return null;
    }

    const name = getNodeName(node, index);
    const sourceSystem = pickSourceSystem(node) ?? inheritedSourceSystem;
    const targetId =
      pickTargetId(node) ??
      (sourceSystem === 1 ? inheritedTargetId : undefined);
    const path = pickPath(node, name) || inheritedPath;

    const childrenSource =
      (Array.isArray(node?.children) && node.children) ||
      (Array.isArray(node?.childList) && node.childList) ||
      (Array.isArray(node?.child) && node.child) ||
      [];

    const children = (childrenSource as any[])
      .map((child, childIndex) =>
        visit(child, childIndex, path, targetId, sourceSystem),
      )
      .filter(
        (
          item,
        ): item is MenuDataItem & {
          targetId?: string;
          sourceSystem?: number;
          sort?: number;
        } => item !== null,
      );

    return {
      name,
      path,
      children: children.length > 0 ? children : undefined,
      targetId,
      sourceSystem,
      sort: node?.sort ?? 0,
    } as MenuDataItem & {
      targetId?: string;
      sourceSystem?: number;
      sort?: number;
    };
  };

  const result = (nodes || [])
    .map((node, index) => visit(node, index))
    .filter(
      (
        item,
      ): item is MenuDataItem & {
        targetId?: string;
        sourceSystem?: number;
        sort?: number;
      } => item !== null,
    );

  const permissionMenu = result.find((item) => {
    const name = String(item?.name || '').trim();
    const path = normalizeLookupPath(String(item?.path || ''));
    const children = Array.isArray(item?.children) ? item.children : [];
    return (
      name === '权限管理' ||
      path === '/permission' ||
      children.some(
        (child) =>
          normalizeLookupPath(String(child?.path || '')) ===
          '/permission/role-list',
      )
    );
  });

  if (permissionMenu) {
    const children = Array.isArray(permissionMenu.children)
      ? permissionMenu.children
      : [];
    const hasStoreStaff = children.some(
      (item) =>
        String(item?.name || '').trim() === '员工管理' ||
        normalizeLookupPath(String(item?.path || '')) ===
          '/permission/store-staff',
    );

    if (!hasStoreStaff) {
      permissionMenu.children = [
        ...children,
        {
          name: '员工管理',
          path: '/permission/store-staff',
          sort: 0,
        } as MenuDataItem,
      ];
    }
  }

  return result;
}

export function extractButtonPermissionMap(res: any): API.ButtonPermissionMap {
  const tokenSet = new Set<string>();
  const permCodes =
    (Array.isArray(res?.data?.permCodes) && res.data.permCodes) ||
    (Array.isArray(res?.permCodes) && res.permCodes) ||
    [];

  extractButtonPermissionTokens(permCodes).forEach((token) => {
    tokenSet.add(token);
  });
  return Array.from(tokenSet);
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

export function resolveMenuTitle(
  menuData: MenuDataItem[] | undefined,
  path: string | undefined,
  targetId?: string | number,
): string | undefined {
  const flatMenus = flattenMenuData(menuData);
  if (flatMenus.length === 0) return undefined;

  const normalizedPath = normalizePath(path);
  const normalizedTargetId =
    targetId === undefined || targetId === null ? '' : String(targetId);

  if (normalizedTargetId) {
    const targetMatches = flatMenus
      .filter((item) => String(item?.targetId || '') === normalizedTargetId)
      .sort((a, b) => Number(b.depth ?? 0) - Number(a.depth ?? 0));
    const targetTitle = targetMatches.find((item) =>
      String(item?.name || '').trim(),
    )?.name;
    if (typeof targetTitle === 'string' && targetTitle.trim()) {
      return targetTitle.trim();
    }
  }

  if (!normalizedPath) return undefined;

  const pathMatches = flatMenus
    .filter(
      (item) =>
        normalizePath(item?.path as string | undefined) === normalizedPath,
    )
    .sort((a, b) => Number(b.depth ?? 0) - Number(a.depth ?? 0));
  const pathTitle = pathMatches.find((item) =>
    String(item?.name || '').trim(),
  )?.name;
  if (typeof pathTitle === 'string' && pathTitle.trim()) {
    return pathTitle.trim();
  }

  return undefined;
}

type MenuTarget = {
  path?: string;
  targetId?: string;
  sourceSystem?: number;
};

type MenuNodeWithTarget = MenuDataItem & {
  targetId?: string;
  sourceSystem?: number;
};

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

function getMenuNodeSourceSystem(
  node: MenuDataItem | undefined,
): number | undefined {
  const rawSourceSystem = (node as any)?.sourceSystem;
  const value = Number(rawSourceSystem);
  return Number.isFinite(value) ? value : undefined;
}

export function findFirstLeafMenuTarget(
  node: MenuDataItem | undefined,
  inheritedPath?: string,
  inheritedTargetId?: string,
  inheritedSourceSystem?: number,
): MenuTarget | undefined {
  if (!node) return undefined;
  const currentPath = getMenuNodePath(node) || inheritedPath;
  const currentTargetId = getMenuNodeTargetId(node) || inheritedTargetId;
  const currentSourceSystem =
    getMenuNodeSourceSystem(node) ?? inheritedSourceSystem;

  const children = getMenuChildren(node);
  if (children.length === 0) {
    if (!currentPath) return undefined;
    return {
      path: currentPath,
      targetId: currentTargetId,
      sourceSystem: currentSourceSystem,
    };
  }

  for (const child of children) {
    const leafTarget = findFirstLeafMenuTarget(
      child,
      currentPath,
      currentTargetId,
      currentSourceSystem,
    );
    if (leafTarget?.path) return leafTarget;
  }

  return undefined;
}
