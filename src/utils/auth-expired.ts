import { history } from '@umijs/max';
import { Modal } from 'antd';
import {
  clearBusinessList,
  clearCurrentBusinessCode,
  clearLoginOrgList,
  clearLoginUserInfo,
  clearSelectedOrgCode,
  clearToken,
} from '@/api/storage';

const loginPath = '/user/login';
const redirectStorageKey = 'post_login_redirect';
const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;

let authExpiredModalOpen = false;

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
}

export function redirectToLogin(redirect?: string) {
  const saved =
    setPostLoginRedirect(redirect) ||
    getPostLoginRedirect() ||
    setPostLoginRedirect(getCurrentRelativePath());

  if (history.location.pathname === loginPath) {
    return;
  }

  const search = saved
    ? new URLSearchParams({
        redirect: saved,
      }).toString()
    : '';

  history.replace({
    pathname: loginPath,
    search,
  });
}

export function isAuthExpiredCode(code: unknown): boolean {
  return String(code ?? '') === '2011';
}

export function handleAuthExpiredByCode(
  code: unknown,
  errorMessage?: string,
): boolean {
  if (!isAuthExpiredCode(code)) return false;
  if (devBypassAuth) return true;

  setPostLoginRedirect(getCurrentRelativePath());
  clearAuthStorage();

  if (history.location.pathname === loginPath) {
    return true;
  }

  if (authExpiredModalOpen) {
    return true;
  }

  authExpiredModalOpen = true;
  Modal.warning({
    title: '登录状态已失效',
    content: errorMessage || '用户已在其他设备登录，请重新登录。',
    centered: true,
    okText: '去登录',
    onOk: () => {
      authExpiredModalOpen = false;
      redirectToLogin();
    },
    afterClose: () => {
      authExpiredModalOpen = false;
    },
  });
  return true;
}
