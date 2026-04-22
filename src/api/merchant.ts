import { apiData, apiRequest } from '@/api/http';

export type MerchantPageParams = {
  current: number;
  pageSize: number;
  name?: string;
};

export type MerchantPageRecord = {
  id?: string;
  orgId?: string;
  orgCode?: string;
  state?: boolean;
  oldOrgId?: string;
  orgAgentId?: string;
  merchantName?: string;
  contactsName?: string;
  contactsPhone?: string;
  logoId?: string;
  logoUrl?: string;
  merchantProvince?: string;
  merchantCity?: string;
  merchantArea?: string;
  merchantDetailAddress?: string;
  sourceType?: number;
  storeNum?: number;
  remainingStoresToCreate?: number;
  beginTime?: string;
  createTime?: string;
  [key: string]: any;
};

export type MerchantAddParams = {
  merchantName: string;
  contactsName?: string;
  contactsPhone?: string;
  logoId?: string;
  merchantProvince: string;
  merchantCity: string;
  merchantArea: string;
  merchantProvinceCode: string;
  merchantCityCode: string;
  merchantAreaCode: string;
  merchantDetailAddress: string;
  sourceType?: number;
  merchantManagerPhone: string;
  merchantManagerName?: string;
  merchantManagerNickName: string;
  merchantManagerPassword?: string;
  isMultiStore?: boolean;
};

export type MerchantModifyParams = {
  id: string;
  merchantName: string;
  contactsName?: string;
  contactsPhone?: string;
  logoId?: string;
  merchantProvince: string;
  merchantCity: string;
  merchantArea: string;
  merchantProvinceCode: string;
  merchantCityCode: string;
  merchantAreaCode: string;
  merchantDetailAddress: string;
  sourceType?: number;
};

export type BuyMerchantStoreParams = {
  merchantOrgId: string;
  buyNum: number;
};

export type MerchantDetailRecord = {
  id?: string;
  orgId?: string;
  orgCode?: string;
  orgAgentId?: string;
  merchantName?: string;
  contactsName?: string;
  contactsPhone?: string;
  logoId?: string;
  logoUrl?: string;
  merchantProvince?: string;
  merchantCity?: string;
  merchantArea?: string;
  merchantProvinceCode?: string;
  merchantCityCode?: string;
  merchantAreaCode?: string;
  merchantDetailAddress?: string;
  sourceType?: number;
  storeNum?: number;
  beginTime?: string;
};

export type MerchantPageResult = {
  records?: MerchantPageRecord[];
  total?: number;
  size?: number;
  current?: number;
  orders?: Array<{
    column?: string;
    asc?: boolean;
  }>;
  optimizeCountSql?: boolean;
  searchCount?: boolean;
  optimizeJoinOfCountSql?: boolean;
  maxLimit?: number;
  countId?: string;
};

export async function getMerchantPage(
  data: MerchantPageParams,
  options?: { [key: string]: any },
) {
  return apiData<MerchantPageResult>('/api/admin/org/v1/merchant/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function addMerchant(
  data: MerchantAddParams,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/admin/org/v1/merchant/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function modifyMerchant(
  data: MerchantModifyParams,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/admin/org/v1/merchant/modify', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function buyMerchantStore(
  data: BuyMerchantStoreParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/org/v1/merchant/buyStore', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getMerchantDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<MerchantDetailRecord>(
    `/api/admin/org/v1/merchant/${id}/detail`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
