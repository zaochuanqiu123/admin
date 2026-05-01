import { apiData, apiRequest } from '@/api/http';

type CommonApiResponse<T = any> = {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: T;
  success?: boolean;
  errorMessage?: string;
};

export type WechatOpenConfig = {
  id?: string;
  appId?: string;
  appSecret?: string;
  token?: string;
  encodingAesKey?: string;
  [key: string]: any;
};

export type WechatOpenConfigSaveParams = {
  id?: string;
  appId: string;
  appSecret: string;
  token: string;
  encodingAesKey: string;
};

export type WechatMpConfig = {
  id?: string;
  mpConfigName?: string;
  appid?: string;
  appSecret?: string;
  appToken?: string;
  appAseKey?: string;
  headImg?: string;
  userName?: string;
  qrcodeUrl?: string;
  signature?: string;
  principalName?: string;
  [key: string]: any;
};

export type WechatMpConfigSaveParams = {
  id?: string;
  mpConfigName: string;
  appid: string;
  appSecret: string;
  appToken: string;
  appAseKey: string;
  headImg: string;
  userName: string;
  qrcodeUrl: string;
  signature: string;
  principalName: string;
};

const WECHAT_API_PREFIX = '/api/admin/wechat/v1';

export async function getWechatOpenConfig(options?: { [key: string]: any }) {
  return apiData<WechatOpenConfig | null>(
    `${WECHAT_API_PREFIX}/wechatOpenConfig/getCurrConfig`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function saveWechatOpenConfig(
  data: WechatOpenConfigSaveParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<WechatOpenConfig>>(
    `${WECHAT_API_PREFIX}/wechatOpenConfig/saveConfig`,
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function getWechatMpConfig(options?: { [key: string]: any }) {
  return apiData<WechatMpConfig | null>(
    `${WECHAT_API_PREFIX}/wechatMpConfig/getCurrConfig`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function saveWechatMpConfig(
  data: WechatMpConfigSaveParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<WechatMpConfig>>(
    `${WECHAT_API_PREFIX}/wechatMpConfig/saveConfig`,
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}
