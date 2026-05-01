import { useModel } from '@umijs/max';
import {
  Alert,
  DatePicker,
  Empty,
  Input,
  message,
  Select,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentMerchantStoreList } from '@/api/org';
import {
  getRefundRecordPage,
  type RefundAccountItem,
  type RefundRecord,
  type RefundRecordOrgInfo,
  type RefundRecordPageParams,
  type RefundRecordPayMethod,
  type RefundRecordSource,
  type RefundRecordType,
} from '@/api/refundRecords';
import {
  ExpandableFilterCard,
  OrganizationPickerInput,
  PageSectionSkeleton,
} from '@/components';
import { getErrorMessage } from '@/utils/apiMessage';
import {
  getCurrentIdentityItem,
  getIdentityItemsFromStorage,
} from '@/utils/identity';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const SOURCE_METHOD_OPTIONS = [
  { label: '聚合收款', value: 'RECEIPT' },
  { label: '零售', value: 'RETAIL' },
  { label: '餐饮', value: 'CATER' },
  { label: '加油', value: 'FUEL' },
  { label: '停车', value: 'PARK' },
  { label: '开放平台', value: 'OPEN_API' },
];

const PAY_METHOD_OPTIONS = [
  { label: '微信', value: 'WECHAT' },
  { label: '支付宝', value: 'ALIPAY' },
  { label: '云闪付', value: 'UNIONPAY' },
  { label: '刷卡支付', value: 'POS' },
  { label: '银行转账', value: 'BANKTRANSFER' },
];

const REFUND_TYPE_OPTIONS = [
  { label: '普通退款', value: 'NORMAL' },
  { label: '分账退款', value: 'SPLIT' },
];

const SOURCE_METHOD_TEXT: Record<string, string> = {
  RECEIPT: '聚合收款',
  RETAIL: '零售',
  CATER: '餐饮',
  FUEL: '加油',
  PARK: '停车',
  OPEN_API: '开放平台',
};

const PAY_METHOD_TEXT: Record<string, string> = {
  WECHAT: '微信',
  ALIPAY: '支付宝',
  UNIONPAY: '云闪付',
  POS: '刷卡支付',
  BANKTRANSFER: '银行转账',
};

const REFUND_TYPE_TEXT: Record<string, string> = {
  NORMAL: '普通退款',
  SPLIT: '分账退款',
};

const REFUND_ACCOUNT_TEXT: Record<string, string> = {
  FUND: '资金账户',
  SPLIT: '分账账户',
  SETTLE: '结算账户',
  OTHER: '其他',
};

const REFUND_STATE_MAP: Record<string, { text: string; color: string }> = {
  0: { text: '待退款', color: 'orange' },
  1: { text: '受理中', color: 'blue' },
  10: { text: '退款成功', color: 'green' },
  90: { text: '退款失败', color: 'red' },
  91: { text: '已取消', color: 'default' },
};

type QueryFilters = {
  channelCode: string;
  agentOrgId: string;
  groupOrgId: string;
  merchantOrgId: string;
  storeOrgId: string;
  orderNo: string;
  orderTradeNo: string;
  refundNo: string;
  refundTradeNo: string;
  channelRefundNo: string;
  channelRefundTradeNo: string;
  accRefundNo: string;
  accRefundTradeNo: string;
  channelMerchantNo: string;
  source?: RefundRecordSource;
  payMethod?: RefundRecordPayMethod;
  refundState?: number;
  refundType?: RefundRecordType;
  finishTimeStart: string;
  finishTimeEnd: string;
  createTimeStart: string;
  createTimeEnd: string;
};

type StoreOption = {
  label: string;
  value: string;
};

function createDefaultFinishTimeRange(): [Dayjs, Dayjs] {
  return [dayjs().startOf('day'), dayjs().endOf('day')];
}

function createEmptyFilters(): QueryFilters {
  const [finishTimeStart, finishTimeEnd] = createDefaultFinishTimeRange();
  return {
    channelCode: '',
    agentOrgId: '',
    groupOrgId: '',
    merchantOrgId: '',
    storeOrgId: '',
    orderNo: '',
    orderTradeNo: '',
    refundNo: '',
    refundTradeNo: '',
    channelRefundNo: '',
    channelRefundTradeNo: '',
    accRefundNo: '',
    accRefundTradeNo: '',
    channelMerchantNo: '',
    source: undefined,
    payMethod: undefined,
    refundState: undefined,
    refundType: undefined,
    finishTimeStart: finishTimeStart.format(DATETIME_FORMAT),
    finishTimeEnd: finishTimeEnd.format(DATETIME_FORMAT),
    createTimeStart: '',
    createTimeEnd: '',
  };
}

