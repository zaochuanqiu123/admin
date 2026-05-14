import type { ReactNode } from 'react';

/**
 * 常用操作类型定义
 */
export type CommonAction = {
  id: string;
  title: string;
  path: string;
  targetId?: string;
  sourceSystem?: number;
  favoriteMenuId?: string;
};

type CommonActionIdentity = Pick<CommonAction, 'id' | 'title' | 'path'>;

function normalizeCommonActionPath(path?: string) {
  const rawPath = typeof path === 'string' ? path.trim() : '';
  if (!rawPath) return '';
  const pathname = rawPath.split(/[?#]/)[0] || '';
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function isHomepageCommonAction(
  action?: Partial<CommonActionIdentity> | null,
) {
  if (!action) return false;
  const path = normalizeCommonActionPath(action.path);
  const title = typeof action.title === 'string' ? action.title.trim() : '';
  const id = typeof action.id === 'string' ? action.id.trim() : '';
  return (
    path === '/dashboard' ||
    path === '/dashboard/index' ||
    title === '首页' ||
    title === '首页' ||
    id === 'dashboard-index'
  );
}

export function filterHomepageCommonActions<T extends CommonActionIdentity>(
  actions: T[],
) {
  const filtered = actions.filter((action) => !isHomepageCommonAction(action));
  return filtered.length === actions.length ? actions : filtered;
}

export type CommonSubGroup = {
  id: string;
  title: string;
  children: CommonAction[];
};

export type CommonGroup = {
  id: string;
  title: string;
  icon: ReactNode;
  children: CommonSubGroup[];
};

/**
 * 常用操作最大数量
 */
export const COMMON_ACTION_MAX = 10;

/**
 * 常用操作预览数量
 */
export const COMMON_ACTION_PREVIEW_COUNT = 7;
