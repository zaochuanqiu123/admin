import FingerprintJS from '@fingerprintjs/fingerprintjs';
import type { TerminalReportPayload } from '@/api/terminal';
import packageJson from '../../../../../package.json';
import { normalizeText } from './terminalQuery';

type UserAgentBrand = {
  brand: string;
  version: string;
};

type UserAgentDataValues = {
  brands?: UserAgentBrand[];
  mobile?: boolean;
  model?: string;
  platform?: string;
  platformVersion?: string;
  uaFullVersion?: string;
};

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands?: UserAgentBrand[];
    mobile?: boolean;
    platform?: string;
    getHighEntropyValues?: (hints: string[]) => Promise<UserAgentDataValues>;
  };
};

function pickMeaningfulBrand(brands?: UserAgentBrand[]) {
  if (!Array.isArray(brands)) {
    return undefined;
  }

  return brands.find((item) => !/not/i.test(item.brand))?.brand;
}

function getBrowserInfo(
  userAgent: string,
  brands?: UserAgentBrand[],
  fullVersion?: string,
) {
  const meaningfulBrand = normalizeText(pickMeaningfulBrand(brands));
  const browserRules = [
    { name: 'Microsoft Edge', pattern: /Edg\/([\d.]+)/i },
    { name: 'Opera', pattern: /OPR\/([\d.]+)/i },
    { name: 'Google Chrome', pattern: /Chrome\/([\d.]+)/i },
    { name: 'Firefox', pattern: /Firefox\/([\d.]+)/i },
    { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/i },
  ];

  const matchedRule = browserRules.find((item) => item.pattern.test(userAgent));
  const matchedVersion = matchedRule?.pattern.exec(userAgent)?.[1];
  const brandCode = normalizeText(meaningfulBrand || matchedRule?.name);
  const version = normalizeText(fullVersion || matchedVersion);
  const model = normalizeText(
    brandCode ? `${brandCode}${version ? ` ${version}` : ''}` : undefined,
  );

  return {
    brandCode,
    model,
  };
}

function getOsCode(userAgent: string, platform?: string) {
  const normalizedPlatform = String(platform || '').toLowerCase();
  const normalizedUserAgent = userAgent.toLowerCase();

  if (
    normalizedPlatform.includes('android') ||
    normalizedUserAgent.includes('android')
  ) {
    return 'Android';
  }
  if (
    normalizedPlatform.includes('ios') ||
    /iphone|ipad|ipod/.test(normalizedUserAgent)
  ) {
    return 'iOS';
  }
  if (
    normalizedPlatform.includes('mac') ||
    normalizedUserAgent.includes('mac os x')
  ) {
    return 'macOS';
  }
  if (
    normalizedPlatform.includes('win') ||
    normalizedUserAgent.includes('windows')
  ) {
    return 'Windows';
  }
  if (
    normalizedPlatform.includes('linux') ||
    normalizedUserAgent.includes('linux')
  ) {
    return 'Linux';
  }

  return normalizeText(platform);
}

function getOsVersion(
  osCode?: string,
  userAgent?: string,
  platformVersion?: string,
) {
  const normalizedPlatformVersion = normalizeText(platformVersion);
  if (normalizedPlatformVersion) {
    return normalizedPlatformVersion;
  }

  const source = String(userAgent || '');
  const versionPatterns: Record<string, RegExp> = {
    Android: /Android\s([\d.]+)/i,
    iOS: /(?:OS|CPU (?:iPhone )?OS)\s([\d_]+)/i,
    macOS: /Mac OS X\s([\d_]+)/i,
    Windows: /Windows NT\s([\d.]+)/i,
  };

  const matchedValue = osCode
    ? versionPatterns[osCode]?.exec(source)?.[1]
    : undefined;
  return normalizeText(matchedValue?.replace(/_/g, '.'));
}

function getFallbackFingerprintSource() {
  if (typeof window === 'undefined') {
    return 'terminal-fallback';
  }

  const screenInfo =
    typeof window.screen === 'undefined'
      ? ''
      : `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;

  return [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screenInfo,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('::');
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fp_${(hash >>> 0).toString(16)}`;
}

async function getBrowserFingerprint() {
  try {
    const fingerprintAgent = await FingerprintJS.load();
    const fingerprintResult = await fingerprintAgent.get();
    return normalizeText(fingerprintResult.visitorId);
  } catch (error) {
    console.warn(
      'load browser fingerprint failed, fallback to local hash:',
      error,
    );
    return undefined;
  }
}

async function fetchPublicIpFrom(url: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    const result = (await response.json()) as { ip?: string };
    return normalizeText(result?.ip);
  } catch (error) {
    console.warn(`fetch public ip failed from ${url}:`, error);
    return undefined;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getCurrentIp() {
  const ipSources = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ipv4.jsonip.com',
  ];

  for (const url of ipSources) {
    const currentIp = await fetchPublicIpFrom(url);
    if (currentIp) {
      return currentIp;
    }
  }

  return undefined;
}

export async function buildTerminalReportPayload(): Promise<TerminalReportPayload> {
  const navigatorInfo = navigator as NavigatorWithUserAgentData;
  const userAgentData = navigatorInfo.userAgentData;
  let highEntropyValues: UserAgentDataValues | undefined;
  if (userAgentData?.getHighEntropyValues) {
    try {
      highEntropyValues = await userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
        'uaFullVersion',
      ]);
    } catch (error) {
      console.warn('read userAgentData high entropy values failed:', error);
    }
  }
  const userAgent = navigator.userAgent;
  const browserInfo = getBrowserInfo(
    userAgent,
    highEntropyValues?.brands || userAgentData?.brands,
    highEntropyValues?.uaFullVersion,
  );
  const osCode = getOsCode(
    userAgent,
    highEntropyValues?.platform || userAgentData?.platform,
  );
  const osVersion = getOsVersion(
    osCode,
    userAgent,
    highEntropyValues?.platformVersion,
  );
  const sn =
    (await getBrowserFingerprint()) || hashText(getFallbackFingerprintSource());
  const currentIp = await getCurrentIp();
  const runtimeClientVersion =
    typeof window !== 'undefined'
      ? normalizeText(
          (window as Window & { __APP_VERSION__?: string }).__APP_VERSION__,
        )
      : undefined;

  return {
    sn,
    type: 'PC',
    ...(browserInfo.brandCode ? { brandCode: browserInfo.brandCode } : {}),
    ...(normalizeText(highEntropyValues?.model)
      ? { model: normalizeText(highEntropyValues?.model) }
      : {}),
    ...(!normalizeText(highEntropyValues?.model) && browserInfo.model
      ? { model: browserInfo.model }
      : {}),
    ...(osCode ? { osCode } : {}),
    ...(osVersion ? { osVersion } : {}),
    ...(currentIp ? { currentIp } : {}),
    ...(runtimeClientVersion || normalizeText(packageJson.version)
      ? {
          clientVersion:
            runtimeClientVersion || normalizeText(packageJson.version),
        }
      : {}),
  };
}
