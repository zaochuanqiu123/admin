import { apiData, apiRequest } from '@/api/http';

export type ReceiptPayMethod =
  | 'WECHAT'
  | 'ALIPAY'
  | 'UNIONPAY'
  | 'UNION_CARD'
  | 'MEMBER_CARD'
  | 'CASH'
  | string;
export type ReceiptPayWay =
  | 'BARCODE'
  | 'JSAPI'
  | 'MINI_PROGRAM'
  | 'H5'
  | 'NATIVE'
  | 'BANK_TRANSFER'
  | 'QUICK'
  | 'CARD_PRESENT'
  | string;

export type ReceiptOrderPageParams = {
  current: number;
  pageSize: number;
  merchantOrgId?: string;
  storeOrgId?: string;
  agentOrgId?: string;
  groupOrgId?: string;
  orderNo?: string;
  orderTradeNo?: string;
  phone?: string;
  payState?: number | string;
  payMethod?: ReceiptPayMethod;
  payWay?: ReceiptPayWay;
  deviceSn?: string;
  finishTimeStart?: string;
  finishTimeEnd?: string;
  createTimeStart?: string;
  createTimeEnd?: string;
};

export type ReceiptOrderRefundParams = {
  orderNo: string;
  amount?: number | string;
  refundReason?: string;
};

export type ReceiptOrderOrgInfo = {
  id?: string;
  orgCode?: string;
  orgName?: string;
  orgLevelCode?: string;
};

export type ReceiptOrderCashierInfo = {
  id?: string;
  orgId?: string;
  orgCode?: string;
  userId?: string;
  nickName?: string;
  state?: boolean;
  [key: string]: any;
};

export type ReceiptOrderRecord = {
  id?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrg?: ReceiptOrderOrgInfo;
  storeOrg?: ReceiptOrderOrgInfo;
  agentOrg?: ReceiptOrderOrgInfo;
  groupOrg?: ReceiptOrderOrgInfo;
  cashier?: ReceiptOrderCashierInfo;
  receiptColeRulesId?: string;
  receiptCodeRuleId?: string;
  qrcodeId?: string;
  qrcodeSn?: string;
  userId?: string;
  orderNo?: string;
  orderTradeNo?: string;
  payAmount?: number;
  amount?: number;
  serviceFee?: number;
  remark?: string;
  phone?: string;
  goodsDesc?: string;
  limitPay?: string;
  payState?: number;
  payRefundState?: number;
  payRefundStateName?: string;
  refundAmount?: number;
  deviceSn?: string;
  finishTime?: string;
  payMethod?: ReceiptPayMethod;
  payWay?: ReceiptPayWay;
  createTime?: string;
  [key: string]: any;
};

export type ReceiptOrderPageResult = {
  records?: ReceiptOrderRecord[];
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

export async function getReceiptOrderPage(
  params: ReceiptOrderPageParams,
  options?: { [key: string]: any },
) {
  return apiData<ReceiptOrderPageResult>(
    '/api/admin/receipt/v1/receiptOrder/page',
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
}

export async function getReceiptOrderDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<ReceiptOrderRecord>(
    `/api/admin/receipt/v1/receiptOrder/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function refundReceiptOrder(
  data: ReceiptOrderRefundParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/receipt/v1/receiptRefund/refund', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
