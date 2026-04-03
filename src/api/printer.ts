import { apiData } from '@/api/http';

export type PrinterPrintType = 'TICKET' | 'LABEL' | string;
export type PrinterConnectType =
  | 'SERIAL'
  | 'USB'
  | 'NETWORK'
  | 'BLUETOOTH'
  | 'CLOUD'
  | string;

export type PrinterOrgInfo = {
  id?: string;
  orgCode?: string;
  orgLevelCode?: string;
  orgName?: string;
};

export type PrinterPageQueryParams = {
  current: number;
  pageSize: number;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  sn?: string;
  printerChannelId?: string;
  printerChannelCode?: string;
  model?: string;
  printType?: PrinterPrintType;
  connectType?: PrinterConnectType;
  state?: number;
  bindName?: string;
  snList?: string[];
  startSn?: string;
  endSn?: string;
};

export type PrinterRecord = {
  id?: string | number;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  sn?: string;
  printerChannelId?: string;
  printerChannelCode?: string;
  model?: string;
  printType?: PrinterPrintType;
  connectType?: PrinterConnectType;
  state?: number;
  bindName?: string;
  createTime?: string;
  updateTime?: string;
  agentOrg?: PrinterOrgInfo;
  groupOrg?: PrinterOrgInfo;
  merchantOrg?: PrinterOrgInfo;
  storeOrg?: PrinterOrgInfo;
  [key: string]: any;
};

export type PrinterPageResult = {
  records?: PrinterRecord[];
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

export async function getPrinterPageQuery(
  data: PrinterPageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<PrinterPageResult>('/api/admin/device/v1/printer/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
