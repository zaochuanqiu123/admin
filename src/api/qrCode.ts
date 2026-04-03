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
  [key: string]: any;
};

export type QrCodeOrgInfo = {
  id?: string;
  orgCode?: string;
  orgLevelCode?: string;
  orgName?: string;
  [key: string]: any;
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
  bindName?: string;
  bindRemark?: string;
  createTime?: string;
  createUserId?: string;
  updateTime?: string;
  updateUserId?: string;
  qrcodeTemplate?: QrCodeTemplateInfo;
  agentOrg?: QrCodeOrgInfo;
  groupOrg?: QrCodeOrgInfo;
  merchantOrg?: QrCodeOrgInfo;
  storeOrg?: QrCodeOrgInfo;
  [key: string]: any;
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

export type QrCodeTransferParams = {
  transferType: 'ISSUE' | 'RETURN';
  orgId?: string;
  snList: string[];
  remark?: string;
};

export async function getQrCodeListQuery(
  data?: QrCodeListQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<QrCodeRecord[]>('/api/admin/device/v1/qrcode/list', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function batchAddQrCode(
  data: QrCodeBatchAddParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/device/v1/qrcode/batchAdd', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function changeQrCodeTemplate(
  data: QrCodeChangeTemplateParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/device/v1/qrcode/changeTemplate', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getQrCodePageQuery(
  data: QrCodePageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<QrCodePageResult>('/api/admin/device/v1/qrcode/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function unbindQrCode(
  data: QrCodeUnbindParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/device/v1/qrcode/unbind', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function bindQrCode(
  data: QrCodeBindParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/device/v1/qrcode/bind', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function transferQrCode(
  data: QrCodeTransferParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/device/v1/qrcode/transfer', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
