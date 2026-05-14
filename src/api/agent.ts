import { apiData, apiRequest } from '@/api/http';
import { phpRequest, resolvePhpUrl } from '@/api/phpHttp';

export type AgentPageParams = {
  current: number;
  pageSize: number;
  name?: string;
};

export type AgentPageRecord = {
  id?: string;
  orgId?: string;
  oldOrgId?: string;
  orgCode?: string;
  state?: boolean;
  name?: string;
  contactsName?: string;
  contactsPhone?: string;
  logoId?: string;
  logoUrl?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  createTime?: string;
  [key: string]: any;
};

export type AgentPageResult = {
  records?: AgentPageRecord[];
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

export type AgentAddParams = {
  name: string;
  contactsName: string;
  contactsPhone: string;
  logoId: string;
  province: string;
  city: string;
  area: string;
  provinceCode: string;
  cityCode: string;
  areaCode: string;
  address: string;
  agentManagerPhone: string;
  agentManagerName: string;
  agentManagerNickName: string;
  agentManagerPassword: string;
  agentManagerAvatar: string;
};

export type AgentModifyParams = {
  id: string;
  name: string;
  contactsName: string;
  contactsPhone: string;
  logoId: string;
  province: string;
  city: string;
  area: string;
  provinceCode: string;
  cityCode: string;
  areaCode: string;
  address: string;
};

export type AgentDetailRecord = {
  id?: string;
  orgId?: string;
  orgCode?: string;
  name?: string;
  contactsName?: string;
  contactsPhone?: string;
  logoId?: string;
  logoUrl?: string;
  province?: string;
  provinceCode?: string;
  city?: string;
  cityCode?: string;
  area?: string;
  areaCode?: string;
  address?: string;
  timestamp?: number;
  [key: string]: any;
};

export type AgentPaymentChannelParams = {
  userId: string;
  userType?: string;
  page: number;
  limit: number;
  url?: string;
};

export type AgentPaymentChannelRecord = {
  id?: string | number;
  logo?: string;
  logo_url?: string;
  icon?: string;
  icon_url?: string;
  name?: string;
  title?: string;
  pay_name?: string;
  payment_name?: string;
  channel_name?: string;
  desc?: string;
  description?: string;
  information?: string;
  payment_desc?: string;
  channel_desc?: string;
  [key: string]: any;
};

export type AgentPaymentChannelPageResult = {
  records: AgentPaymentChannelRecord[];
  total: number;
  current: number;
  pageSize: number;
};

export type AgentPaymentSwitchType =
  | 'channel'
  | 'serviceConfig'
  | 'merchantConfig'
  | 'routeConfig';

export type AgentPaymentSwitchParams = {
  userId: string;
  paymentId: string;
  status: 0 | 1;
};

export type AgentPlugRecord = {
  id?: string | number;
  plug_id?: string | number;
  identification?: string;
  icon_url?: string;
  information?: string;
  a_status?: string | number | boolean;
  name?: string;
  title?: string;
  plug_name?: string;
  app_name?: string;
  category_name?: string;
  type_name?: string;
  group_name?: string;
  is_open?: string | number | boolean;
  open_status?: string | number | boolean;
  status?: string | number | boolean;
  state?: string | number | boolean;
  children?: AgentPlugRecord[];
  list?: AgentPlugRecord[];
  plug_list?: AgentPlugRecord[];
  [key: string]: any;
};

type PhpResponse<TData> = {
  status?: string | number;
  message?: string;
  msg?: string;
  data?: TData;
  total?: string | number;
  count?: string | number;
};

function isPhpSuccess(status?: string | number) {
  return status === 1 || status === '1';
}

function readPhpList<TRecord>(payload: any): TRecord[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.records)) return payload.records;
  if (Array.isArray(payload.list)) return payload.list;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function readPhpTotal(payload: any, fallback: number) {
  const total = Number(
    payload?.total ?? payload?.count ?? payload?.pagination?.total ?? fallback,
  );
  return Number.isFinite(total) ? total : fallback;
}

const AGENT_PAYMENT_SWITCH_URL_MAP: Record<AgentPaymentSwitchType, string> = {
  channel: '/Super/Payment/openAgentPayment',
  serviceConfig: '/Super/Payment/openAgentPConfig',
  merchantConfig: '/Super/Payment/openMerchant',
  routeConfig: '/Super/Payment/openRoute',
};

export async function getAgentPage(
  data: AgentPageParams,
  options?: { [key: string]: any },
) {
  return apiData<AgentPageResult>('/api/admin/org/v1/agent/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function addAgent(
  data: AgentAddParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/org/v1/agent/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function modifyAgent(
  data: AgentModifyParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/org/v1/agent/modify', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getAgentDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<AgentDetailRecord>(`/api/admin/org/v1/agent/${id}/detail`, {
    method: 'GET',
    ...(options || {}),
  });
}

export async function deleteAgent(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<any>(`/api/admin/org/v1/agent/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

export async function getAgentPaymentChannelList(
  params: AgentPaymentChannelParams,
) {
  const formData = new FormData();
  formData.append('user_id', params.userId);
  formData.append('user_type', params.userType || '2');
  formData.append('page', String(params.page));
  formData.append('limit', String(params.limit));

  const response = await phpRequest<PhpResponse<any>>(
    params.url || '/Super/Payment/getList',
    {
      method: 'POST',
      data: formData,
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (!isPhpSuccess(response?.status)) {
    throw new Error(
      response?.message || response?.msg || '获取支付通道列表失败',
    );
  }

  const data = response?.data;
  const listPayload =
    data && typeof data === 'object' && !Array.isArray(data) ? data : response;
  const records = readPhpList<AgentPaymentChannelRecord>(data);
  const nextRecords =
    records.length > 0
      ? records
      : readPhpList<AgentPaymentChannelRecord>(response);

  return {
    records: nextRecords.map((item) => ({
      ...item,
      logo_url: resolvePhpUrl(
        item.logo_url || item.logo || item.icon_url || '',
      ),
      icon_url: resolvePhpUrl(item.icon_url || item.icon || ''),
    })),
    total: readPhpTotal(listPayload, nextRecords.length),
    current: params.page,
    pageSize: params.limit,
  } as AgentPaymentChannelPageResult;
}

export async function updateAgentPaymentSwitch(
  type: AgentPaymentSwitchType,
  params: AgentPaymentSwitchParams,
) {
  const formData = new FormData();
  formData.append('status', String(params.status));
  formData.append('user_id', params.userId);
  formData.append('user_type', '2');
  formData.append('payment_id', params.paymentId);

  const response = await phpRequest<PhpResponse<any>>(
    AGENT_PAYMENT_SWITCH_URL_MAP[type],
    {
      method: 'POST',
      data: formData,
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (!isPhpSuccess(response?.status)) {
    throw new Error(
      response?.message || response?.msg || '修改支付通道配置失败',
    );
  }

  return response;
}
