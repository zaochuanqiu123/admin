import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';
import {
  getRequestMeta,
  shouldSkipAuthRedirect,
  shouldSkipGlobalBizError,
} from '@/api/requestMeta';
import { getSelectedOrgCode, getToken } from '@/api/storage';
import {
  forceLogoutAndRedirect,
  handleAuthExpiredByCode,
} from '@/utils/auth-expired';

const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;

function normalizeApiUrl(url?: string) {
  if (!url?.startsWith('/api/')) return url;
  return url.replace(/^\/api\//, '/mp-api/');
}

function isJavaApiUrl(url?: string) {
  return Boolean(url?.startsWith('/api/') || url?.startsWith('/mp-api/'));
}

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number | string;
  errorMessage?: string;
  showType?: ErrorShowType;
  authHandled?: boolean;
  requestMeta?: Record<string, any>;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (!success) {
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      const requestMeta =
        error?.info?.requestMeta || getRequestMeta(opts as { meta?: any });
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode, authHandled } = errorInfo;
          if (authHandled) {
            return;
          }
          if (shouldSkipGlobalBizError(requestMeta)) {
            return;
          }
          if (handleAuthExpiredByCode(errorCode, errorMessage)) {
            return;
          }
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        if (error.response.status === 401) {
          if (devBypassAuth) {
            return;
          }
          if (shouldSkipAuthRedirect(requestMeta)) {
            return;
          }
          forceLogoutAndRedirect('expired');
          return;
        }
        message.error(`Response status:${error.response.status}`);
      } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // `error.request` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        message.error('None response! Please retry.');
      } else {
        // 发送请求时出了点问题
        message.error('Request error, please retry.');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 拦截请求配置，进行个性化处理。
      const token = getToken();
      const orgCode = getSelectedOrgCode();
      const url = normalizeApiUrl(config.url);
      const isFormData =
        typeof FormData !== 'undefined' && config.data instanceof FormData;
      const rawHeaders = (config.headers || {}) as Record<string, any>;
      const hasSfdTokenHeader = Boolean(rawHeaders['SFD-TOKEN']);
      const headers = {
        ...rawHeaders,
        ...(isJavaApiUrl(config.url) && !hasSfdTokenHeader && token
          ? { 'SFD-TOKEN': token }
          : {}),
        ...(orgCode ? { 'X-Org-Code': orgCode } : {}),
      };
      if (isFormData) {
        delete (headers as Record<string, any>)['Content-Type'];
        delete (headers as Record<string, any>)['content-type'];
      }

      return { ...config, url, headers };
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      return response;
    },
  ],
};
