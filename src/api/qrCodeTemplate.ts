import { apiData } from '@/api/http';

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
  qrCodeSnConfig?: {
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
    '/api/device/admin/qrCodeTemplate/page',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}
