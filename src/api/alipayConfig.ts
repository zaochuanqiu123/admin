import { apiData, apiRequest } from '@/api/http';

type CommonApiResponse<T = any> = {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: T;
  success?: boolean;
  errorMessage?: string;
};

export type AlipayWebConfig = {
  id?: string;
  name?: string;
  appid?: string;
  alipayPublicKey?: string;
  appPublicKey?: string;
  appPrivateKey?: string;
  [key: string]: any;
};

export type AlipayWebConfigSaveParams = {
  id?: string;
  name: string;
  appid: string;
  alipayPublicKey: string;
  appPublicKey: string;
  appPrivateKey: string;
};

const ALIPAY_API_PREFIX = '/api/admin/alipay/v1';

export async function getAlipayWebConfig(options?: { [key: string]: any }) {
  return apiData<AlipayWebConfig | null>(
    `${ALIPAY_API_PREFIX}/alipayWebConfig/getCurrConfig`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function saveAlipayWebConfig(
  data: AlipayWebConfigSaveParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<AlipayWebConfig>>(
    `${ALIPAY_API_PREFIX}/alipayWebConfig/saveConfig`,
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}
