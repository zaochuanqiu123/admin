import {
  clearBusinessList,
  clearCurrentBusinessCode,
  clearRouteTabs,
  clearSelectedOrgCode,
  emitRouteTabsResetEvent,
} from '@/api/storage';

const WORKPLACE_COMMON_ACTIONS_PREFIX = 'workplace_common_actions_';

export function clearWorkplaceCommonActionsCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(WORKPLACE_COMMON_ACTIONS_PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
}

export function clearStoreScopedStorage() {
  clearSelectedOrgCode();
  clearBusinessList();
  clearCurrentBusinessCode();
  clearRouteTabs();
  emitRouteTabsResetEvent();
  clearWorkplaceCommonActionsCache();
}

export function resetStoreScopedInitialState<
  T extends Record<string, any> | undefined,
>(state: T) {
  const next = {
    ...(state || {}),
    currentOrgCode: undefined,
    loginContext: undefined,
    permContextMenu: undefined,
    businessList: undefined,
    currentBusinessCode: undefined,
    commonActions: undefined,
    setCommonActions: undefined,
  };

  if (typeof window !== 'undefined') {
    (window as any).g_initialState = next;
  }

  return next;
}
