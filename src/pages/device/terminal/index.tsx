import { UploadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Button, Input, message, Select } from 'antd';
import { type FC, useCallback, useRef, useState } from 'react';
import {
  getTerminalPageQuery,
  reportTerminal,
  type TerminalPageQueryParams,
  type TerminalRecord,
  type TerminalReportPayload,
} from '@/api/terminal';
import { ExpandableFilterCard } from '@/components';
import { getErrorMessage } from '@/utils/apiMessage';
import packageJson from '../../../../package.json';
import './index.less';

const TERMINAL_TYPE_ENUM = {
  POS: { text: 'POS-收银机' },
  MPOS: { text: 'MPOS-手持POS' },
  KIOSK: { text: 'KIOSK-自助收银机' },
  MOBILE: { text: 'MOBILE-移动端' },
  PC: { text: 'PC-PC端' },
} as const;

const TERMINAL_STATE_ENUM = {
  0: { text: '禁用', status: 'Default' },
  1: { text: '启用', status: 'Success' },
} as const;

type TerminalFilterState = {
  sn: string;
  brandCode: string;
  model: string;
  osCode: string;
  osVersion: string;
  clientVersion: string;
  remark: string;
  state?: string;
  type?: TerminalPageQueryParams['type'];
  currentIp: string;
};

const EMPTY_TERMINAL_FILTERS: TerminalFilterState = {
  sn: '',
  brandCode: '',
  model: '',
  osCode: '',
  osVersion: '',
  clientVersion: '',
  remark: '',
  state: undefined,
  type: undefined,
  currentIp: '',
};

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