function normalizeText(value?: number | string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function formatMoney(value?: number | string) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toFixed(2);
}

function getSourceText(value?: RefundRecordSource) {
  const nextValue = normalizeText(value);
  return nextValue ? SOURCE_METHOD_TEXT[nextValue] || nextValue : '-';
}

function getPayMethodText(value?: RefundRecordPayMethod) {
  const nextValue = normalizeText(value);
  return nextValue ? PAY_METHOD_TEXT[nextValue] || nextValue : '-';
}

function getRefundTypeText(value?: RefundRecordType) {
  const nextValue = normalizeText(value);
  return nextValue ? REFUND_TYPE_TEXT[nextValue] || nextValue : '-';
}

function getRefundAccountText(value?: string) {
  const nextValue = normalizeText(value);
  return nextValue ? REFUND_ACCOUNT_TEXT[nextValue] || nextValue : '-';
}

function renderStatus(
  value: number | string | undefined,
  map: Record<string, { text: string; color: string }>,
) {
  const nextValue =
    value === undefined || value === null ? undefined : String(value);
  const stateInfo = nextValue ? map[nextValue] : undefined;

  if (!stateInfo) {
    return nextValue || '-';
  }

  return <Tag color={stateInfo.color}>{stateInfo.text}</Tag>;
}

