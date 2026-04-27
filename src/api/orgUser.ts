import { apiData, apiRequest } from '@/api/http';

export type OrgUserPageParams = {
  current: number;
  pageSize: number;
  nickName?: string;
  name?: string;
  phone?: string;
  account?: string;
};

export type OrgUserPageRecord = {
  id?: string;
  userId?: string;
  phone?: string;
  account?: string;
  name?: string;
  nickName?: string;
  state?: boolean;
  createTime?: string;
  updateTime?: string;
  [key: string]: any;
};

export type OrgUserPageResult = {
  records?: OrgUserPageRecord[];
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

export type OrgUserDetailRecord = {
  id?: string;
  orgId?: string;
  orgCode?: string;
  userId?: string;
  nickName?: string;
  state?: boolean;
  roleMap?: Record<string, string>;
  overridePermIds?: string[];
  timestamp?: number;
  [key: string]: any;
};

export type AddOrgUserParams = {
  phone: string;
  name?: string;
  nickName: string;
  password?: string;
  avatar?: string;
  roleIds?: string[];
  overridePermIds?: string[];
};

export type ModifyOrgUserParams = {
  id: string;
  nickName: string;
  roleIds?: string[];
  overridePermIds?: string[];
};

export async function getOrgUserPage(
  data: OrgUserPageParams,
  options?: { [key: string]: any },
) {
  return apiData<OrgUserPageResult>('/api/admin/org/v1/orgUser/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getOrgUserDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<OrgUserDetailRecord>(
    `/api/admin/org/v1/orgUser/${id}/detail`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function addOrgUser(
  data: AddOrgUserParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/org/v1/orgUser/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function modifyOrgUser(
  data: ModifyOrgUserParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/org/v1/orgUser/modify', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function deleteOrgUser(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<any>(`/api/admin/org/v1/orgUser/delete/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

export async function updateOrgUserState(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<any>(`/api/admin/org/v1/orgUser/updateState/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

export async function getOrgUserFavoriteMenuList(options?: {
  [key: string]: any;
}) {
  return apiData<string[] | null>(
    '/api/admin/org/v1/orgUser/getFavoriteMenuList',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function saveOrgUserFavoriteMenu(
  data: string[],
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/org/v1/orgUser/saveFavoriteMenu', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
