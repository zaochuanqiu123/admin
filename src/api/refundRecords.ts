import { apiData } from '@/api/http';

export type RefundRecordPayMethod =
  | 'WECHAT'
  | 'ALIPAY'
  | 'UNIONPAY'
  | 'POS'
  | 'BANKTRANSFER'
  | string;

export type RefundRecordSource =
  | 'RECEIPT'
  | 'RETAIL'
  | 'CATER'
  | 'FUEL'
  | 'PARK'
  | 'OPEN_API'
  | string;

export type RefundRecordType = 'NORMAL' | 'SPLIT' | 'SETTLE' | 'OTHER' | string;

export type RefundRecordPageParams = {
  current: number;
  pageSize: number;
  channelCode?: string;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  orderNo?: string;
  orderTradeNo?: string;
  refundNo?: string;
  refundTradeNo?: string;
  channelRefundNo?: string;
  channelRefundTradeNo?: string;
  accRefundNo?: string;
  accRefundTradeNo?: string;
  channelMerchantNo?: string;
  source?: RefundRecordSource;
  payMethod?: RefundRecordPayMethod;
  refundState?: number | string;
  refundType?: RefundRecordType;
  finishTimeStart?: string;
  finishTimeEnd?: string;
  createTimeStart?: string;
  createTimeEnd?: string;
};

export type RefundRecordOrgInfo = {
  id?: string;
  orgCode?: string;
  orgName?: string;
  orgLevelCode?: string;
};

export type RefundAccountItem = {
  account?: string;
  amount?: number;
  [key: string]: any;
};

export type RefundRecord = {
  id?: string;
  channelCode?: string;
  channelConfigId?: string;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  agentOrg?: RefundRecordOrgInfo;
  groupOrg?: RefundRecordOrgInfo;
  merchantOrg?: RefundRecordOrgInfo;
  storeOrg?: RefundRecordOrgInfo;
  merchantOrgCode?: string;
  orderNo?: string;
  orderTradeNo?: string;
  refundNo?: string;
  refundTradeNo?: string;
  channelRefundNo?: string;
  channelRefundTradeNo?: string;
  accRefundNo?: string;
  accRefundTradeNo?: string;
  channelMerchantNo?: string;
  source?: RefundRecordSource;
  payMethod?: RefundRecordPayMethod;
  refundAmount?: number;
  refundFee?: number;
  refundState?: number;
  failReason?: string;
  refundAccount?: string;
  refundAccountList?: RefundAccountItem[];
  refundType?: RefundRecordType;
  profitReturnState?: number;
  finishTime?: string;
  createTime?: string;
  [key: string]: any;
};

export type RefundRecordPageResult = {
  records?: RefundRecord[];
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

export async function getRefundRecordPage(
  data: RefundRecordPageParams,
  options?: { [key: string]: any },
) {
  return apiData<RefundRecordPageResult>('/api/admin/trade/v1/refund/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
