import { request } from '@umijs/max';
import { getSelectedOrgCode, getToken } from '@/api/storage';
import { handleAuthExpiredByCode } from '@/utils/auth-expired';

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

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function toFormData(data: unknown): FormData {
  if (isFormData(data)) {
    return data;
  }

  const formData = new FormData();
  if (!isRecord(data)) {
    return formData;
  }

  const appendValue = (key: string, value: unknown) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof File !== 'undefined' && value instanceof File) {
      formData.append(key, value, value.name);
      return;
    }
    if (value instanceof Blob) {
      formData.append(key, value);
      return;
    }
    formData.append(key, String(value));
  };

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        appendValue(key, item);
      });
      return;
    }
    appendValue(key, value);
  });

  return formData;
}

function parseResponseText(text: string) {
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function requestFormData<TResponse>(
  url: string,
  options: { [key: string]: any },
): Promise<TResponse> {
  const formData = toFormData(options.data);
  const token = getToken();
  const orgCode = getSelectedOrgCode();
  const hasAuthorizationHeader = Boolean(options.headers?.Authorization);
  const headers = {
    ...(options.headers || {}),
    ...(!hasAuthorizationHeader && token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...(orgCode ? { 'X-Org-Code': orgCode } : {}),
  };
  delete (headers as Record<string, any>)['Content-Type'];
  delete (headers as Record<string, any>)['content-type'];

  return new Promise<TResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(String(options.method || 'GET'), url);
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        xhr.setRequestHeader(key, String(value));
      }
    });
    xhr.onload = () => {
      const responseBody = parseResponseText(xhr.responseText);
      if (xhr.status < 200 || xhr.status >= 300) {
        const error: any = new Error(
          String(
            (isRecord(responseBody) &&
              (responseBody.message || responseBody.msg)) ||
              xhr.statusText ||
              'Request failed',
          ),
        );
        error.response = {
          status: xhr.status,
          data: responseBody,
        };
        reject(error);
        return;
      }
      resolve(responseBody as TResponse);
    };
    xhr.onerror = () => reject(new Error('Request failed'));
    xhr.send(formData);
  });
}

type ApiErrorInfo = {
  errorCode?: number | string;
  errorMessage?: string;
  showType?: number;
  data?: unknown;
  authHandled?: boolean;
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
  const requestOptions = { ...(options || {}) };
  const isFormDataRequest = requestOptions.requestType === 'form-data';
  delete requestOptions.requestType;

  const res = isFormDataRequest
    ? await requestFormData<TResponse>(url, requestOptions)
    : await request<TResponse>(url, {
        ...requestOptions,
      });

  if (isRecord(res)) {
    if (isCodeResponse(res)) {
      if (!isSuccessCode(res.code)) {
        const errorMessage = String(res.msg ?? res.message ?? 'Request failed');
        const authHandled = handleAuthExpiredByCode(res.code, errorMessage);
        throw createBizError(errorMessage, {
          errorCode: res.code,
          errorMessage,
          data: res.data,
          authHandled,
        });
      }
      return res;
    }

    if (isSuccessResponse(res)) {
      if (res.success === false) {
        const errorMessage = String(
          res.errorMessage ?? res.message ?? 'Request failed',
        );
        const authHandled = handleAuthExpiredByCode(
          res.errorCode,
          errorMessage,
        );
        throw createBizError(errorMessage, {
          errorCode: res.errorCode,
          errorMessage,
          showType: res.showType,
          data: res.data,
          authHandled,
        });
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
