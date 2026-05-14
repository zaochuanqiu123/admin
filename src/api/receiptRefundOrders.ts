import { apiData } from '@/api/http';

export type ReceiptRefundOrderPageParams = {
  current: number;
  pageSize: number;
  merchantOrgId?: string;
  storeOrgId?: string;
  agentOrgId?: string;
  groupOrgId?: string;
  userId?: string;
  orderNo?: string;
  refundNo?: string;
  refundTradeNo?: string;
  refundState?: number;
  createTimeStart?: string;
  createTimeEnd?: string;
  finishTimeStart?: string;
  finishTimeEnd?: string;
};

export type ReceiptRefundOrderOrgInfo = {
  id?: string;
  orgCode?: string;
  orgName?: string;
  orgLevelCode?: string;
};

export type ReceiptRefundOrderRecord = {
  id?: string;
  merchantOrgId?: string;
  merchantOrg?: ReceiptRefundOrderOrgInfo;
  merchantOrgName?: string;
  merchantOrgCode?: string;
  storeOrgId?: string;
  storeOrg?: ReceiptRefundOrderOrgInfo;
  storeOrgName?: string;
  storeOrgCode?: string;
  agentOrgId?: string;
  agentOrg?: ReceiptRefundOrderOrgInfo;
  agentOrgName?: string;
  agentOrgCode?: string;
  groupOrgId?: string;
  groupOrg?: ReceiptRefundOrderOrgInfo;
  groupOrgName?: string;
  groupOrgCode?: string;
  userId?: string;
  userName?: string;
  refundUserName?: string;
  refundUserPhone?: string;
  phone?: string;
  orderNo?: string;
  refundNo?: string;
  refundTradeNo?: string;
  payMethod?: string;
  accRefundNo?: string;
  accRefundTradeNo?: string;
  refundState?: number;
  refundAmount?: number;
  refundFee?: number;
  remainingRefundAmount?: number;
  refundReason?: string;
  finishTime?: string;
  createTime?: string;
  updateTime?: string;
  [key: string]: any;
};

export type ReceiptRefundOrderPageResult = {
  records?: ReceiptRefundOrderRecord[];
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

export async function getReceiptRefundOrderPage(
  params: ReceiptRefundOrderPageParams,
  options?: { [key: string]: any },
) {
  return apiData<ReceiptRefundOrderPageResult>(
    '/api/admin/receipt/v1/receiptRefund/page',
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
}

export async function getReceiptRefundOrderDetailByOrderNo(
  orderNo: string,
  options?: { [key: string]: any },
) {
  return apiData<ReceiptRefundOrderRecord>(
    `/api/admin/receipt/v1/receiptRefund/order/${encodeURIComponent(orderNo)}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getReceiptRefundOrderDetailByNo(
  no: string,
  payMethod: string,
  options?: { [key: string]: any },
) {
  return apiData<ReceiptRefundOrderRecord>(
    `/api/admin/receipt/v1/receiptRefund/refundNo/${encodeURIComponent(no)}/${encodeURIComponent(payMethod)}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
