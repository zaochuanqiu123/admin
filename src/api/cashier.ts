import { phpRequest, resolvePhpUrl } from './phpHttp';

export type CashierCodeLinkParams = {
  sid?: string;
  mid?: string;
};

type CashierCodeLinkResponse = {
  status?: string | number;
  message?: string;
  msg?: string;
  data?: any;
  [key: string]: any;
};

function readText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function extractCodeLink(payload: any): string {
  const directValue = readText(payload);
  if (directValue) {
    return resolvePhpUrl(directValue);
  }

  const candidate = readText(
    payload?.url,
    payload?.link,
    payload?.codeLink,
    payload?.code_link,
    payload?.qrCodeContent,
    payload?.qrcodeContent,
    payload?.qrcodeUrl,
    payload?.qrcode_url,
    payload?.src,
    payload?.path,
  );

  return candidate ? resolvePhpUrl(candidate) : '';
}

export async function getCodeLinkNew(params: CashierCodeLinkParams) {
  const sid = readText(params.sid);
  const mid = readText(params.mid);

  const formData = new FormData();
  if (sid) formData.append('sid', sid);
  if (mid) formData.append('mid', mid);

  const response = await phpRequest<CashierCodeLinkResponse>(
    '/Retail/Cashier/getCodeLinkNew',
    {
      method: 'POST',
      data: formData,
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(
      readText(response?.message, response?.msg) || '获取二维码链接失败',
    );
  }

  const link = extractCodeLink(response?.data ?? response);
  if (!link) {
    throw new Error(
      readText(response?.message, response?.msg) || '二维码链接为空',
    );
  }

  return link;
}
