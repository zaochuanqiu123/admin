import { apiData } from '@/api/http';

export type AgentOrgPageQueryParams = {
  current: number;
  pageSize: number;
  orgName?: string;
  orgCode?: string;
};

export type AgentOrgRecord = {
  id: string;
  orgCode?: string;
  orgLevelCode?: string;
  orgName?: string;
  createTime?: string;
  phone?: string;
  mobile?: string;
  contactPhone?: string;
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

export async function getAgentOrgPageQuery(
  data: AgentOrgPageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<AgentOrgPageResult>('/api/org/query/agent/orgPageList', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
