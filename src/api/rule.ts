import { apiRequest } from './http';

/**
 * Rule（示例）相关接口封装。
 *
 * 说明：
 * - 这里的 "rule" / "addRule" / "updateRule" / "removeRule" 是 Ant Design Pro 模板自带的演示接口。
 * - 真实业务开发时，你可以按业务域拆分文件（如 src/api/order.ts、src/api/system.ts）。
 *
 * 返回值约定：
 * - 这里统一使用 apiRequest()，它会自动识别后端两类常见返回格式并在失败时抛出 BizError：
 *   - { code, msg, data }
 *   - { success, data, errorMessage, errorCode, showType }
 * - 抛出的 BizError 会被 src/requestErrorConfig.ts 的 errorThrower/errorHandler 统一处理（弹窗/跳转等）。
 */
export async function rule(
  params: {
    current?: number;
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  /**
   * 获取规则列表。
   * - 该函数一般被 ProTable 的 request 属性调用。
   * - params 会作为 querystring 透传（current/pageSize）。
   */
  return apiRequest<API.RuleList>('/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/**
 * 更新规则（模板示例接口）。
 * 注意：模板里用 POST + body.method='update' 来模拟不同动作，真实后端一般会用 PUT/PATCH。
 */
export async function updateRule(options?: { [key: string]: any }) {
  return apiRequest<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'update',
      ...(options || {}),
    },
  });
}

/**
 * 新建规则（模板示例接口）。
 * 注意：模板里用 POST + body.method='post' 来模拟新增。
 */
export async function addRule(options?: { [key: string]: any }) {
  return apiRequest<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'post',
      ...(options || {}),
    },
  });
}

/**
 * 删除规则（模板示例接口）。
 * 注意：模板里用 POST + body.method='delete' 来模拟删除。
 */
export async function removeRule(options?: { [key: string]: any }) {
  return apiRequest<Record<string, any>>('/api/rule', {
    method: 'POST',
    data: {
      method: 'delete',
      ...(options || {}),
    },
  });
}
