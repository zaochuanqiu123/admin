import { apiData } from '@/api/http';

export type TerminalType = 'POS' | 'MPOS' | 'KIOSK' | 'MOBILE' | 'PC' | string;

export type TerminalPageQueryParams = {
  current: number;
  pageSize: number;
  sn?: string;
  brandCode?: string;
  model?: string;
  osCode?: string;
  osVersion?: string;
  clientVersion?: string;
  remark?: string;
  state?: number;
  type?: TerminalType;
  currentIp?: string;
};

export type TerminalReportPayload = {
  sn: string;
  type: TerminalType;
  brandCode?: string;
  model?: string;
  osCode?: string;
  osVersion?: string;
  clientVersion?: string;
  currentIp?: string;
};

export type TerminalRecord = {
  id?: string | number;
  sn?: string;
  brandCode?: string;
  model?: string;
  osCode?: string;
  osVersion?: string;
  clientVersion?: string;
  remark?: string;
  state?: number;
  type?: TerminalType;
  currentIp?: string;
  createTime?: string;
  updateTime?: string;
  [key: string]: any;
};

export type TerminalPageResult = {
  records?: TerminalRecord[];
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

export async function getTerminalPageQuery(
  data: TerminalPageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<TerminalPageResult>('/api/admin/device/v1/terminal/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function reportTerminal(
  data: TerminalReportPayload,
  options?: { [key: string]: any },
) {
  return apiData<boolean>('/api/admin/device/v1/terminal/report', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
