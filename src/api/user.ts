import { apiData, apiRequest } from './http';

/**
 * 用户/认证相关接口封装。
 *
 * 约定：
 * - 普通“查询类”接口建议用 apiData<T>()：直接返回后端 data。
 * - 需要读取完整响应（如 token、status、code、msg）则用 apiRequest<T>()。
 */
export async function currentUser(options?: { [key: string]: any }) {
  /**
   * 获取当前登录用户信息。
   * - 一般在 src/app.tsx 的 getInitialState() 阶段调用。
   * - 后端建议返回：{ code: 0, msg: 'ok', data: { ...user } }
   *   或：{ success: true, data: { ...user } }
   */
  return apiData<API.CurrentUser>('/api/currentUser', {
    method: 'GET',
    ...(options || {}),
  });
}

export async function outLogin(options?: { [key: string]: any }) {
  /**
   * 退出登录。
   * - 前端会在调用后 clearToken()，并跳转到登录页。
   */
  return apiRequest<Record<string, any>>('/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}

export async function login(
  body: API.LoginParams,
  options?: { [key: string]: any },
) {
  /**
   * 登录。
   * - 登录页会在成功后把 token 写入 localStorage（见 setToken()）。
   * - 由于不同后端实现差异较大，这里保留“完整响应”的返回：
   *   - 模板结构：{ status: 'ok', ... }
   *   - 你自己的后端建议直接返回：{ token: 'xxx', ... } 或 { data: { token: 'xxx' }, ... }
   */
  return apiRequest<API.LoginResult & { token?: string; data?: any }>(
    '/api/login/account',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
      ...(options || {}),
    },
  );
}

export async function getFakeCaptcha(
  params: {
    phone?: string;
  },
  options?: { [key: string]: any },
) {
  /**
   * 获取短信验证码（模板演示）。
   * - 如果你不做手机号登录，可以删除登录页对应 Tab 以及本函数。
   */
  return apiRequest<API.FakeCaptcha>('/api/login/captcha', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
