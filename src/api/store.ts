import { apiData, apiRequest } from '@/api/http';

export type StorePageQueryParams = {
  current: number;
  pageSize: number;
  name?: string;
  storeClass?: number;
};

export type StorePageRecord = {
  id: string;
  orgId?: string;
  orgCode?: string;
  sid?: string;
  mid?: string;
  state?: boolean;
  oldOrgId?: string;
  storeName?: string;
  logoId?: string;
  shopImgId?: string;
  storeProvince?: string;
  storeCity?: string;
  storeArea?: string;
  storeDetailAddress?: string;
  storeType?: number;
  storeClass?: number;
  wxMiniAppStatus?: boolean;
  remark?: string;
  memo?: string;
  storeRemark?: string;
  industryName?: string;
  tradeName?: string;
  businessCategoryName?: string;
  contactPhone?: string;
  phone?: string;
  mobile?: string;
};

export type StorePageResult = {
  records?: StorePageRecord[];
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
  timestamp?: number;
};

export type AddStorePayload = {
  storeName: string;
  businessCode: string;
  logoId: string;
  shopImgId: string;
  storePhone: string;
  storeAddress: string;
  storeProvince: string;
  storeCity: string;
  storeArea: string;
  storeDetailAddress: string;
  longitude: string;
  latitude: string;
  originShopId: string;
  storeClass: number;
  supplierType: number;
  storeManagerPhone: string;
  storeManagerName: string;
  storeManagerNickName: string;
  storeManagerPassword: string;
};

export type ModifyStorePayload = Omit<
  AddStorePayload,
  | 'storeManagerPhone'
  | 'storeManagerName'
  | 'storeManagerNickName'
  | 'storeManagerPassword'
> & {
  id: string;
};

export type AddStoreResponse = {
  code?: number | string;
  message?: string;
  data?: string;
  timestamp?: number;
};

export type StoreDetailRecord = {
  id?: string;
  storeName?: string;
  businessCode?: string;
  logoId?: string;
  shopImgId?: string;
  storePhone?: string;
  storeAddress?: string;
  storeProvince?: string;
  storeCity?: string;
  storeArea?: string;
  storeDetailAddress?: string;
  originShopId?: string;
  storeType?: number;
  storeClass?: number;
  supplierType?: number;
  longitude?: string | number;
  latitude?: string | number;
  lng?: string | number;
  lat?: string | number;
  storeLongitude?: string | number;
  storeLatitude?: string | number;
};

export async function getStorePage(
  data: StorePageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<StorePageResult>('/api/admin/org/v1/store/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function addStore(
  data: AddStorePayload,
  options?: { [key: string]: any },
) {
  return apiRequest<AddStoreResponse>('/api/admin/org/v1/store/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function modifyStore(
  data: ModifyStorePayload,
  options?: { [key: string]: any },
) {
  return apiRequest<AddStoreResponse>('/api/admin/org/v1/store/modify', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getStoreDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<StoreDetailRecord>(`/api/admin/org/v1/store/${id}/detail`, {
    method: 'GET',
    ...(options || {}),
  });
}

export async function modifyOrgState(
  orgId: string,
  options?: { [key: string]: any },
) {
  return apiRequest<AddStoreResponse>(
    `/api/admin/org/v1/org/modify/state/${orgId}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function modifyStoreType(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<AddStoreResponse>(
    `/api/admin/org/v1/store/modify/type/${id}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function modifyStoreMiniApp(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<AddStoreResponse>(
    `/api/admin/org/v1/store/modify/miniApp/${id}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