function normalizeText(value?: string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function trimFilterText(value?: string) {
  return String(value || '').trim();
}

function normalizeTerminalFilters(
  filters: TerminalFilterState,
): TerminalFilterState {
  return {
    sn: trimFilterText(filters.sn),
    brandCode: trimFilterText(filters.brandCode),
    model: trimFilterText(filters.model),
    osCode: trimFilterText(filters.osCode),
    osVersion: trimFilterText(filters.osVersion),
    clientVersion: trimFilterText(filters.clientVersion),
    remark: trimFilterText(filters.remark),
    state: filters.state,
    type: filters.type,
    currentIp: trimFilterText(filters.currentIp),
  };
}

function isSameTerminalFilters(
  left: TerminalFilterState,
  right: TerminalFilterState,
) {
  const normalizedLeft = normalizeTerminalFilters(left);
  const normalizedRight = normalizeTerminalFilters(right);

  return (
    normalizedLeft.sn === normalizedRight.sn &&
    normalizedLeft.brandCode === normalizedRight.brandCode &&
    normalizedLeft.model === normalizedRight.model &&
    normalizedLeft.osCode === normalizedRight.osCode &&
    normalizedLeft.osVersion === normalizedRight.osVersion &&
    normalizedLeft.clientVersion === normalizedRight.clientVersion &&
    normalizedLeft.remark === normalizedRight.remark &&
    normalizedLeft.state === normalizedRight.state &&
    normalizedLeft.type === normalizedRight.type &&
    normalizedLeft.currentIp === normalizedRight.currentIp
  );
}

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

async function buildTerminalReportPayload(): Promise<TerminalReportPayload> {
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

function normalizeState(value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const nextValue = Number(value);
  return Number.isNaN(nextValue) ? undefined : nextValue;
}

const columns: ProColumns<TerminalRecord>[] = [
  {
    title: '终端编号',
    dataIndex: 'sn',
    ellipsis: true,
    width: 180,
  },
  {
    title: '品牌编码',
    dataIndex: 'brandCode',
    ellipsis: true,
    width: 140,
  },
  {
    title: '型号',
    dataIndex: 'model',
    ellipsis: true,
    width: 180,
  },
  {
    title: '系统编码',
    dataIndex: 'osCode',
    ellipsis: true,
    width: 140,
  },
  {
    title: '系统版本',
    dataIndex: 'osVersion',
    ellipsis: true,
    width: 140,
  },
  {
    title: '客户端版本',
    dataIndex: 'clientVersion',
    ellipsis: true,
    width: 160,
  },
  {
    title: '终端类型',
    dataIndex: 'type',
    valueType: 'select',
    valueEnum: TERMINAL_TYPE_ENUM,
    ellipsis: true,
    width: 180,
  },
  {
    title: '状态',
    dataIndex: 'state',
    valueType: 'select',
    valueEnum: TERMINAL_STATE_ENUM,
    width: 120,
  },
  {
    title: '当前 IP',
    dataIndex: 'currentIp',
    ellipsis: true,
    width: 160,
  },
  {
    title: '备注',
    dataIndex: 'remark',
    ellipsis: true,
    width: 220,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    valueType: 'dateTime',
    search: false,
    width: 180,
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    valueType: 'dateTime',
    search: false,
    width: 180,
  },
];

const TerminalPage: FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [reporting, setReporting] = useState(false);
  const [draftFilters, setDraftFilters] = useState<TerminalFilterState>({
    ...EMPTY_TERMINAL_FILTERS,
  });
  const [filters, setFilters] = useState<TerminalFilterState>({
    ...EMPTY_TERMINAL_FILTERS,
  });

  const handleReport = useCallback(async () => {
    setReporting(true);
    try {
      const payload = await buildTerminalReportPayload();
      await reportTerminal(payload);
      message.success('信息上报成功');
      actionRef.current?.reload?.();
    } catch (error) {
      console.error('report terminal failed:', error);
      message.error(getErrorMessage(error, '信息上报失败，请稍后重试'));
    } finally {
      setReporting(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const nextFilters = normalizeTerminalFilters(draftFilters);
    if (isSameTerminalFilters(filters, nextFilters)) {
      return;
    }

    actionRef.current?.setPageInfo?.({
      current: 1,
    });
    setFilters(nextFilters);
  }, [draftFilters, filters]);

  const handleReset = useCallback(() => {
    const nextFilters: TerminalFilterState = {
      ...EMPTY_TERMINAL_FILTERS,
    };
    setDraftFilters(nextFilters);
    if (isSameTerminalFilters(filters, nextFilters)) {
      return;
    }

    actionRef.current?.setPageInfo?.({
      current: 1,
    });
    setFilters(nextFilters);
  }, [filters]);

  return (
    <div className="terminal-page">
      <ExpandableFilterCard
        className="terminal-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={[
          {
            key: 'sn',
            label: '终端编号',
            content: (
              <Input
                allowClear
                placeholder="请输入"
                value={draftFilters.sn}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    sn: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'brandCode',
            label: '品牌编码',
            content: (
              <Input
                allowClear
                placeholder="请输入"
                value={draftFilters.brandCode}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    brandCode: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'model',
            label: '型号',
            content: (
              <Input
                allowClear
                placeholder="请输入"
                value={draftFilters.model}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    model: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'osCode',
            label: '系统编码',
            content: (
              <Input
                allowClear
                placeholder="请输入"
                value={draftFilters.osCode}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    osCode: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'osVersion',
            label: '系统版本',
            content: (
              <Input
                allowClear
                placeholder="请输入"
                value={draftFilters.osVersion}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    osVersion: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'clientVersion',
            label: '客户端版本',
            content: (
              <Input
                allowClear
                placeholder="请输入"
                value={draftFilters.clientVersion}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    clientVersion: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'state',
            label: '状态',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.state}
                options={[
                  { label: '禁用', value: '0' },
                  { label: '启用', value: '1' },
                ]}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    state: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'type',
            label: '终端类型',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.type}
                options={[
                  { label: 'POS-收银机', value: 'POS' },
                  { label: 'MPOS-手持POS', value: 'MPOS' },
                  { label: 'KIOSK-自助收银机', value: 'KIOSK' },
                  { label: 'MOBILE-移动端', value: 'MOBILE' },
                  { label: 'PC-PC端', value: 'PC' },
                ]}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    type: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'currentIp',
            label: '当前IP',
            content: (
              <Input
                allowClear
                placeholder="请输入"
                value={draftFilters.currentIp}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    currentIp: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'remark',
            label: '备注',
            content: (
              <Input
                allowClear
                placeholder="请输入"
                value={draftFilters.remark}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    remark: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
        ]}
      />

      <ProTable<TerminalRecord, TerminalFilterState>
        className="terminal-table"
        actionRef={actionRef}
        rowKey={(record) =>
          String(
            record.id ??
              record.sn ??
              `${record.currentIp || 'terminal'}-${record.updateTime || record.createTime || ''}`,
          )
        }
        headerTitle={false}
        options={false}
        search={false}
        params={filters}
        tableAlertRender={false}
        cardBordered={false}
        scroll={{ x: 1680 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        toolBarRender={() => [
          <Button
            key="report"
            type="primary"
            icon={<UploadOutlined />}
            className="terminal-primary-action-btn"
            loading={reporting}
            onClick={handleReport}
          >
            信息上报
          </Button>,
        ]}
        request={async (params) => {
          try {
            const result = await getTerminalPageQuery({
              current: Number(params.current || 1),
              pageSize: Number(params.pageSize || 10),
              sn: normalizeText(params.sn),
              brandCode: normalizeText(params.brandCode),
              model: normalizeText(params.model),
              osCode: normalizeText(params.osCode),
              osVersion: normalizeText(params.osVersion),
              clientVersion: normalizeText(params.clientVersion),
              remark: normalizeText(params.remark),
              state: normalizeState(params.state),
              type: normalizeText(
                params.type,
              ) as TerminalPageQueryParams['type'],
              currentIp: normalizeText(params.currentIp),
            });

            return {
              data: Array.isArray(result?.records) ? result.records : [],
              success: true,
              total: Number(result?.total || 0),
            };
          } catch (error) {
            console.error('load terminal list failed:', error);
            message.error(
              getErrorMessage(error, '获取终端列表失败，请稍后重试'),
            );
            return {
              data: [],
              success: true,
              total: 0,
            };
          }
        }}
        columns={columns}
      />
    </div>
  );
};

export default TerminalPage;
