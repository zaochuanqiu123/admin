import type { MenuDataItem } from '@ant-design/pro-components';

/**
 * 判断路径是否匹配
 */
export function isPathMatch(basePath: string, pathname: string): boolean {
  if (!basePath || !pathname) return false;
  if (basePath === '/') return pathname === '/';
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * 查找顶级菜单项
 */
export function findTopLevelMenuItem(
  menuData: MenuDataItem[] | undefined,
  pathname: string,
): MenuDataItem | undefined {
  if (!menuData || menuData.length === 0) return undefined;
  let best: MenuDataItem | undefined;
  for (const item of menuData) {
    const p = item?.path;
    if (!p) continue;
    if (isPathMatch(p, pathname)) {
      if (!best || (best.path?.length ?? 0) < p.length) {
        best = item;
      }
    }
  }
  return best;
}

/**
 * 计算可见的叶子节点数量
 */
export function countVisibleLeaves(items: MenuDataItem[] | undefined): number {
  if (!items || items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    if ((item as any)?.hideInMenu) continue;
    const children = item?.children?.filter((c) => !(c as any)?.hideInMenu);
    if (children && children.length > 0) {
      total += countVisibleLeaves(children);
      continue;
    }
    if (item?.path) total += 1;
  }
  return total;
}

/**
 * 解析顶级路由路径
 */
export function resolveTopRoutePath(route: any): string {
  if (!route) return '';
  if (typeof route.redirect === 'string' && route.redirect)
    return route.redirect;
  const children = route.routes;
  if (Array.isArray(children) && children.length > 0) {
    for (const child of children) {
      if (typeof child?.redirect === 'string' && child.redirect)
        return child.redirect;
      if (typeof child?.path === 'string' && child.path) return child.path;
      if (Array.isArray(child?.routes) && child.routes.length > 0) {
        const deep = resolveTopRoutePath(child);
        if (deep) return deep;
      }
    }
  }
  return typeof route.path === 'string' ? route.path : '';
}

/**
 * 获取允许访问的顶级路径集合
 */
export function getAllowedTopPaths(
  permContextMenu: MenuDataItem[] | undefined,
): Set<string> {
  const set = new Set<string>();
  set.add('/dashboard');
  if (Array.isArray(permContextMenu)) {
    for (const item of permContextMenu) {
      const p = (item as any)?.path;
      if (typeof p === 'string' && p) set.add(p);
    }
  }
  return set;
}
