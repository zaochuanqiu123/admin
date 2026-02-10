import { AppstoreOutlined } from '@ant-design/icons';
import React from 'react';

/**
 * 菜单 ID 映射表
 */
export const MENU_ID_MAP: Record<string, number> = {
  工作台: 163,
  门店: 1457,
  商品: 1459,
  进销存: 206,
  订单: 1432,
  会员: 215,
  数据: 1917,
  财务: 1464,
  设置: 303,
  应用: 1495,
};

/**
 * 常用操作类型定义
 */
export type CommonAction = {
  id: string;
  title: string;
  path: string;
};

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
  { id: 'recharge', title: '充值', path: '/finance' },
  { id: 'coupon', title: '优惠券管理', path: '/set' },
  { id: 'batch-pay', title: '批量付款', path: '/finance' },
  { id: 'withdraw', title: '提现', path: '/finance' },
  { id: 'bill-download', title: '账单下载', path: '/finance' },
  { id: 'pay-gift', title: '支付有礼', path: '/set' },
  { id: 'transfer', title: '转账', path: '/finance' },
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
