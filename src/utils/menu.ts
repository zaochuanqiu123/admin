/**
 * 菜单工具函数
 * 用于处理权限菜单的转换和映射
 */

import type { MenuDataItem } from '@ant-design/pro-components';

// 临时业态代码（当没有有效业态时使用）
export const TEMP_BUSINESS_CODE = 'DEFAULT';

// 菜单名称到路由路径的映射（工作台除外，工作台固定不变）
export const MENU_NAME_TO_PATH_MAP: Record<string, string> = {
  门店: '/form',
  商品: '/list',
  进销存: '/profile',
  订单: '/result',
  会员: '/exception',
  数据: '/account',
  财务: '/finance',
  设置: '/set',
  应用: '/admin',
};

/**
 * 从 getPermContext 响应中提取菜单节点
 * 兼容多种可能的响应结构
 */
export function extractPermContextNodes(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  // 优先检查 menuTree（兼容 apiData 解包后的结构：res 就是 data 本体）
  if (Array.isArray((res as any)?.menuTree)) return (res as any).menuTree;
  // 兼容未解包结构：res.data.menuTree
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

/**
 * 将权限上下文节点映射为 ProLayout 菜单数据
 * @param nodes 权限节点数组
 * @returns 菜单数据数组
 */
export function mapPermContextToMenuData(nodes: any[]): MenuDataItem[] {
  const visit = (
    n: any,
    idx: number,
  ): (MenuDataItem & { targetId?: string; sort?: number }) | null => {
    // 过滤按钮类型（permType === 3）
    if (n?.permType === 3) {
      return null;
    }

    const name = String(
      n?.permName ?? // 优先使用 permName
        n?.name ??
        n?.title ??
        n?.menuName ??
        n?.text ??
        n?.label ??
        `menu-${idx}`,
    );

    // 根据菜单名称映射到固定的路由路径
    let path = MENU_NAME_TO_PATH_MAP[name];

    // 如果映射表中没有，尝试从其他字段获取
    if (!path) {
      path =
        String(
          n?.path ?? n?.url ?? n?.router ?? n?.routePath ?? n?.href ?? '',
        ) || undefined;
    }

    const childrenSrc =
      (Array.isArray(n?.children) && n.children) ||
      (Array.isArray(n?.childList) && n.childList) ||
      (Array.isArray(n?.child) && n.child) ||
      [];

    // 递归处理子节点，过滤掉 null 值
    const children = (childrenSrc as any[])
      .map((c, i) => visit(c, i))
      .filter(
        (c): c is MenuDataItem & { targetId?: string; sort?: number } =>
          c !== null,
      );

    // 按 sort 字段排序子节点
    if (children.length > 0) {
      children.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    }

    const item = {
      name,
      path,
      children: children.length > 0 ? children : undefined,
      targetId: n?.pathUrl ?? n?.id, // 保留 pathUrl 作为 targetId
      sort: n?.sort ?? 0,
    } as MenuDataItem & { targetId?: string; sort?: number };

    return item;
  };

  // 处理根节点，过滤掉 null 值和工作台菜单
  const result = (nodes || [])
    .map((n, i) => visit(n, i))
    .filter((n): n is MenuDataItem & { targetId?: string; sort?: number } => {
      // 过滤掉 null 和工作台菜单（工作台固定不变）
      return n !== null && n.name !== '工作台';
    });

  // 按 sort 字段排序根节点
  result.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return result;
}

/**
 * 验证业态代码是否在业态列表中
 * @param businessCode 业态代码
 * @param businessList 业态列表
 * @returns 是否有效
 */
export function validateBusinessCode(
  businessCode: string | undefined,
  businessList: any[] | undefined,
): boolean {
  if (!businessCode || !businessList || businessList.length === 0) {
    return false;
  }
  return businessList.some((b: any) => b.businessCode === businessCode);
}

/**
 * 获取有效的业态代码
 * 如果当前业态代码无效，返回列表中的第一个业态代码
 * @param currentBusinessCode 当前业态代码
 * @param businessList 业态列表
 * @returns 有效的业态代码
 */
export function getValidBusinessCode(
  currentBusinessCode: string | undefined,
  businessList: any[] | undefined,
): string {
  // 如果业态列表为空，返回临时代码
  if (!businessList || businessList.length === 0) {
    return TEMP_BUSINESS_CODE;
  }

  // 如果当前业态代码有效，返回它
  if (validateBusinessCode(currentBusinessCode, businessList)) {
    return currentBusinessCode as string;
  }

  // 否则返回列表中的第一个业态代码
  return businessList[0]?.businessCode || TEMP_BUSINESS_CODE;
}
