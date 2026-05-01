import type { SpeakerRecord } from '@/api/speaker';

function readText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function readTrafficConfig(record: SpeakerRecord): Record<string, any> {
  const rawConfig = record?.pengConfig;
  if (!rawConfig) return {};
  if (typeof rawConfig === 'object') return rawConfig;

  try {
    const parsed = JSON.parse(String(rawConfig));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function getBelongBrandName(record: SpeakerRecord): string {
  return (
    readText(
      record?.brandName,
      record?.belongBrandName,
      record?.customPrefix,
      record?.qrcode?.brandName,
      record?.qrcode?.belongBrandName,
    ) || '-'
  );
}

export function getSpeakerBrandName(record: SpeakerRecord): string {
  return (
    readText(
      record?.speakerBrandName,
      record?.speakerBrand,
      record?.speakerChannelName,
      record?.speakerChannelCode,
      record?.brand,
    ) || '-'
  );
}

export function getSpeakerNameLines(record: SpeakerRecord): string[] {
  const lines = [
    readText(
      record?.speakerName,
      record?.deviceName,
      record?.name,
      record?.remark,
      record?.qrcodeTemplate?.name,
    ),
    readText(
      record?.speakerConfigName,
      record?.speakerConfig,
      record?.configName,
    ),
    readText(record?.model),
  ].filter(Boolean);

  return lines.length > 0 ? lines : ['-'];
}

export function isSpeakerBound(record: SpeakerRecord): boolean {
  return Boolean(
    readText(
      record?.storeOrg?.id,
      record?.storeOrg?.orgCode,
      record?.storeOrg?.orgName,
      record?.storeOrgId,
    ),
  );
}

export function isSpeakerTransferred(record: SpeakerRecord): boolean {
  return Boolean(readText(record?.transferTime));
}

export function getOrgDisplayLines(record: SpeakerRecord): string[] {
  const primaryLine =
    readText(
      record?.storeOrg?.orgName,
      record?.merchantOrg?.orgName,
      record?.agentOrg?.orgName,
      record?.groupOrg?.orgName,
      record?.bindName,
    ) || '-';
  const secondaryLine = readText(
    record?.storeOrg?.orgCode,
    record?.merchantOrg?.orgCode,
    record?.agentOrg?.orgCode,
    record?.groupOrg?.orgCode,
  );
  const thirdLine = readText(record?.bindTime, record?.transferTime);

  return [primaryLine, secondaryLine, thirdLine].filter(Boolean);
}

export function getBindDisplayLines(record: SpeakerRecord): string[] {
  const lines = [
    readText(record?.merchantOrg?.orgName) &&
      `商户：${readText(record?.merchantOrg?.orgName)}`,
    readText(record?.storeOrg?.orgName) &&
      `门店：${readText(record?.storeOrg?.orgName)}`,
    readText(record?.bindName) && `名称：${readText(record?.bindName)}`,
    readText(record?.bindTime) && `时间：${readText(record?.bindTime)}`,
  ].filter(Boolean);

  return lines.length > 0 ? lines : ['-'];
}

export function getTrafficCardLines(record: SpeakerRecord): string[] {
  const trafficConfig = readTrafficConfig(record);
  const iccid = readText(
    trafficConfig?.iccid,
    trafficConfig?.ICCID,
    record?.iccid,
  );
  const imei = readText(trafficConfig?.imei, trafficConfig?.IMEI, record?.imei);
  const lines = [
    iccid ? `ICCID：${iccid}` : '',
    imei ? `IMEI：${imei}` : '',
  ].filter(Boolean);

  return lines.length > 0 ? lines : ['-'];
}

export function getQrCodeSn(record: SpeakerRecord): string {
  return readText(record?.qrcodeSn, record?.qrcode?.qrcodeSn) || '-';
}

export function getKeywordSource(record: SpeakerRecord): string {
  return [
    getBelongBrandName(record),
    getSpeakerBrandName(record),
    readText(record?.sn),
    readText(record?.batchSn),
    getQrCodeSn(record),
    readText(record?.remark),
    readText(record?.bindName),
    readText(record?.bindRemark),
    readText(record?.merchantOrg?.orgName),
    readText(record?.storeOrg?.orgName),
    readText(record?.agentOrg?.orgName),
    readText(record?.groupOrg?.orgName),
  ]
    .filter(Boolean)
    .join(' ');
}
