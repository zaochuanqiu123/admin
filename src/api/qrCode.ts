import { apiData } from '@/api/http';

export type QrCodePageQueryParams = {
  current: number;
  pageSize: number;
  batchSn?: string;
  sn?: string;
  model?: string;
  qrCodeTemplateId?: string;
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
  qrCodeTemplateId?: string;
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

export async function getQrCodePageQuery(
  data: QrCodePageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<QrCodePageResult>('/api/device/admin/qrCode/pageQuery', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
