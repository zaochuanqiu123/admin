import { request } from '@umijs/max';
import { getToken } from './storage';

type AnyRecord = Record<string, any>;

export type PhpRequestOptions = AnyRecord & {
  skipTokenHeader?: boolean;
  tokenHeaderName?: string;
  tokenPrefix?: string;
  tokenValuePrefix?: string;
};

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null;
}

function getPhpApiBase() {
  if (typeof __PHP_API_BASE__ === 'string') {
    return __PHP_API_BASE__.trim();
  }
  return '';
}

export function resolvePhpUrl(url: string) {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return rawUrl;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  const base = getPhpApiBase();
  if (!base) return rawUrl;

  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedUrl = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${normalizedBase}${normalizedUrl}`;
}

export async function phpRequest<TResponse = any>(
  url: string,
  options?: PhpRequestOptions,
): Promise<TResponse> {
  const {
    headers,
    skipTokenHeader = false,
    tokenHeaderName = 'Authorization',
    tokenPrefix = 'bearer ',
    tokenValuePrefix = 'JAVA-',
    ...restOptions
  } = options || {};
  const token = getToken();

  return request<TResponse>(resolvePhpUrl(url), {
    ...restOptions,
    headers: {
      'Request-Source': 'web',
      ...(headers || {}),
      ...(!skipTokenHeader && token
        ? {
            [tokenHeaderName]: `${tokenPrefix}${tokenValuePrefix}${token}`,
          }
        : {}),
    },
  });
}

export async function phpData<TData>(
  url: string,
  options?: PhpRequestOptions,
): Promise<TData> {
  const response = await phpRequest<any>(url, options);
  if (isRecord(response) && 'data' in response) {
    return response.data as TData;
  }
  return response as TData;
}