function renderLines(lines: string[]) {
  const lineKeyCount = new Map<string, number>();

  return (
    <div className="refund-record-lines">
      {lines.map((item, index) => {
        const duplicateCount = lineKeyCount.get(item) ?? 0;
        lineKeyCount.set(item, duplicateCount + 1);
        const itemKey =
          duplicateCount === 0 ? item : `${item}-${duplicateCount}`;

        return (
          <div
            key={itemKey}
            className={index > 0 ? 'refund-record-sub-text' : undefined}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

function getOrgLines(org?: RefundRecordOrgInfo, fallbackOrgId?: string) {
  const orgName = normalizeText(org?.orgName);
  const orgCode = normalizeText(org?.orgCode);
  const fallbackId = normalizeText(fallbackOrgId);
  const lines = [
    orgName,
    orgCode && `编码：${orgCode}`,
    !orgName && !orgCode && fallbackId && `ID：${fallbackId}`,
  ].filter(Boolean) as string[];

  return lines.length > 0 ? lines : ['-'];
}

function getRefundAccountLines(items?: RefundAccountItem[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return ['-'];
  }

  return items.map((item) => {
    const account = getRefundAccountText(item.account);
    return `${account}：${formatMoney(item.amount)}`;
  });
}

const RefundRecordPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const identityItems = useMemo(() => getIdentityItemsFromStorage(), []);
  const currentIdentity = useMemo(
    () => getCurrentIdentityItem(initialState?.currentOrgCode, identityItems),
    [initialState?.currentOrgCode, identityItems],
  );
  const accountRole = currentIdentity?.levelName || '';
  const isStore = accountRole.includes('门店');
  const isMerchant = accountRole.includes('商户');
  const isGroup = accountRole.includes('集团');
  const isAgent = accountRole.includes('代理');
  const isPlatform = !isMerchant && !isStore && !isGroup && !isAgent;
  const showAgentFilter = isPlatform;
  const showGroupFilter = isPlatform || isAgent;
  const showMerchantFilter = isPlatform || isAgent || isGroup;
  const showStoreFilter = showMerchantFilter || isMerchant;

  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<RefundRecord[]>([]);
  const recordsRef = useRef<RefundRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [draftFilters, setDraftFilters] =
    useState<QueryFilters>(createEmptyFilters);
  const [filters, setFilters] = useState<QueryFilters>(createEmptyFilters);
  const [finishTimeRange, setFinishTimeRange] = useState<[Dayjs, Dayjs] | null>(
    createDefaultFinishTimeRange,
  );
  const [createTimeRange, setCreateTimeRange] = useState<[Dayjs, Dayjs] | null>(
    null,
  );
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [storeOptionsLoading, setStoreOptionsLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);

  const updateDraftFilter = (
    key: keyof QueryFilters,
    value: QueryFilters[keyof QueryFilters],
  ) => {
    setDraftFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    const nextFinishTimeRange =
      finishTimeRange ?? createDefaultFinishTimeRange();
    const nextFilters: QueryFilters = {
      channelCode: draftFilters.channelCode.trim(),
      agentOrgId: draftFilters.agentOrgId.trim(),
      groupOrgId: draftFilters.groupOrgId.trim(),
      merchantOrgId: draftFilters.merchantOrgId.trim(),
      storeOrgId: draftFilters.storeOrgId.trim(),
      orderNo: draftFilters.orderNo.trim(),
      orderTradeNo: draftFilters.orderTradeNo.trim(),
      refundNo: draftFilters.refundNo.trim(),
      refundTradeNo: draftFilters.refundTradeNo.trim(),
      channelRefundNo: draftFilters.channelRefundNo.trim(),
      channelRefundTradeNo: draftFilters.channelRefundTradeNo.trim(),
      accRefundNo: draftFilters.accRefundNo.trim(),
      accRefundTradeNo: draftFilters.accRefundTradeNo.trim(),
      channelMerchantNo: draftFilters.channelMerchantNo.trim(),
      source: draftFilters.source,
      payMethod: draftFilters.payMethod,
      refundState: draftFilters.refundState,
      refundType: draftFilters.refundType,
      finishTimeStart: nextFinishTimeRange[0].format(DATETIME_FORMAT),
      finishTimeEnd: nextFinishTimeRange[1].format(DATETIME_FORMAT),
      createTimeStart: createTimeRange?.[0]?.format(DATETIME_FORMAT) || '',
      createTimeEnd: createTimeRange?.[1]?.format(DATETIME_FORMAT) || '',
    };

    setFinishTimeRange(nextFinishTimeRange);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const renderInputControl = (key: keyof QueryFilters, placeholder: string) => (
    <Input
      allowClear
      placeholder={placeholder}
      value={String(draftFilters[key] || '')}
      onChange={(event) => {
        updateDraftFilter(key, event.target.value);
      }}
      onPressEnter={handleSearch}
    />
  );

  const appendTextParam = (
    params: RefundRecordPageParams,
    key: keyof RefundRecordPageParams,
    value?: string,
  ) => {
    const nextValue = normalizeText(value);
    if (nextValue) {
      (params as Record<string, unknown>)[key] = nextValue;
    }
  };

  useEffect(() => {
    if (!isMerchant) return;
    let cancelled = false;
    setStoreOptionsLoading(true);
    getCurrentMerchantStoreList({ skipErrorHandler: true })
      .then((res) => {
        if (cancelled) return;
        const nextOptions = (Array.isArray(res) ? res : [])
          .map((item) => {
            const value = String(item.id || '').trim();
            const name = String(item.orgName || '').trim();
            if (!value) return undefined;
            return {
              label: name ? `${name}（ID: ${value}）` : value,
              value,
            };
          })
          .filter(Boolean) as StoreOption[];
        setStoreOptions(nextOptions);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('load merchant store options failed:', error);
        setStoreOptions([]);
      })
      .finally(() => {
        if (!cancelled) setStoreOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isMerchant]);

  const loadRefundRecordPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);

    try {
      const params: RefundRecordPageParams = {
        current,
        pageSize,
      };

      appendTextParam(params, 'channelCode', filters.channelCode);
      if (showAgentFilter) {
        appendTextParam(params, 'agentOrgId', filters.agentOrgId);
      }
      if (showGroupFilter) {
        appendTextParam(params, 'groupOrgId', filters.groupOrgId);
      }
      if (showMerchantFilter) {
        appendTextParam(params, 'merchantOrgId', filters.merchantOrgId);
      }
      if (showStoreFilter) {
        appendTextParam(params, 'storeOrgId', filters.storeOrgId);
      }

      appendTextParam(params, 'orderNo', filters.orderNo);
      appendTextParam(params, 'orderTradeNo', filters.orderTradeNo);
      appendTextParam(params, 'refundNo', filters.refundNo);
      appendTextParam(params, 'refundTradeNo', filters.refundTradeNo);
      appendTextParam(params, 'channelRefundNo', filters.channelRefundNo);
      appendTextParam(
        params,
        'channelRefundTradeNo',
        filters.channelRefundTradeNo,
      );
      appendTextParam(params, 'accRefundNo', filters.accRefundNo);
      appendTextParam(params, 'accRefundTradeNo', filters.accRefundTradeNo);
      appendTextParam(params, 'channelMerchantNo', filters.channelMerchantNo);
      appendTextParam(params, 'finishTimeStart', filters.finishTimeStart);
      appendTextParam(params, 'finishTimeEnd', filters.finishTimeEnd);
      appendTextParam(params, 'createTimeStart', filters.createTimeStart);
      appendTextParam(params, 'createTimeEnd', filters.createTimeEnd);
      if (filters.source) {
        params.source = filters.source;
      }
      if (filters.payMethod) {
        params.payMethod = filters.payMethod;
      }
      if (filters.refundState !== undefined) {
        params.refundState = filters.refundState;
      }
      if (filters.refundType) {
        params.refundType = filters.refundType;
      }

      const res = await getRefundRecordPage(params, {
        skipErrorHandler: true,
      });
      const nextRecords = Array.isArray(res?.records) ? res.records : [];
      recordsRef.current = nextRecords;
      setRecords(nextRecords);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load refund records page failed:', error);
      const errorMessage = getErrorMessage(error, '获取退款记录列表失败');
      setListError(errorMessage);
      if (recordsRef.current.length > 0) {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [
    current,
    filters.accRefundNo,
    filters.accRefundTradeNo,
    filters.agentOrgId,
    filters.channelCode,
    filters.channelMerchantNo,
    filters.channelRefundNo,
    filters.channelRefundTradeNo,
    filters.createTimeEnd,
    filters.createTimeStart,
    filters.finishTimeEnd,
    filters.finishTimeStart,
    filters.groupOrgId,
    filters.merchantOrgId,
    filters.orderNo,
    filters.orderTradeNo,
    filters.payMethod,
    filters.refundNo,
    filters.refundState,
    filters.refundTradeNo,
    filters.refundType,
    filters.source,
    filters.storeOrgId,
    pageSize,
    showAgentFilter,
    showGroupFilter,
    showMerchantFilter,
    showStoreFilter,
  ]);

  useEffect(() => {
    void loadRefundRecordPage();
  }, [loadRefundRecordPage]);

  const columns = useMemo<ColumnsType<RefundRecord>>(
    () =>
      [
        {
          title: 'ID',
          dataIndex: 'id',
          width: 220,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '订单号',
          dataIndex: 'orderNo',
          width: 190,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '支付流水号',
          dataIndex: 'orderTradeNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '退款订单号',
          dataIndex: 'refundNo',
          width: 190,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '退款流水号',
          dataIndex: 'refundTradeNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '退款金额',
          dataIndex: 'refundAmount',
          width: 130,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '退款手续费',
          dataIndex: 'refundFee',
          width: 130,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '退款状态',
          dataIndex: 'refundState',
          width: 140,
          render: (value: number) => renderStatus(value, REFUND_STATE_MAP),
        },
        {
          title: '退款类型',
          dataIndex: 'refundType',
          width: 140,
          render: (value: RefundRecordType) => getRefundTypeText(value),
        },
        {
          title: '支付来源',
          dataIndex: 'source',
          width: 130,
          render: (value: RefundRecordSource) => getSourceText(value),
        },
        {
          title: '支付方式',
          dataIndex: 'payMethod',
          width: 130,
          render: (value: RefundRecordPayMethod) => getPayMethodText(value),
        },
        {
          title: '通道编码',
          dataIndex: 'channelCode',
          width: 150,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '通道配置ID',
          dataIndex: 'channelConfigId',
          width: 180,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        showAgentFilter && {
          title: '代理组织',
          key: 'agentOrg',
          width: 180,
          render: (_: unknown, record: RefundRecord) =>
            renderLines(getOrgLines(record.agentOrg, record.agentOrgId)),
        },
        showGroupFilter && {
          title: '集团组织',
          key: 'groupOrg',
          width: 180,
          render: (_: unknown, record: RefundRecord) =>
            renderLines(getOrgLines(record.groupOrg, record.groupOrgId)),
        },
        showMerchantFilter && {
          title: '商户组织',
          key: 'merchantOrg',
          width: 180,
          render: (_: unknown, record: RefundRecord) =>
            renderLines(getOrgLines(record.merchantOrg, record.merchantOrgId)),
        },
        showStoreFilter && {
          title: '门店组织',
          key: 'storeOrg',
          width: 180,
          render: (_: unknown, record: RefundRecord) =>
            renderLines(getOrgLines(record.storeOrg, record.storeOrgId)),
        },
        {
          title: '商户组织编码',
          dataIndex: 'merchantOrgCode',
          width: 180,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '通道退款订单号',
          dataIndex: 'channelRefundNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '通道退款流水号',
          dataIndex: 'channelRefundTradeNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '渠道退款订单号',
          dataIndex: 'accRefundNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '渠道退款流水号',
          dataIndex: 'accRefundTradeNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '通道商户编号',
          dataIndex: 'channelMerchantNo',
          width: 190,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '退款账户',
          dataIndex: 'refundAccount',
          width: 140,
          render: (value: string) => getRefundAccountText(value),
        },
        {
          title: '退款账户明细',
          dataIndex: 'refundAccountList',
          width: 180,
          render: (value: RefundAccountItem[]) =>
            renderLines(getRefundAccountLines(value)),
        },
        {
          title: '分润退回状态',
          dataIndex: 'profitReturnState',
          width: 150,
          render: (value: number | string) =>
            value === undefined || value === null ? '-' : String(value),
        },
        {
          title: '失败原因',
          dataIndex: 'failReason',
          width: 220,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '完成时间',
          dataIndex: 'finishTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '创建时间',
          dataIndex: 'createTime',
          width: 180,
          render: (value: string) => value || '-',
        },
      ].filter(Boolean) as ColumnsType<RefundRecord>,
    [showAgentFilter, showGroupFilter, showMerchantFilter, showStoreFilter],
  );

  const handleReset = () => {
    const nextFilters = createEmptyFilters();
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setFinishTimeRange(createDefaultFinishTimeRange());
    setCreateTimeRange(null);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const statusSelect = (
    key: 'refundState',
    placeholder: string,
    options: { label: string; value: number }[],
  ) => (
    <Select
      allowClear
      placeholder={placeholder}
      value={draftFilters[key]}
      options={options}
      onChange={(value) => {
        updateDraftFilter(key, value);
      }}
    />
  );

  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return (
    <div className="refund-record-page">
      <ExpandableFilterCard
        className="refund-record-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={
          [
            {
              key: 'finishTime',
              label: '退款完成时间',
              wideWhenCollapsed: Boolean(finishTimeRange),
              content: (
                <DatePicker.RangePicker
                  showTime
                  allowClear
                  value={finishTimeRange}
                  format={DATETIME_FORMAT}
                  onChange={(dates) => {
                    setFinishTimeRange(dates as [Dayjs, Dayjs] | null);
                  }}
                />
              ),
            },
            {
              key: 'channelCode',
              label: '通道编码',
              content: renderInputControl('channelCode', '请输入通道编码'),
            },
            showAgentFilter && {
              key: 'agentOrgId',
              label: '代理组织ID',
              content: (
                <OrganizationPickerInput
                  placeholder="请选择代理组织"
                  value={draftFilters.agentOrgId}
                  onChange={(value) => {
                    updateDraftFilter('agentOrgId', value);
                  }}
                />
              ),
            },
            showGroupFilter && {
              key: 'groupOrgId',
              label: '集团组织ID',
              content: renderInputControl('groupOrgId', '请输入集团组织ID'),
            },
            showMerchantFilter && {
              key: 'merchantOrgId',
              label: '商户组织ID',
              content: renderInputControl('merchantOrgId', '请输入商户组织ID'),
            },
            showStoreFilter &&
              !isMerchant && {
                key: 'storeOrgId',
                label: '门店组织ID',
                content: renderInputControl('storeOrgId', '请输入门店组织ID'),
              },
            isMerchant && {
              key: 'storeOrgId',
              label: '门店组织ID',
              content: (
                <Select
                  allowClear
                  showSearch
                  placeholder="请选择门店"
                  loading={storeOptionsLoading}
                  value={draftFilters.storeOrgId || undefined}
                  options={storeOptions}
                  optionFilterProp="label"
                  onChange={(value) => {
                    updateDraftFilter('storeOrgId', value || '');
                  }}
                />
              ),
            },
            {
              key: 'orderNo',
              label: '支付订单号',
              content: renderInputControl('orderNo', '请输入支付订单号'),
            },
            {
              key: 'orderTradeNo',
              label: '支付流水号',
              content: renderInputControl('orderTradeNo', '请输入支付流水号'),
            },
            {
              key: 'refundNo',
              label: '退款订单号',
              content: renderInputControl('refundNo', '请输入退款订单号'),
            },
            {
              key: 'refundTradeNo',
              label: '退款流水号',
              content: renderInputControl('refundTradeNo', '请输入退款流水号'),
            },
            {
              key: 'channelRefundNo',
              label: '通道退款订单号',
              content: renderInputControl(
                'channelRefundNo',
                '请输入通道退款订单号',
              ),
            },
            {
              key: 'channelRefundTradeNo',
              label: '通道退款流水号',
              content: renderInputControl(
                'channelRefundTradeNo',
                '请输入通道退款流水号',
              ),
            },
            {
              key: 'accRefundNo',
              label: '渠道退款订单号',
              content: renderInputControl(
                'accRefundNo',
                '请输入渠道退款订单号',
              ),
            },
            {
              key: 'accRefundTradeNo',
              label: '渠道退款流水号',
              content: renderInputControl(
                'accRefundTradeNo',
                '请输入渠道退款流水号',
              ),
            },
            {
              key: 'channelMerchantNo',
              label: '通道商户编号',
              content: renderInputControl(
                'channelMerchantNo',
                '请输入通道商户编号',
              ),
            },
            {
              key: 'source',
              label: '支付来源',
              content: (
                <Select
                  allowClear
                  placeholder="请选择支付来源"
                  value={draftFilters.source}
                  options={SOURCE_METHOD_OPTIONS}
                  onChange={(value) => {
                    updateDraftFilter('source', value);
                  }}
                />
              ),
            },
            {
              key: 'payMethod',
              label: '支付方式',
              content: (
                <Select
                  allowClear
                  placeholder="请选择支付方式"
                  value={draftFilters.payMethod}
                  options={PAY_METHOD_OPTIONS}
                  onChange={(value) => {
                    updateDraftFilter('payMethod', value);
                  }}
                />
              ),
            },
            {
              key: 'refundState',
              label: '退款状态',
              content: statusSelect(
                'refundState',
                '请选择退款状态',
                Object.entries(REFUND_STATE_MAP).map(([value, item]) => ({
                  label: item.text,
                  value: Number(value),
                })),
              ),
            },
            {
              key: 'refundType',
              label: '退款类型',
              content: (
                <Select
                  allowClear
                  placeholder="请选择退款类型"
                  value={draftFilters.refundType}
                  options={REFUND_TYPE_OPTIONS}
                  onChange={(value) => {
                    updateDraftFilter('refundType', value);
                  }}
                />
              ),
            },
            {
              key: 'createTime',
              label: '创建时间',
              content: (
                <DatePicker.RangePicker
                  showTime
                  allowClear
                  value={createTimeRange}
                  format={DATETIME_FORMAT}
                  onChange={(dates) => {
                    setCreateTimeRange(dates as [Dayjs, Dayjs] | null);
                  }}
                />
              ),
            },
          ].filter(Boolean) as any
        }
      />

      <div className="content-card refund-record-table-card">
        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<RefundRecord>
            rowKey={(record) =>
              String(
                record.id ||
                  record.refundNo ||
                  record.refundTradeNo ||
                  record.orderNo ||
                  record.orderTradeNo ||
                  `${record.payMethod || 'refund-record'}-${record.createTime || ''}`,
              )
            }
            loading={refreshingList}
            columns={columns}
            dataSource={records}
            scroll={{ x: 3600 }}
            locale={{
              emptyText: <Empty description="暂无退款记录数据" />,
            }}
            pagination={{
              ...pagination,
              total: serverTotal,
              onChange: (nextCurrent, nextPageSize) => {
                setPagination((prev) => ({
                  ...prev,
                  current: nextCurrent,
                  pageSize: nextPageSize,
                }));
              },
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RefundRecordPage;
