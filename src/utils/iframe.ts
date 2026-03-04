import type { MenuDataItem } from '@ant-design/pro-components';
import { getToken } from '@/api/storage';
import { IFRAME_PATHS } from '@/config/iframe.config';
import { findTargetIdByPath } from '@/utils/menu';

function splitPath(inputPath: string): {
  pathname: string;
  searchParams: URLSearchParams;
} {
  const [pathnamePart, queryPart = ''] = inputPath.split('?');
  return {
    pathname: pathnamePart || '/',
    searchParams: new URLSearchParams(queryPart),
  };
}

export function normalizeIframePath(pathname: string): string {
  return pathname;
}

export function isIframeRoutePath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  const normalizedPath = normalizeIframePath(pathname);
  // 只有精确匹配 IFRAME_PATHS 中的路径才算 iframe 路由
  return IFRAME_PATHS.includes(normalizedPath);
}

export function buildIframeRouteWithParams(
  path: string,
  menuData?: MenuDataItem[],
  explicitTargetId?: string | number | null,
): string {
  const { pathname, searchParams } = splitPath(path);
  const normalizedPath = normalizeIframePath(pathname);

  // 只有 iframe 路由才添加 targetId 和 token
  const isIframePath = isIframeRoutePath(normalizedPath);

  if (isIframePath) {
    const currentTargetId = searchParams.get('targetId');
    if (!currentTargetId) {
      const fallbackTargetId =
        explicitTargetId !== undefined &&
        explicitTargetId !== null &&
        String(explicitTargetId) !== ''
          ? String(explicitTargetId)
          : findTargetIdByPath(menuData, normalizedPath);
      if (fallbackTargetId) {
        searchParams.set('targetId', fallbackTargetId);
      }
    }

    const tokenInQuery = searchParams.get('token');
    const token = tokenInQuery || getToken();
    if (token) {
      searchParams.set('token', token);
    }
  }

  const nextSearch = searchParams.toString();
  return nextSearch ? `${normalizedPath}?${nextSearch}` : normalizedPath;
}
