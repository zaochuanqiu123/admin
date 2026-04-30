import { history } from '@umijs/max';
import { Modal, message } from 'antd';
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
let lastAuthExpiredFeedbackAt = 0;
const AUTH_EXPIRED_FEEDBACK_DEDUP_MS = 1500;

export type AuthLogoutReason = 'mutual_login' | 'expired' | 'unauthorized';

export function clearPostLoginRedirect() {
  try {
    sessionStorage.removeItem(redirectStorageKey);
  } catch {
    // ignore
  }
}

function normalizeLogoutReason(raw: unknown): AuthLogoutReason | undefined {
  if (raw === 'mutual_login' || raw === 'expired' || raw === 'unauthorized') {
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

export function forceLogoutAndRedirect(reason?: AuthLogoutReason) {
  if (devBypassAuth) return;
  setAuthLogoutReason(reason);
  clearAuthStorage();
  redirectToLogin();
}

export function redirectToLogin() {
  closeAllModals();
  clearPostLoginRedirect();

  if (history.location.pathname === loginPath) {
    authRedirecting = false;
    return;
  }

  if (authRedirecting) {
    return;
  }
  authRedirecting = true;

  history.replace({
    pathname: loginPath,
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
  const now = Date.now();
  if (now - lastAuthExpiredFeedbackAt > AUTH_EXPIRED_FEEDBACK_DEDUP_MS) {
    lastAuthExpiredFeedbackAt = now;
    message.warning(nextMessage);
  }
  forceLogoutAndRedirect(nextReason);
  return true;
}
