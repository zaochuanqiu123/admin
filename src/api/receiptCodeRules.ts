import { apiData, apiRequest } from '@/api/http';

export type ReceiptCodeRuleQrcodeParams = {
  qrcodeId?: string;
  qrcodeSn?: string;
};

export type ReceiptCodeRuleDetail = ReceiptCodeRuleQrcodeParams & {
  id?: string;
  amountMode?: 'INPUT' | 'FIXED' | string;
  fixedAmount?: number;
  isServiceFee?: number;
  serviceFeeType?: 'PERCENT' | 'FIXED' | string;
  serviceFeePercent?: number;
  serviceFeeFixed?: number;
  minPayAmount?: number;
  maxPayAmount?: number;
  limitPay?: 'NONE' | 'NO_CREDIT' | string;
  isMemberDiscounts?: number;
  isMerchantName?: number;
  isNicknameAvatar?: number;
  isMemberPay?: number;
  isDiscountCoupon?: number;
  remarkRequired?: number;
  phoneRequired?: number;
  goodsDesc?: string;
  [key: string]: any;
};

export type ReceiptCodeRuleSetByQrcodeParams = ReceiptCodeRuleQrcodeParams & {
  amountMode: string;
  fixedAmount?: number;
  isServiceFee: number;
  serviceFeeType?: string;
  serviceFeePercent?: number;
  serviceFeeFixed?: number;
  minPayAmount?: number;
  maxPayAmount?: number;
  limitPay: string;
  isMemberDiscounts: number;
  isMerchantName: number;
  isNicknameAvatar: number;
  isMemberPay: number;
  isDiscountCoupon: number;
  remarkRequired: number;
  phoneRequired: number;
  goodsDesc: string;
};

export async function getReceiptCodeRuleByQrcode(
  params: ReceiptCodeRuleQrcodeParams,
  options?: { [key: string]: any },
) {
  return apiData<ReceiptCodeRuleDetail>(
    '/api/admin/receipt/v1/receiptCodeRules/getByQrcode',
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
}

export async function setReceiptCodeRuleByQrcode(
  data: ReceiptCodeRuleSetByQrcodeParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/receipt/v1/receiptCodeRules/setByQrcode', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
