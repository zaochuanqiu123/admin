import { apiData } from '@/api/http';

export type DeviceTransferType = 'ISSUE' | 'RETURN';
export type DeviceTransferDeviceType = 'QRCODE' | 'SPEAKER' | 'PRINTER';

export type DeviceTransferPageParams = {
  current: number;
  pageSize: number;
  orderNo?: string;
  transferType?: DeviceTransferType;
  deviceType?: DeviceTransferDeviceType;
  orgId?: string;
};

export type DeviceTransferRecord = {
  id: string;
  orderNo?: string;
  fromOrgId?: string;
  toOrgId?: string;
  quantity?: number;
  transferType?: DeviceTransferType;
  deviceType?: DeviceTransferDeviceType;
  remark?: string;
  createTime?: string;
  createUserId?: string;
  updateTime?: string;
  updateUserId?: string;
  [key: string]: any;
};

export type DeviceTransferPageResult = {
  records?: DeviceTransferRecord[];
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

export type DeviceTransferDetailPageParams = {
  current: number;
  pageSize: number;
  transferId?: string;
  transferOrderNo?: string;
  deviceType?: DeviceTransferDeviceType;
  deviceSn?: string;
};

export type DeviceTransferDetailRecord = {
  id: string;
  transferId?: string;
  transferOrderNo?: string;
  deviceType?: DeviceTransferDeviceType;
  deviceSn?: string;
  createTime?: string;
  createUserId?: string;
  updateTime?: string;
  updateUserId?: string;
  [key: string]: any;
};

export type DeviceTransferDetailPageResult = {
  records?: DeviceTransferDetailRecord[];
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

export async function getDeviceTransferPage(
  data: DeviceTransferPageParams,
  options?: { [key: string]: any },
) {
  return apiData<DeviceTransferPageResult>(
    '/api/admin/device/v1/transfer/page',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function getDeviceTransferDetailPage(
  data: DeviceTransferDetailPageParams,
  options?: { [key: string]: any },
) {
  return apiData<DeviceTransferDetailPageResult>(
    '/api/admin/device/v1/transferDevice/page',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}
