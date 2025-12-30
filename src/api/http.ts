import { request } from '@umijs/max';

type AnyRecord = Record<string, any>;

/**
 * 统一的 API 请求封装（基于 @umijs/max 的 request）。
 *
 * 目标：
 * - 页面侧只调用 src/api/* 中的函数，不直接关心后端返回结构差异。
 * - 统一把“业务失败”抛成 BizError，交给 src/requestErrorConfig.ts 的 errorHandler 做提示/跳转。
 *
 * 支持两类常见后端返回结构（两类都兼容）：
 *
 * 1) code/msg/data（推荐）
 *    { code: 0, msg: 'ok', data: T }
 *    - code=0 或 200 视为成功
 *
 * 2) success/data/errorMessage（Ant Design Pro 模板结构）
 *    { success: true, data: T }
 *    { success: false, errorMessage: 'xxx', errorCode?: number, showType?: number, data?: any }
 *
 * 使用建议：
 * - apiData<T>()：最常用，直接返回 data（无需在页面写 .data）。
 * - apiRequest<T>()：需要拿完整响应对象（如 code、msg、分页字段）时使用。
 */

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === 'object' && v !== null;
}

type ApiErrorInfo = {
  errorCode?: number | string;
  errorMessage?: string;
  showType?: number;
  data?: unknown;
};

/**
 * 构造一个 BizError：
 * - name 固定为 BizError
 * - info 会被 src/requestErrorConfig.ts 识别并进行统一提示
 */
function createBizError(message: string, info?: ApiErrorInfo) {
  const error: any = new Error(message);
  error.name = 'BizError';
  error.info = info;
  return error;
}

function isCodeResponse(res: AnyRecord): boolean {
  return typeof res.code === 'number' || typeof res.code === 'string';
}

function isSuccessResponse(res: AnyRecord): boolean {
  return typeof res.success === 'boolean';
}

function isSuccessCode(code: unknown): boolean {
  if (code === 0 || code === 200 || code === '0' || code === '200') return true;
  return false;
}

export async function apiRequest<TResponse = any>(
  url: string,
  options?: { [key: string]: any },
): Promise<TResponse> {
  /**
   * 说明：
   * - 这里直接调用 Umi request（底层 axios）。
   * - requestInterceptors / errorHandler 等全局逻辑在 src/requestErrorConfig.ts 中配置。
   */
  const res = await request<TResponse>(url, {
    ...(options || {}),
  });

  if (isRecord(res)) {
    if (isCodeResponse(res)) {
      if (!isSuccessCode(res.code)) {
        throw createBizError(
          String(res.msg ?? res.message ?? 'Request failed'),
          {
            errorCode: res.code,
            errorMessage: String(res.msg ?? res.message ?? 'Request failed'),
            data: res.data,
          },
        );
      }
      return res;
    }

    if (isSuccessResponse(res)) {
      if (res.success === false) {
        throw createBizError(
          String(res.errorMessage ?? res.message ?? 'Request failed'),
          {
            errorCode: res.errorCode,
            errorMessage: String(
              res.errorMessage ?? res.message ?? 'Request failed',
            ),
            showType: res.showType,
            data: res.data,
          },
        );
      }
    }
  }

  return res;
}

export async function apiData<TData>(
  url: string,
  options?: { [key: string]: any },
): Promise<TData> {
  /**
   * 常用的“解包”方法：
   * - 如果响应对象形如 { data: xxx } 则返回 data
   * - 否则返回整体
   */
  const res = await apiRequest<any>(url, options);
  if (isRecord(res) && 'data' in res) {
    return res.data as TData;
  }
  return res as TData;
}
