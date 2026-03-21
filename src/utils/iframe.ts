import { getToken } from '@/api/storage';

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

export function buildIframeRouteWithParams(
  path: string,
  explicitTargetId?: string | number | null,
): string {
  const { pathname, searchParams } = splitPath(path);
  const currentTargetId = searchParams.get('targetId');
  const resolvedTargetId =
    currentTargetId ||
    (explicitTargetId !== undefined &&
    explicitTargetId !== null &&
    String(explicitTargetId) !== ''
      ? String(explicitTargetId)
      : undefined);

  if (resolvedTargetId) {
    searchParams.set('targetId', resolvedTargetId);

    const tokenInQuery = searchParams.get('token');
    const token = tokenInQuery || getToken();
    if (token) {
      searchParams.set('token', token);
    }
  }

  const nextSearch = searchParams.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}
