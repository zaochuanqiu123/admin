import { apiData, apiRequest } from '@/api/http';

export type ReceiptPayMethod = 'WECHAT' | 'ALIPAY' | 'UNIONPAY' | string;
export type ReceiptPayWay = 'MINI' | 'H5' | 'BARCODE' | string;

export type ReceiptOrderPageParams = {
  current: number;
  pageSize: number;
  merchantOrgId?: string;
  storeOrgId?: string;
  agentOrgId?: string;
  groupOrgId?: string;
  receiptCodeRuleId?: string;
  qrcodeId?: string;
  qrcodeSn?: string;
  userId?: string;
  orderNo?: string;
  orderTradeNo?: string;
  phone?: string;
  payMethod?: ReceiptPayMethod;
  payWay?: ReceiptPayWay;
  startTime?: string;
  endTime?: string;
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
  return apiRequest<any>('/api/admin/receipt/v1/receiptOrder/refund', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
