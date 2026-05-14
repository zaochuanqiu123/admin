import { apiData } from '@/api/http';

export type AgentOrgPageQueryParams = {
  current: number;
  pageSize: number;
  orgName?: string;
  orgCode?: string;
};

export type OrgLevelCode = 'AGENT' | 'GROUP' | 'MERCHANT' | 'STORE';

export const ORG_LEVEL_CODE = {
  agent: 'AGENT',
  group: 'GROUP',
  merchant: 'MERCHANT',
  store: 'STORE',
} as const satisfies Record<string, OrgLevelCode>;

export type AgentOrgRecord = {
  id: string;
  orgCode?: string;
  orgLevelCode?: string;
  orgName?: string;
  createTime?: string;
};

export type OrgRecord = {
  id?: string;
  orgCode?: string;
  orgLevelCode?: string;
  orgName?: string;
};

export type AgentOrgPageResult = {
  records?: AgentOrgRecord[];
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

export type OrgOptionsQueryParams = {
  current: number;
  pageSize: number;
  orgCode?: string;
  orgName?: string;
  orgLevelCode: OrgLevelCode;
  parentOrgId: string;
  state?: boolean;
};

export type OrgOptionsRecord = {
  id: string;
  orgCode?: string;
  orgLevelCode?: OrgLevelCode | string;
  orgName?: string;
  state?: boolean;
};

export type OrgOptionsResult = {
  records?: OrgOptionsRecord[];
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

export async function getAgentOrgPageQuery(
  data: AgentOrgPageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<AgentOrgPageResult>(
    '/api/admin/org/v1/org/query/agent/orgPageList',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function getOrgOptions(
  data: OrgOptionsQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<OrgOptionsResult>('/api/admin/org/v1/org/getOrgOptions', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getCurrentMerchantStoreList(options?: {
  [key: string]: any;
}) {
  return apiData<OrgRecord[]>('/api/admin/org/v1/org/merchant/store/list', {
    method: 'GET',
    ...(options || {}),
  });
}
