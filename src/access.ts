import { hasButtonPermission } from '@/utils/button-permission';

/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState:
    | {
        currentUser?: API.CurrentUser;
        buttonPermissions?: API.ButtonPermissionMap;
      }
    | undefined,
) {
  const { currentUser } = initialState ?? {};
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    hasButtonPerm: (perm: string | string[]) =>
      hasButtonPermission(initialState?.buttonPermissions, perm),
  };
}
