import { apiData, apiRequest } from '@/api/http';

export type MposOrgInfo = {
  id?: string;
  orgCode?: string;
  orgLevelCode?: string;
  orgName?: string;
};

export type MposRecord = {
  id?: string | number;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  batchSn?: string;
  sn?: string;
  model?: string;
  channelCode?: string;
  channelConfigId?: string;
  merchantNo?: string;
  terminalNo?: string;
  remark?: string;
  state?: number;
  transferTime?: string;
  bindTime?: string;
  bindName?: string;
  bindRemark?: string;
  createTime?: string;
  createUserId?: string;
  updateTime?: string;
  updateUserId?: string;
  agentOrg?: MposOrgInfo;
  groupOrg?: MposOrgInfo;
  merchantOrg?: MposOrgInfo;
  storeOrg?: MposOrgInfo;
  [key: string]: any;
};

export type MposQueryParams = {
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  batchSn?: string;
  sn?: string;
  model?: string;
  bindName?: string;
  snList?: string[];
  startSn?: string;
  endSn?: string;
};

export type MposPageParams = MposQueryParams & {
  current: number;
  pageSize: number;
};

export type MposPageResult = {
  records?: MposRecord[];
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

export type MposTransferParams = {
  transferType: 'ISSUE' | 'RETURN';
  orgId?: string;
  snList: string[];
  remark?: string;
};

export type MposBindParams = {
  id?: string | number;
  sn?: string;
  storeOrgId?: string;
  bindName?: string;
  bindRemark?: string;
};

export type MposUnbindParams = {
  id?: string | number;
  sn?: string;
};

type CommonApiResponse<T = any> = {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: T;
  success?: boolean;
  errorMessage?: string;
};

export async function getMposPageQuery(
  data: MposPageParams,
  options?: { [key: string]: any },
) {
  return apiData<MposPageResult>('/api/admin/device/v1/mpos/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getMposListQuery(
  data?: MposQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<MposRecord[]>('/api/admin/device/v1/mpos/list', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function transferMpos(
  data: MposTransferParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    '/api/admin/device/v1/mpos/transfer',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function bindMpos(
  data: MposBindParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    '/api/admin/device/v1/mpos/bind',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function unbindMpos(
  data: MposUnbindParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    '/api/admin/device/v1/mpos/unbind',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}
