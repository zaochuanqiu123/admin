import { apiData } from './http';

/**
 * 登录接口
 * @param data 用户名和密码
 * @returns 返回 Promise，包含 token 等信息
 */
export function login(data: API.LoginParams) {
  return apiData<API.LoginResult>('/api/admin/auth/v1/login/doLogin', {
    method: 'POST',
    data,
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
