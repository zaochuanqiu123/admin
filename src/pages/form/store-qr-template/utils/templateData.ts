import type { QrCodeTemplateRecord } from '@/api/qrCodeTemplate';

export function getShowSnLabel(record: QrCodeTemplateRecord) {
  return Number(record?.qrcodeSnConfig?.isShow) === 1 ? '显示' : '隐藏';
}

export function getStateLabel(state?: number) {
  if (Number(state) === 1) return '启用';
  if (Number(state) === 0) return '禁用';
  return '未知';
}

export function buildPreviewImage(record: QrCodeTemplateRecord) {
  return String(record?.prevImageUrl || record?.prevImage || '').trim();
}

export function readText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

export function getBackgroundImageUrl(data: any) {
  return readText(
    data?.bgConfig?.imageUrl,
    data?.bgConfig?.url,
    data?.bgConfig?.imageAttachmentUrl,
    data?.bgConfig?.imageAttachment?.url,
    data?.bgConfig?.attachment?.url,
    data?.backgroundImageUrl,
    data?.bgImageUrl,
  );
}

export function getBackgroundImageAttachmentId(data: any) {
  return readText(
    data?.bgConfig?.imageAttachmentId,
    data?.bgConfig?.attachmentId,
    data?.bgConfig?.imageId,
    data?.bgConfig?.imageAttachment?.id,
    data?.bgConfig?.attachment?.id,
    data?.backgroundImageAttachmentId,
    data?.bgImageAttachmentId,
  );
}
