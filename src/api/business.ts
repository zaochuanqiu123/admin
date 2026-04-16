import { apiData, apiRequest } from '@/api/http';

export type CurrentOrgBusinessInfo = {
  businessCode?: string;
  businessVersionId?: string;
  businessName?: string;
};

export type CurrentStoreBusinessInfo = {
  businessCode?: string;
  businessVersionId?: string;
  businessName?: string;
};

export type MerchantBusinessOpenStatus = 'INACTIVE' | 'ACTIVE' | 'EXPIRED';

export type MerchantBusinessRecord = {
  id?: string;
  businessCode?: string;
  businessName?: string;
  state?: boolean;
  openStatus?: MerchantBusinessOpenStatus | string;
  [key: string]: any;
};

export type BusinessVersionRecord = {
  id?: string;
  businessCode?: string;
  businessVersionName?: string;
  level?: string | number;
  price?: string | number;
  allowUpgrade?: boolean;
  isDefault?: boolean;
  isShow?: boolean;
  state?: boolean;
  [key: string]: any;
};

export type OrgBusinessDetail = {
  id?: string;
  startDate?: string;
  endDate?: string;
  orgId?: string;
  businessId?: string;
  businessCode?: string;
  businessName?: string;
  businessVersionId?: string;
  businessVersionName?: string;
  level?: string | number;
  price?: string | number;
  [key: string]: any;
};

export type EnableOrgBusinessParams = {
  businessVersionId: string;
  businessCode: string;
  orgId: string;
  cycle: number;
};

export type UpgradeOrgBusinessParams = {
  businessCode: string;
  orgId: string;
  businessVersionId: string;
};

export type RenewOrgBusinessParams = {
  businessCode: string;
  orgId: string;
  cycle: number;
};

export async function getCurrentOrgBusinessList(options?: {
  [key: string]: any;
}) {
  return apiData<CurrentOrgBusinessInfo[]>(
    '/api/admin/system/v1/business/curr/business',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getCurrentStoreBusiness(options?: {
  [key: string]: any;
}) {
  return apiData<CurrentStoreBusinessInfo>(
    '/api/admin/system/v1/business/curr/store/business',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getMerchantBusinessList(
  orgId: string,
  options?: { [key: string]: any },
) {
  return apiData<MerchantBusinessRecord[]>(
    `/api/admin/system/v1/business/getBusinessList/${orgId}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getEnableBusinessVersionList(
  orgId: string,
  businessCode: string,
  options?: { [key: string]: any },
) {
  return apiData<BusinessVersionRecord[]>(
    `/api/admin/system/v1/businessVersion/curr/enable/${orgId}/${businessCode}/list`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getUpgradeBusinessVersionList(
  orgId: string,
  businessCode: string,
  options?: { [key: string]: any },
) {
  return apiData<BusinessVersionRecord[]>(
    `/api/admin/system/v1/businessVersion/curr/upgrade/${orgId}/${businessCode}/list`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getCurrentOrgBusinessDetail(
  orgId: string,
  businessCode: string,
  options?: { [key: string]: any },
) {
  return apiData<OrgBusinessDetail>(
    `/api/admin/system/v1/orgBusiness/curr/detail/${orgId}/${businessCode}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function enableOrgBusiness(
  data: EnableOrgBusinessParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/orgBusiness/enableBusiness', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function upgradeOrgBusiness(
  data: UpgradeOrgBusinessParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/orgBusiness/upgradeBusiness', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function renewOrgBusiness(
  data: RenewOrgBusinessParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/orgBusiness/renewBusiness', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
