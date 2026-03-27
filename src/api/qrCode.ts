import { apiData, apiRequest } from '@/api/http';

export type QrCodePageQueryParams = {
  current: number;
  pageSize: number;
  batchSn?: string;
  sn?: string;
  model?: string;
  qrcodeTemplateId?: string;
};

export type QrCodeTemplateInfo = {
  name?: string;
  prevImageUrl?: string;
};

export type QrCodeRecord = {
  id: string;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  storeOrgUserId?: string;
  batchSn?: string;
  sn?: string;
  model?: string;
  qrcodeTemplateId?: string;
  openType?: string;
  bizType?: string;
  qrCodeContent?: string;
  targetId?: string;
  bizConfig?: Record<string, any>;
  remark?: string;
  state?: number;
  transferTime?: string;
  bindTime?: string;
  createTime?: string;
  createUserId?: string;
  updateTime?: string;
  updateUserId?: string;
  qrcodeTemplate?: QrCodeTemplateInfo;
};

export type QrCodePageResult = {
  records?: QrCodeRecord[];
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

export type QrCodeListQueryParams = {
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  storeOrgUserId?: string;
  batchSn?: string;
  sn?: string;
  model?: string;
  qrcodeTemplateId?: string;
  openType?: string;
  bizType?: string;
  snList?: string[];
  startSn?: string;
  endSn?: string;
};

export type QrCodeBatchAddParams = {
  model: string;
  qrcodeTemplateId: string;
  openType: string;
  bizType: string;
  quantity: number;
};

export type QrCodeChangeTemplateParams = {
  operationType: 'SN_LIST' | 'SN_RANGE' | 'BATCH_SN';
  snList?: string[];
  startSn?: string;
  endSn?: string;
  batchSn?: string;
  qrcodeTemplateId: string;
};

export type QrCodeUnbindParams = {
  id?: string;
  sn?: string;
};

export type QrCodeBindParams = {
  id?: string;
  sn?: string;
  storeOrgId?: string;
  bindName?: string;
  bindRemark?: string;
};

export async function getQrCodeListQuery(
  data?: QrCodeListQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<QrCodeRecord[]>('/api/device/admin/qrcode/list', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function batchAddQrCode(
  data: QrCodeBatchAddParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/device/admin/qrcode/batchAdd', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function changeQrCodeTemplate(
  data: QrCodeChangeTemplateParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/device/admin/qrcode/changeTemplate', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getQrCodePageQuery(
  data: QrCodePageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<QrCodePageResult>('/api/device/admin/qrcode/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function unbindQrCode(
  data: QrCodeUnbindParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/device/admin/qrcode/unbind', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function bindQrCode(
  data: QrCodeBindParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/device/admin/qrcode/bind', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
