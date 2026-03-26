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

export async function getQrCodeTemplatePageQuery(
  data: QrCodeTemplatePageQueryParams,
  options?: { [key: string]: any },
) {
  return apiData<QrCodeTemplatePageResult>(
    '/api/device/admin/qrcodeTemplate/page',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export type QrCodeTemplateAddParams = {
  name: string;
  prevImageUrl: string;
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
  };
  bgConfig: {
    w: number;
    h: number;
    imageUrl: string;
  };
  remark?: string;
  state: number;
};

export async function addQrCodeTemplate(
  data: QrCodeTemplateAddParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/device/admin/qrcodeTemplate/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function getQrCodeTemplateDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<any>(`/api/device/admin/qrcodeTemplate/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

export async function updateQrCodeTemplate(
  data: QrCodeTemplateAddParams & { id: string },
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/device/admin/qrcodeTemplate/update', {
    method: 'POST', // 如果后端是 PUT 请求请自行更改
    data,
    ...(options || {}),
  });
}

export async function deleteQrCodeTemplate(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<any>(`/api/device/admin/qrcodeTemplate/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}
