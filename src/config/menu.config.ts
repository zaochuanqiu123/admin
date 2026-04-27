import { AppstoreOutlined } from '@ant-design/icons';
import React from 'react';

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
  icon: React.ReactNode;
  children: CommonSubGroup[];
};

/**
 * 默认常用操作列表
 */
export const DEFAULT_COMMON_ACTIONS: CommonAction[] = [
  { id: 'role-list', title: '角色列表', path: '/permission/role-list' },
  { id: 'store-staff', title: '员工管理', path: '/permission/store-staff' },
  { id: 'qr-code', title: '二维码管理', path: '/platform/qr-code' },
  { id: 'qr-template', title: '二维码模板', path: '/platform/qr-template' },
  { id: 'speaker-list', title: '音箱管理', path: '/device/speaker-list' },
];

/**
 * 基础常用分组
 */
export const BASE_COMMON_GROUPS: CommonGroup[] = [
  {
    id: 'goods',
    title: '商品',
    icon: React.createElement(AppstoreOutlined),
    children: [
      {
        id: 'goods-manage',
        title: '商品管理',
        children: [
          { id: 'goods', title: '商品', path: '/goods' },
          { id: 'category', title: '类目管理', path: '/category' },
          { id: 'inventory', title: '库存查询', path: '/inventory' },
        ],
      },
      {
        id: 'goods-settings',
        title: '商品设置',
        children: [{ id: 'tags', title: '标签管理', path: '/tags' }],
      },
    ],
  },
  {
    id: 'service',
    title: '服务',
    icon: React.createElement(AppstoreOutlined),
    children: [
      {
        id: 'service-manage',
        title: '服务管理',
        children: [{ id: 'service', title: '服务', path: '/service' }],
      },
    ],
  },
  {
    id: 'order',
    title: '订单',
    icon: React.createElement(AppstoreOutlined),
    children: [
      {
        id: 'order-manage',
        title: '订单管理',
        children: [{ id: 'order', title: '订单', path: '/order' }],
      },
    ],
  },
];

/**
 * 额外常用分组
 */
export const EXTRA_COMMON_GROUPS: CommonGroup[] = [
  {
    id: 'private',
    title: '私域',
    icon: React.createElement(AppstoreOutlined),
    children: [
      {
        id: 'private-mini',
        title: '小程序',
        children: [
          {
            id: 'private-mini-home',
            title: '小程序首页',
            path: '/private/mini/home',
          },
        ],
      },
    ],
  },
];

/**
 * 完整的常用分组列表
 */
export const COMMON_GROUPS: CommonGroup[] = [
  ...EXTRA_COMMON_GROUPS,
  ...BASE_COMMON_GROUPS,
];

/**
 * 常用操作最大数量
 */
export const COMMON_ACTION_MAX = 10;

/**
 * 常用操作预览数量
 */
export const COMMON_ACTION_PREVIEW_COUNT = 7;
