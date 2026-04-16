import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { uploadAttachment } from '@/api/cloudStorage';

const ATTACHMENT_CATEGORY_ID = 1;

function getUploadResponseValue(file: UploadFile, key: 'id' | 'url') {
  return String(
    (file.response as any)?.[key] || (file.response as any)?.data?.[key] || '',
  ).trim();
}

export function normalizeUploadFileList(
  event: Parameters<NonNullable<UploadProps['onChange']>>[0] | UploadFile[],
) {
  const normalizeFile = (file: UploadFile): UploadFile => {
    const responseUrl = getUploadResponseValue(file, 'url');
    return responseUrl && !file.url ? { ...file, url: responseUrl } : file;
  };

  if (Array.isArray(event)) {
    return event.slice(-1).map(normalizeFile);
  }
  return (event?.fileList || []).slice(-1).map(normalizeFile);
}

function getLastUploadFile(fileList?: UploadFile[]) {
  return Array.isArray(fileList) && fileList.length > 0
    ? fileList[fileList.length - 1]
    : undefined;
}

export function createRemoteUploadFileList(
  url?: string,
  fileNamePrefix = 'image',
): UploadFile[] {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) {
    return [];
  }

  return [
    {
      uid: `remote-${normalizedUrl}`,
      name: /\.[a-z0-9]+$/i.test(fileNamePrefix)
        ? fileNamePrefix
        : `${fileNamePrefix}.png`,
      status: 'done',
      url: normalizedUrl,
    },
  ];
}

function getAttachmentImageUrl(
  attachment: Awaited<ReturnType<typeof uploadAttachment>>,
) {
  return String(attachment?.url || '').trim();
}

function getAttachmentId(
  attachment: Awaited<ReturnType<typeof uploadAttachment>>,
) {
  return String(attachment?.id || '').trim();
}

export async function uploadImageAttachment(file: Blob, fileName?: string) {
  const attachment = await uploadAttachment(
    {
      file,
      fileName,
      categoryId: ATTACHMENT_CATEGORY_ID,
    },
    { skipErrorHandler: true },
  );
  const imageUrl = getAttachmentImageUrl(attachment);
  if (!imageUrl) {
    throw new Error('上传接口未返回图片地址');
  }
  return attachment;
}

export async function uploadImageFile(file: Blob, fileName?: string) {
  const attachment = await uploadImageAttachment(file, fileName);
  const imageUrl = getAttachmentImageUrl(attachment);
  return imageUrl;
}

export const imageUploadRequest: NonNullable<
  UploadProps['customRequest']
> = async ({ file, onError, onSuccess }) => {
  try {
    const uploadFile = file as Blob & { name?: string };
    const attachment = await uploadImageAttachment(uploadFile, uploadFile.name);
    onSuccess?.(attachment);
  } catch (error) {
    onError?.(error as Error);
  }
};

export async function resolveUploadImageUrl(
  fileList: UploadFile[] | undefined,
  fallbackUrl = '',
): Promise<string> {
  const file = getLastUploadFile(fileList);
  if (!file) {
    return String(fallbackUrl || '').trim();
  }
  const existingUrl = String(file.url || '').trim();
  if (/^https?:\/\//i.test(existingUrl)) {
    return existingUrl;
  }
  const responseUrl = getUploadResponseValue(file, 'url');
  if (/^https?:\/\//i.test(responseUrl)) {
    return responseUrl;
  }
  if (file.status === 'uploading') {
    throw new Error('图片正在上传，请稍后再提交');
  }
  if (file.status === 'error') {
    throw new Error('图片上传失败，请重新上传');
  }

  const uploadFile = file.originFileObj;
  if (!uploadFile) {
    return existingUrl || String(fallbackUrl || '').trim();
  }

  return uploadImageFile(uploadFile, file.name);
}

export async function resolveUploadAttachmentId(
  fileList: UploadFile[] | undefined,
  fallbackId = '',
): Promise<string> {
  const file = getLastUploadFile(fileList);
  if (!file) {
    return String(fallbackId || '').trim();
  }
  const responseId = getUploadResponseValue(file, 'id');
  if (responseId) {
    return responseId;
  }
  if (file.status === 'uploading') {
    throw new Error('图片正在上传，请稍后再提交');
  }
  if (file.status === 'error') {
    throw new Error('图片上传失败，请重新上传');
  }

  const uploadFile = file.originFileObj;
  if (!uploadFile) {
    return String(fallbackId || '').trim();
  }

  const attachment = await uploadImageAttachment(uploadFile, file.name);
  const attachmentId = getAttachmentId(attachment);
  if (!attachmentId) {
    throw new Error('上传接口未返回附件 ID');
  }
  return attachmentId;
}
