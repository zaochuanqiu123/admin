import { apiData, apiRequest } from '@/api/http';

export type StorageUploadSettingDetail = {
  id?: string;
  maxImageSizeMb?: number | null;
  maxVideoSizeMb?: number | null;
  maxDocumentSizeMb?: number | null;
  maxOtherFileSizeMb?: number | null;
  timestamp?: number;
  [key: string]: any;
};

export type StorageUploadSettingSaveParams = {
  id?: string;
  maxImageSizeMb?: number | null;
  maxVideoSizeMb?: number | null;
  maxDocumentSizeMb?: number | null;
  maxOtherFileSizeMb?: number | null;
};

export type CloudStorageProvider = 'ALIYUN_OSS' | string;

export type CloudStorageConfigPageParams = {
  current: number;
  pageSize: number;
  name?: string;
  provider?: CloudStorageProvider;
};

export type CloudStorageConfigRecord = {
  id?: string;
  ownerType?: string;
  ownerId?: string;
  provider?: CloudStorageProvider;
  name?: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  stsRoleArn?: string;
  cdnDomain?: string;
  uploadPrefix?: string;
  isPublicRead?: boolean;
  state?: boolean | number | string;
  status?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  [key: string]: any;
};

export type CloudStorageConfigDetail = CloudStorageConfigRecord;

export type FileAttachment = {
  id?: string;
  ownerType?: string;
  ownerId?: string;
  merchantId?: string;
  storeId?: string;
  mediaKind?: string;
  categoryId?: string;
  storageConfigId?: string;
  objectKey?: string;
  url?: string;
  originFilename?: string;
  contentType?: string;
  ext?: string;
  sizeBytes?: number;
  sha256?: string;
  width?: number;
  height?: number;
  isPublic?: boolean;
  createTime?: string;
  updateTime?: string;
  [key: string]: any;
};

export type CloudStorageConfigPageResult = {
  records?: CloudStorageConfigRecord[];
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

export type CloudStorageConfigSaveParams = {
  id?: string;
  ownerType?: string;
  ownerId?: string;
  provider: CloudStorageProvider;
  name: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  stsRoleArn?: string;
  cdnDomain?: string;
  uploadPrefix?: string;
  isPublicRead?: boolean;
  state?: boolean | number | string;
  status?: string;
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

const API_PREFIX = '/api/admin/attachment/v1';

export async function getStorageUploadSettingDetail(options?: {
  [key: string]: any;
}) {
  return apiData<StorageUploadSettingDetail>(
    `${API_PREFIX}/storageUploadSetting/detail`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function saveStorageUploadSetting(
  data: StorageUploadSettingSaveParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<StorageUploadSettingDetail>>(
    `${API_PREFIX}/storageUploadSetting/save`,
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function getCloudStorageConfigPage(
  data: CloudStorageConfigPageParams,
  options?: { [key: string]: any },
) {
  return apiData<CloudStorageConfigPageResult>(
    `${API_PREFIX}/cloudStorageConfig/page`,
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function getCloudStorageConfigDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return apiData<CloudStorageConfigDetail>(
    `${API_PREFIX}/cloudStorageConfig/detail/${id}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function saveCloudStorageConfig(
  data: CloudStorageConfigSaveParams,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<CloudStorageConfigRecord>>(
    `${API_PREFIX}/cloudStorageConfig/save`,
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

export async function updateCloudStorageConfigStatus(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    `${API_PREFIX}/cloudStorageConfig/updateStatus/${id}`,
    {
      method: 'POST',
      ...(options || {}),
    },
  );
}

export async function uploadAttachment(
  params: {
    file: Blob;
    categoryId?: string | number;
    fileName?: string;
  },
  options?: { [key: string]: any },
) {
  return apiData<FileAttachment>(`${API_PREFIX}/upload`, {
    method: 'POST',
    requestType: 'form-data',
    data: {
      file: params.fileName
        ? new File([params.file], params.fileName, {
            type: params.file.type || 'image/png',
          })
        : params.file,
      categoryId: String(params.categoryId ?? 1),
    },
    ...(options || {}),
  });
}

export async function deleteCloudStorageConfig(
  id: string,
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    `${API_PREFIX}/cloudStorageConfig/${id}`,
    {
      method: 'DELETE',
      ...(options || {}),
    },
  );
}
