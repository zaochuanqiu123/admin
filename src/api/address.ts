import { phpRequest } from '@/api/phpHttp';

export type AddressCityNode = {
  city_code?: string;
  city_name?: string;
};

type AddressCityResponse = {
  status?: number | string;
  msg?: string;
  message?: string;
  data?: AddressCityNode[];
};

export type AddressProvinceCityAreaParams = {
  type: 0 | 1 | 2;
  provinceCode?: string;
  cityCode?: string;
};

export async function getAddressProvinceCityArea(
  params: AddressProvinceCityAreaParams,
  options?: { [key: string]: any },
) {
  const formData = new FormData();
  formData.append('type', String(params.type));
  formData.append('province_code', params.provinceCode || '');
  formData.append('city_code', params.cityCode || '');

  const response = await phpRequest<AddressCityResponse>(
    '/Currency/City/indexProvinceCityArea',
    {
      method: 'POST',
      data: formData,
      requestType: 'form',
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
      headers: {
        'Request-Source': 'web',
      },
      ...(options || {}),
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || response?.msg || '获取省市区失败');
  }

  return Array.isArray(response?.data) ? response.data : [];
}
