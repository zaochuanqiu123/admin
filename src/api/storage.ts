export const TOKEN_STORAGE_KEY = 'access_token';
export const LOGIN_ORG_LIST_STORAGE_KEY = 'login_org_list';
export const LOGIN_USER_INFO_STORAGE_KEY = 'login_user_info';
export const SELECTED_ORG_CODE_STORAGE_KEY = 'selected_org_code';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function getLoginOrgList<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(LOGIN_ORG_LIST_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setLoginOrgList(orgList: any) {
  try {
    localStorage.setItem(
      LOGIN_ORG_LIST_STORAGE_KEY,
      JSON.stringify(orgList ?? []),
    );
  } catch {
    // ignore
  }
}

export function clearLoginOrgList() {
  try {
    localStorage.removeItem(LOGIN_ORG_LIST_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getLoginUserInfo<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(LOGIN_USER_INFO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setLoginUserInfo(userInfo: any) {
  try {
    localStorage.setItem(
      LOGIN_USER_INFO_STORAGE_KEY,
      JSON.stringify(userInfo ?? {}),
    );
  } catch {
    // ignore
  }
}

export function clearLoginUserInfo() {
  try {
    localStorage.removeItem(LOGIN_USER_INFO_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getSelectedOrgCode(): string | null {
  try {
    return localStorage.getItem(SELECTED_ORG_CODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSelectedOrgCode(orgCode: string) {
  try {
    localStorage.setItem(SELECTED_ORG_CODE_STORAGE_KEY, orgCode);
  } catch {
    // ignore
  }
}

export function clearSelectedOrgCode() {
  try {
    localStorage.removeItem(SELECTED_ORG_CODE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}
