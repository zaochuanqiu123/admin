import { apiData, apiRequest } from '@/api/http';

export type AgentPageParams = {
  current: number;
  pageSize: number;
  name?: string;
};

export type AgentPageRecord = {
  id?: string;
  orgId?: string;
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
