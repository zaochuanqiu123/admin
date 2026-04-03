import { apiData, apiRequest } from '@/api/http';

export type SpeakerOrgInfo = {
  id?: string;
  orgCode?: string;
  orgLevelCode?: string;
  orgName?: string;
};

export type SpeakerTrafficConfig = Record<string, any> | string | undefined;

export type SpeakerQrCodeInfo = {
  qrcodeTemplateId?: string;
  openType?: string;
  bizType?: string;
  qrcodeContent?: string;
  [key: string]: any;
};

export type SpeakerQrCodeTemplateInfo = {
  name?: string;
  prevImageUrl?: string;
  [key: string]: any;
};

export type SpeakerRecord = {
  id: string;
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  batchSn?: string;
  sn?: string;
  model?: string;
  qrcodeId?: string;
  qrcodeSn?: string;
  speakerChannelId?: string;
  speakerChannelCode?: string;
  isCustomPrefix?: number;
  customPrefix?: string;
  pengConfig?: SpeakerTrafficConfig;
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
  qrcode?: SpeakerQrCodeInfo;
  qrcodeTemplate?: SpeakerQrCodeTemplateInfo;
  agentOrg?: SpeakerOrgInfo;
  groupOrg?: SpeakerOrgInfo;
  merchantOrg?: SpeakerOrgInfo;
  storeOrg?: SpeakerOrgInfo;
  [key: string]: any;
};

export type SpeakerPageQueryParams = {
  agentOrgId?: string;
  groupOrgId?: string;
  merchantOrgId?: string;
  storeOrgId?: string;
  batchSn?: string;
  sn?: string;
  snList?: string[];
  startSn?: string;
  endSn?: string;
};

export type SpeakerListQueryParams = SpeakerPageQueryParams;

export type SpeakerPageParams = SpeakerPageQueryParams & {
  current: number;
  pageSize: number;
};

export type SpeakerPageResult = {
  records?: SpeakerRecord[];
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

export type SpeakerChannelRecord = {
  id: string;
  code?: string;
  name?: string;
  logo?: string;
  remark?: string;
  config?: string;
  state?: number;
  createTime?: string;
  createUserId?: string;
  updateTime?: string;
  updateUserId?: string;
  sort?: number;
  sortNum?: number;
  orderNum?: number;
  belongBrandName?: string;
  brandName?: string;
  [key: string]: any;
};

export type SpeakerChannelPageParams = {
  current: number;
  pageSize: number;
  code?: string;
  name?: string;
  state?: number;
};

export type SpeakerChannelPageResult = {
  records?: SpeakerChannelRecord[];
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

export type SpeakerChannelSaveParams = {
  id?: string;
  code: string;
  name: string;
  logo?: string;
  remark?: string;
  config: string;
  state: number;
};

export type SpeakerBroadcastParams = {
  speakerSn: string;
  qrcodeSn: string;
  type: 'CONTENT' | 'PAY_METHOD' | 'CANCEL';
  content?: string;
  payMethod?: string;
  payAmount?: string;
};

export type SpeakerTransferParams = {
  transferType: 'ISSUE' | 'RETURN';
  orgId?: string;
  snList: string[];
  remark?: string;
};

type CommonApiResponse<T = any> = {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: T;
  success?: boolean;
  errorMessage?: string;
};

export async function getSpeakerPageQuery(
  data: SpeakerPageParams,
  options?: { [key: string]: any },
) {
  return apiData<SpeakerPageResult>('/api/admin/device/v1/speaker/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getSpeakerListQuery(
  data?: SpeakerListQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<SpeakerRecord[]>('/api/admin/device/v1/speaker/list', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getSpeakerChannelPageQuery(
  data: SpeakerChannelPageParams,
  options?: { [key: string]: any },
) {
  return apiData<SpeakerChannelPageResult>(
    '/api/admin/device/v1/speakerChannel/page',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function getSpeakerChannelDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<SpeakerChannelRecord>(
    `/api/device/admin/speakerChannel/${id}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function updateSpeakerChannel(
  data: SpeakerChannelSaveParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    '/api/device/admin/speakerChannel/update',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function broadcastSpeaker(
  data: SpeakerBroadcastParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    '/api/admin/device/v1/speaker/broadcast',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function transferSpeaker(
  data: SpeakerTransferParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    '/api/admin/device/v1/speaker/transfer',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}
