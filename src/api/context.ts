import { apiData, apiRequest } from '@/api/http';

export async function getUserLoginContext(
  orgCode: string,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/admin/system/v1/system/getUserLoginContext', {
    method: 'POST',
    data: { orgCode },
    ...(options || {}),
  });
}

export async function getUserLoginContextResponse(
  orgCode: string,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/system/getUserLoginContext', {
    method: 'POST',
    data: { orgCode },
    ...(options || {}),
  });
}

export async function getPermContext(
  businessCode?: string,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/admin/system/v1/perm/getPermContext', {
    method: 'GET',
    params: businessCode ? { businessCode } : undefined,
    ...(options || {}),
  });
}

export async function getRoleVOList(
  orgCode: string,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/admin/system/v1/role/getRoleVOList', {
    method: 'GET',
    params: { orgCode },
    ...(options || {}),
  });
}

export async function searchRole(
  orgCode: string,
  roleName: string,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/admin/system/v1/role/searchRole', {
    method: 'GET',
    params: {
      orgCode,
      roleName,
    },
    ...(options || {}),
  });
}

export type RolePageListParams = {
  current: number;
  pageSize: number;
  roleName?: string;
  state?: number;
  roleType?: number;
};

export async function getRolePageList(
  data: RolePageListParams,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/admin/system/v1/role/page/list', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getOrgMenuTree(
  orgCode: string,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/admin/system/v1/perm/getOrgMenuTree', {
    method: 'GET',
    params: { orgCode },
    ...(options || {}),
  });
}

export type SaveRoleParams = {
  roleName: string;
  roleType: number;
  state: number;
  permIds?: string[];
};

export async function saveRole(
  data: SaveRoleParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/role/saveRole', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export type EditRoleParams = {
  id: string;
  roleName: string;
  roleType: number;
  state: number;
  permIds?: string[];
};

export async function editRole(
  data: EditRoleParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/role/editRole', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function deleteRole(
  roleId: string,
  options?: { [key: string]: any },
) {
  return apiRequest<any>(`/api/admin/system/v1/role/del/${roleId}`, {
    method: 'DELETE',
    params: { roleId },
    ...(options || {}),
  });
}

export async function getRoleDetail(
  roleId: string,
  options?: { [key: string]: any },
) {
  return apiData<any>(`/api/admin/system/v1/role/detailRole/${roleId}`, {
    method: 'GET',
    ...(options || {}),
  });
}

export type UpdateRoleStateParams = {
  id: string;
  state: number;
};

export async function updateRoleState(
  data: UpdateRoleStateParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/role/updateState', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
