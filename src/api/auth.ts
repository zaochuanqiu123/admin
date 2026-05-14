import { apiData } from './http';
import { type AppRequestOptions, LOGIN_AUTH_SCENE } from './requestMeta';

/**
 * 登录接口
 * @param data 用户名和密码
 * @returns 返回 Promise，包含 token 等信息
 */
export function login(data: API.LoginParams, options?: AppRequestOptions) {
  return apiData<API.LoginResult>('/api/admin/auth/v1/login/doLogin', {
    ...(options || {}),
    method: 'POST',
    data,
    skipErrorHandler: true,
    meta: {
      authScene: LOGIN_AUTH_SCENE,
      skipAuthRedirect: true,
      skipGlobalBizError: true,
      ...(options?.meta || {}),
    },
  });
}

export type CaptchaRequiredInfo = {
  required?: boolean;
  failedCount?: number;
  threshold?: number;
};

export function checkCaptchaRequired(
  username: string,
  options?: AppRequestOptions,
) {
  return apiData<CaptchaRequiredInfo>('/api/admin/auth/v1/captcha/check', {
    ...(options || {}),
    method: 'GET',
    params: { username },
    skipErrorHandler: true,
  });
}

/**
 * 退出登录接口
 * 后端路径: /auth/login/logout
 * 前端通过 /api 前缀走代理转发
 */
export function logout(options?: Record<string, any>) {
  return apiData<any>('/api/admin/auth/v1/login/logout', {
    method: 'POST',
    ...(options || {}),
  });
}
