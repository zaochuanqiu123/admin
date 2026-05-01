import { apiData } from '@/api/http';

export type PaymentRecordPayMethod =
  | 'WECHAT'
  | 'ALIPAY'
  | 'UNIONPAY'
  | 'UNIONCARD'
  | 'BANKTRANSFER'
  | 'QUICK'
  | string;
export type PaymentRecordPayWay =
  | 'BARCODE'
  | 'OFFIACCOUNT'
  | 'MINIPROGRAM'
  | 'H5'
  | 'NATIVE'
  | string;
export type PaymentRecordSource =
  | 'RECEIPT'
  | 'RETAIL'
  | 'CATER'
  | 'FUEL'
  | 'PARK'
  | 'OPEN_API'
  | string;

export type PaymentRecordPageParams = {
  current: number;
  pageSize: number;
  channelCode?: string;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  orderNo?: string;
  orderTradeNo?: string;
  channelOrderNo?: string;
  channelOrderTradeNo?: string;
  accOrderNo?: string;
  accOrderTradeNo?: string;
  channelMerchantNo?: string;
  thirdOrderNo?: string;
  channelTradeNo?: string;
  accMerchantNo?: string;
  source?: PaymentRecordSource;
  payMethod?: PaymentRecordPayMethod;
  payWay?: PaymentRecordPayWay;
  payState?: number | string;
  refundState?: number | string;
  finishTimeStart?: string;
  finishTimeEnd?: string;
  createTimeStart?: string;
  createTimeEnd?: string;
};

export type PaymentRecordOrgInfo = {
  id?: string;
  orgCode?: string;
  orgName?: string;
  orgLevelCode?: string;
};

export type PaymentRecord = {
  id?: string;
  channelCode?: string;
  channelConfigId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrg?: PaymentRecordOrgInfo;
  storeOrg?: PaymentRecordOrgInfo;
  agentOrg?: PaymentRecordOrgInfo;
  groupOrg?: PaymentRecordOrgInfo;
  orderNo?: string;
  orderTradeNo?: string;
  channelOrderNo?: string;
  channelOrderTradeNo?: string;
  accOrderNo?: string;
  accOrderTradeNo?: string;
  channelMerchantNo?: string;
  outOrderNo?: string;
  thirdOrderNo?: string;
  channelTradeNo?: string;
  accMerchantNo?: string;
  source?: PaymentRecordSource;
  payMethod?: PaymentRecordPayMethod;
  payWay?: PaymentRecordPayWay;
  payAmount?: number;
  refundAmount?: number;
  payFee?: number;
  settleAmount?: number;
  payState?: number;
  refundState?: number;
  profitShareState?: number;
  finishTime?: string;
  createTime?: string;
  [key: string]: any;
};

export type PaymentRecordPageResult = {
  records?: PaymentRecord[];
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

export async function getPaymentRecordPage(
  data: PaymentRecordPageParams,
  options?: { [key: string]: any },
) {
  return apiData<PaymentRecordPageResult>('/api/admin/trade/v1/pay/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
