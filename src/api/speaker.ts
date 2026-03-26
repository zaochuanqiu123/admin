import { apiData } from '@/api/http';

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

export async function getSpeakerPageQuery(
  data: SpeakerPageParams,
  options?: { [key: string]: any },
) {
  return apiData<SpeakerPageResult>('/api/device/admin/speaker/page', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getSpeakerListQuery(
  data?: SpeakerListQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<SpeakerRecord[]>('/api/device/admin/speaker/list', {
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
    '/api/device/admin/speakerChannel/page',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}
