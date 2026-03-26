import { history } from '@umijs/max';
import { message, Modal } from 'antd';
import {
  clearBusinessList,
  clearCurrentBusinessCode,
  clearLoginOrgList,
  clearLoginUserInfo,
  clearRouteTabs,
  clearSelectedOrgCode,
  clearToken,
} from '@/api/storage';

const loginPath = '/user/login';
const redirectStorageKey = 'post_login_redirect';
const logoutReasonStorageKey = 'auth_logout_reason';
const logoutMessageStorageKey = 'auth_logout_message';
const pendingIdentityStorageKey = 'auth_login_pending_identity';
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;

let authRedirecting = false;

export type AuthLogoutReason = 'mutual_login' | 'expired' | 'unauthorized';

function getCurrentRelativePath(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  const pathname = history.location?.pathname || '/';
  const search = history.location?.search || '';
  return `${pathname}${search}`;
}

export function normalizeRedirectPath(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  if (!value || !value.startsWith('/')) return undefined;
  if (value.startsWith('//')) return undefined;
  if (value.startsWith('/user/login')) return undefined;
  if (value.includes('\\')) return undefined;
  return value;
}

export function setPostLoginRedirect(raw: unknown): string | undefined {
  const redirect = normalizeRedirectPath(raw);
  if (!redirect) return undefined;
  try {
    sessionStorage.setItem(redirectStorageKey, redirect);
  } catch {
    // ignore
  }
  return redirect;
}

export function getPostLoginRedirect(): string | undefined {
  try {
    return normalizeRedirectPath(sessionStorage.getItem(redirectStorageKey));
  } catch {
    return undefined;
  }
}

export function clearPostLoginRedirect() {
  try {
    sessionStorage.removeItem(redirectStorageKey);
  } catch {
    // ignore
  }
}

function normalizeLogoutReason(raw: unknown): AuthLogoutReason | undefined {
  if (
    raw === 'mutual_login' ||
    raw === 'expired' ||
    raw === 'unauthorized'
  ) {
    return raw;
  }
  return undefined;
}

export function setAuthLogoutReason(reason?: AuthLogoutReason) {
  const normalized = normalizeLogoutReason(reason);
  if (!normalized) return;
  try {
    sessionStorage.setItem(logoutReasonStorageKey, normalized);
  } catch {
    // ignore
  }
}

export function consumeAuthLogoutReason(): AuthLogoutReason | undefined {
  try {
    const raw = sessionStorage.getItem(logoutReasonStorageKey);
    sessionStorage.removeItem(logoutReasonStorageKey);
    return normalizeLogoutReason(raw);
  } catch {
    return undefined;
  }
}

export function setAuthLogoutMessage(raw?: unknown) {
  if (typeof raw !== 'string') return;
  const value = raw.trim();
  if (!value) return;
  try {
    sessionStorage.setItem(logoutMessageStorageKey, value);
  } catch {
    // ignore
  }
}

export function consumeAuthLogoutMessage(): string | undefined {
  try {
    const raw = sessionStorage.getItem(logoutMessageStorageKey)?.trim();
    sessionStorage.removeItem(logoutMessageStorageKey);
    return raw || undefined;
  } catch {
    return undefined;
  }
}

export function markLoginPendingIdentity() {
  try {
    sessionStorage.setItem(pendingIdentityStorageKey, '1');
  } catch {
    // ignore
  }
}

export function consumeLoginPendingIdentity(): boolean {
  try {
    const raw = sessionStorage.getItem(pendingIdentityStorageKey);
    sessionStorage.removeItem(pendingIdentityStorageKey);
    return raw === '1';
  } catch {
    return false;
  }
}

export function consumePostLoginRedirect(): string | undefined {
  const redirect = getPostLoginRedirect();
  clearPostLoginRedirect();
  return redirect;
}

export function getRedirectFromSearch(search?: string): string | undefined {
  try {
    const s =
      search ?? (typeof window !== 'undefined' ? window.location.search : '');
    const params = new URLSearchParams(s || '');
    return normalizeRedirectPath(params.get('redirect'));
  } catch {
    return undefined;
  }
}

export function clearAuthStorage() {
  clearLoginUserInfo();
  clearLoginOrgList();
  clearSelectedOrgCode();
  clearBusinessList();
  clearCurrentBusinessCode();
  clearToken();
  clearRouteTabs();
}

function closeAllModals() {
  try {
    Modal.destroyAll();
  } catch {
    // ignore
  }
}

export function forceLogoutAndRedirect(
  redirect?: string,
  reason?: AuthLogoutReason,
) {
  if (devBypassAuth) return;
  setAuthLogoutReason(reason);
  clearAuthStorage();
  redirectToLogin(redirect || getCurrentRelativePath());
}

export function redirectToLogin(redirect?: string) {
  closeAllModals();
  const saved =
    setPostLoginRedirect(redirect) ||
    getPostLoginRedirect() ||
    setPostLoginRedirect(getCurrentRelativePath());

  if (history.location.pathname === loginPath) {
    authRedirecting = false;
    return;
  }

  if (authRedirecting) {
    return;
  }
  authRedirecting = true;

  const search = saved
    ? new URLSearchParams({
        redirect: saved,
      }).toString()
    : '';

  history.replace({
    pathname: loginPath,
    search,
  });

  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      authRedirecting = false;
    }, 0);
  } else {
    authRedirecting = false;
  }
}

export function isAuthExpiredCode(code: unknown): boolean {
  const normalized = String(code ?? '');
  return normalized === '2011' || normalized === '401';
}

export function handleAuthExpiredByCode(
  code: unknown,
  errorMessage?: string,
): boolean {
  if (!isAuthExpiredCode(code)) return false;
  if (devBypassAuth) return true;
  const normalizedCode = String(code ?? '');
  const nextReason: AuthLogoutReason =
    normalizedCode === '2011' ? 'mutual_login' : 'unauthorized';
  const nextMessage =
    typeof errorMessage === 'string' && errorMessage.trim()
      ? errorMessage.trim()
      : nextReason === 'mutual_login'
        ? '登录状态已失效，您的账号已在其他设备登录，请重新登录。'
        : '未认证，请重新登录。';

  setAuthLogoutMessage(nextMessage);
  message.warning(nextMessage);
  forceLogoutAndRedirect(getCurrentRelativePath(), nextReason);
  return true;
}
