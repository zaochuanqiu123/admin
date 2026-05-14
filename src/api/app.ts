import { apiData, apiRequest } from '@/api/http';

export type OrgAppGroupRecord = {
  id?: string;
  typeName?: string;
  typeDesc?: string;
  categoryName?: string;
  categoryDesc?: string;
  appList?: OrgAppRecord[];
  [key: string]: any;
};

export type OrgAppRecord = {
  id?: string;
  appCode?: string;
  appName?: string;
  appDesc?: string;
  appIcon?: string;
  state?: number | boolean | string;
  openStatus?: 'INACTIVE' | 'ACTIVE' | 'EXPIRED' | string;
  [key: string]: any;
};

export type AppVersionRecord = {
  id?: string;
  appVersionName?: string;
  appVersionDesc?: string;
  appVersionPrice?: string | number;
  level?: string | number;
  allowUpgrade?: boolean;
  appId?: string;
  [key: string]: any;
};

export type OrgAppDetail = {
  id?: string;
  startDate?: string;
  endDate?: string;
  orgId?: string;
  appId?: string;
  appName?: string;
  appVersionId?: string;
  appVersionName?: string;
  appVersionDesc?: string;
  appVersionPrice?: string | number;
  level?: string | number;
  [key: string]: any;
};

export type EnableOrgAppParams = {
  appVersionId: string;
  orgId: string;
  cycle: number;
};

export type RenewOrgAppParams = {
  appId: string;
  orgId: string;
  cycle: number;
};

export type UpgradeOrgAppParams = {
  appId: string;
  orgId: string;
  appVersionId: string;
};

export type GrantOrgAppParams = {
  appId: string;
  targetOrgId: string;
};

export type AppMenuTreeRecord = {
  id?: string;
  pathUrl?: string;
  children?: AppMenuTreeRecord[];
  [key: string]: any;
};

export async function getOrgAppList(
  orgId: string,
  options?: { [key: string]: any },
) {
  return apiData<OrgAppGroupRecord[]>(
    `/api/admin/system/v1/app/getAppList/${orgId}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getCurrentOrgOpenedApps(options?: {
  [key: string]: any;
}) {
  return apiData<OrgAppGroupRecord[]>(
    '/api/admin/system/v1/app/getCurrentOrgOpenedApps',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getAppMenuTree(
  appId: string,
  options?: { [key: string]: any },
) {
  return apiData<AppMenuTreeRecord[]>(
    `/api/admin/system/v1/app/getAppMenuTree/${appId}`,
    {
      method: 'GET',
      params: { appId },
      ...(options || {}),
    },
  );
}

export async function getEnableAppVersionList(
  orgId: string,
  appId: string,
  options?: { [key: string]: any },
) {
  return apiData<AppVersionRecord[]>(
    `/api/admin/system/v1/appVersion/curr/enable/${orgId}/${appId}/list`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getUpgradeAppVersionList(
  orgId: string,
  appId: string,
  options?: { [key: string]: any },
) {
  return apiData<AppVersionRecord[]>(
    `/api/admin/system/v1/appVersion/curr/upgrade/${orgId}/${appId}/list`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getCurrentOrgAppDetail(
  orgId: string,
  appId: string,
  options?: { [key: string]: any },
) {
  return apiData<OrgAppDetail>(
    `/api/admin/system/v1/orgApp/curr/detail/${orgId}/${appId}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function grantOrgApp(
  data: GrantOrgAppParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/orgApp/grantApp', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function revokeGrantOrgApp(
  data: GrantOrgAppParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/orgApp/revokeGrantApp', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function enableOrgApp(
  data: EnableOrgAppParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/orgApp/enableApp', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function renewOrgApp(
  data: RenewOrgAppParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/orgApp/renewApp', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function upgradeOrgApp(
  data: UpgradeOrgAppParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/system/v1/orgApp/upgradeApp', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
