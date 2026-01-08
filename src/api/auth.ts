import { apiData } from './http';

/**
 * 登录接口
 * @param data 用户名和密码
 * @returns 返回 Promise，包含 token 等信息
 */
export function login(data: API.LoginParams) {
  return apiData<API.LoginResult>('/api/auth/login/doLogin', {
    method: 'POST',
    data,
  });
}
