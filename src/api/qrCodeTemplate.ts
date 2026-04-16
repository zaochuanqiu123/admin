import { apiData, apiRequest } from '@/api/http';

export type QrCodeTemplatePageQueryParams = {
  current: number;
  pageSize: number;
  name?: string;
};

export type QrCodeTemplateRecord = {
  id: string;
  name?: string;
  brandName?: string;
  brandId?: string;
  isDefault?: number;
  defaultFlag?: number;
  prevImage?: string;
  prevImageUrl?: string;
  prevImageAttachmentId?: string;
  qrcodeSnConfig?: {
    isShow?: number;
    size?: number;
    y?: number;
  };
  remark?: string;
  state?: number;
  createTime?: string;
  createUserId?: string;
  updateTime?: string;
  updateUserId?: string;
};

export type QrCodeTemplatePageResult = {
  records?: QrCodeTemplateRecord[];
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

export type QrCodeTemplateListQueryParams = {
  name?: string;
  state?: number;
};

export async function getQrCodeTemplatePageQuery(
  data: QrCodeTemplatePageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<QrCodeTemplatePageResult>(
    '/api/admin/device/v1/qrcodeTemplate/page',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function getQrCodeTemplateList(
  data?: QrCodeTemplateListQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<QrCodeTemplateRecord[]>(
    '/api/admin/device/v1/qrcodeTemplate/list',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export type QrCodeTemplateAddParams = {
  name: string;
  prevImageAttachmentId: string;
  qrcodeSnConfig: {
    isShow: number;
    size: number;
    y: number;
    color: string;
  };
  qrcodeImageConfig: {
    w: number;
    h: number;
    x: number;
    y: number;
    color: string;
  };
  bgConfig: {
    w: number;
    h: number;
    imageAttachmentId: string;
  };
  remark?: string;
  state: number;
};

export async function addQrCodeTemplate(
  data: QrCodeTemplateAddParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/device/v1/qrcodeTemplate/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getQrCodeTemplateDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<any>(`/api/admin/device/v1/qrcodeTemplate/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

export async function updateQrCodeTemplate(
  data: QrCodeTemplateAddParams & { id: string },
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/device/v1/qrcodeTemplate/update', {
    method: 'POST', // 如果后端是 PUT 请求请自行更改
    data,
    ...(options || {}),
  });
}

export async function deleteQrCodeTemplate(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<any>(`/api/admin/device/v1/qrcodeTemplate/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}
