import {
  type CommonAction,
  filterHomepageCommonActions,
} from '@/config/menu.config';

const LEGACY_PLACEHOLDER_ACTION_IDS = new Set([
  'recharge',
  'coupon',
  'batch-pay',
  'withdraw',
  'bill-download',
  'pay-gift',
  'transfer',
]);

/**
 * 从 localStorage 读取常用操作列表
 */
export function readCommonActionsFromStorage(
  storageKey: string,
): CommonAction[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const list: CommonAction[] = parsed
      .filter((x: any) => x && typeof x === 'object')
      .filter(
        (x: any) =>
          typeof x.id === 'string' &&
          typeof x.title === 'string' &&
          typeof x.path === 'string',
      )
      .map((x: any) => ({
        id: x.id,
        title: x.title,
        path: x.path,
        targetId: typeof x.targetId === 'string' ? x.targetId : undefined,
        sourceSystem:
          typeof x.sourceSystem === 'number' ? x.sourceSystem : undefined,
      }));
    const filteredList = filterHomepageCommonActions(list);
    if (
      filteredList.length > 0 &&
      filteredList.every((item) => LEGACY_PLACEHOLDER_ACTION_IDS.has(item.id))
    ) {
      return null;
    }
    return filteredList.length ? filteredList : null;
  } catch {
    return null;
  }
}

/**
 * 将常用操作列表写入 localStorage
 */
export function writeCommonActionsToStorage(
  storageKey: string,
  list: CommonAction[],
) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(filterHomepageCommonActions(list)),
    );
  } catch {
    // ignore
  }
}

/**
 * 从 localStorage 读取分组顺序
 */
export function readGroupOrderFromStorage(
  storageKey: string,
  defaultOrder: string[],
): string[] {
  try {
    const rawOrder = localStorage.getItem(`${storageKey}__groupOrder`);
    if (!rawOrder) return defaultOrder;

    const parsed = JSON.parse(rawOrder);
    if (!Array.isArray(parsed)) return defaultOrder;

    const filtered = parsed.filter((x: any) => typeof x === 'string');
    const uniq: string[] = [];
    for (const x of filtered) {
      if (!uniq.includes(x)) uniq.push(x);
    }

    // 合并：保留已保存的顺序，补充新增的默认项
    const merged = [
      ...uniq.filter((x) => defaultOrder.includes(x)),
      ...defaultOrder.filter((x) => !uniq.includes(x)),
    ];

    return merged;
  } catch {
    return defaultOrder;
  }
}

/**
 * 将分组顺序写入 localStorage
 */
export function writeGroupOrderToStorage(storageKey: string, order: string[]) {
  try {
    localStorage.setItem(`${storageKey}__groupOrder`, JSON.stringify(order));
  } catch {
    // ignore
  }
}
