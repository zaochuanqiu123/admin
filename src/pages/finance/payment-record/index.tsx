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
  getPaymentRecordPage,
  type PaymentRecord,
  type PaymentRecordOrgInfo,
  type PaymentRecordPageParams,
  type PaymentRecordPayMethod,
  type PaymentRecordPayWay,
  type PaymentRecordSource,
} from '@/api/paymentRecords';
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
  { label: '银联卡', value: 'UNIONCARD' },
  { label: '银行转账', value: 'BANKTRANSFER' },
  { label: '快捷支付', value: 'QUICK' },
];

const PAY_WAY_OPTIONS = [
  { label: '付款码', value: 'BARCODE' },
  { label: '公众号', value: 'OFFIACCOUNT' },
  { label: '小程序', value: 'MINIPROGRAM' },
  { label: 'H5', value: 'H5' },
  { label: '扫码', value: 'NATIVE' },
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
  UNIONCARD: '银联卡',
  BANKTRANSFER: '银行转账',
  QUICK: '快捷支付',
};

const PAY_WAY_TEXT: Record<string, string> = {
  BARCODE: '付款码',
  OFFIACCOUNT: '公众号',
  MINIPROGRAM: '小程序',
  H5: 'H5',
  NATIVE: '扫码',
};

const PAY_STATE_MAP: Record<string, { text: string; color: string }> = {
  0: { text: '待支付', color: 'orange' },
  1: { text: '等待输入密码', color: 'blue' },
  10: { text: '支付成功', color: 'green' },
  90: { text: '支付失败', color: 'red' },
  91: { text: '已取消', color: 'default' },
  92: { text: '已过期', color: 'default' },
};

const REFUND_STATE_MAP: Record<string, { text: string; color: string }> = {
  0: { text: '未退款', color: 'default' },
  1: { text: '部分退款', color: 'orange' },
  10: { text: '全部退款', color: 'green' },
};

type QueryFilters = {
  channelCode: string;
  agentOrgId: string;
  groupOrgId: string;
  merchantOrgId: string;
  storeOrgId: string;
  orderNo: string;
  orderTradeNo: string;
  channelOrderNo: string;
  channelOrderTradeNo: string;
  accOrderNo: string;
  accOrderTradeNo: string;
  channelMerchantNo: string;
  thirdOrderNo: string;
  channelTradeNo: string;
  accMerchantNo: string;
  source?: PaymentRecordSource;
  payMethod?: PaymentRecordPayMethod;
  payWay?: PaymentRecordPayWay;
  payState?: number;
  refundState?: number;
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
    channelOrderNo: '',
    channelOrderTradeNo: '',
    accOrderNo: '',
    accOrderTradeNo: '',
    channelMerchantNo: '',
    thirdOrderNo: '',
    channelTradeNo: '',
    accMerchantNo: '',
    source: undefined,
    payMethod: undefined,
    payWay: undefined,
    payState: undefined,
    refundState: undefined,
    finishTimeStart: finishTimeStart.format(DATETIME_FORMAT),
    finishTimeEnd: finishTimeEnd.format(DATETIME_FORMAT),
    createTimeStart: '',
    createTimeEnd: '',
  };
}

function normalizeText(value?: string) {
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

function getSourceText(value?: PaymentRecordSource) {
  const nextValue = normalizeText(value);
  return nextValue ? SOURCE_METHOD_TEXT[nextValue] || nextValue : '-';
}

function getPayMethodText(value?: PaymentRecordPayMethod) {
  const nextValue = normalizeText(value);
  return nextValue ? PAY_METHOD_TEXT[nextValue] || nextValue : '-';
}

function getPayWayText(value?: PaymentRecordPayWay) {
  const nextValue = normalizeText(value);
  return nextValue ? PAY_WAY_TEXT[nextValue] || nextValue : '-';
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
    <div className="payment-record-lines">
      {lines.map((item, index) => {
        const duplicateCount = lineKeyCount.get(item) ?? 0;
        lineKeyCount.set(item, duplicateCount + 1);
        const itemKey =
          duplicateCount === 0 ? item : `${item}-${duplicateCount}`;

        return (
          <div
            key={itemKey}
            className={index > 0 ? 'payment-record-sub-text' : undefined}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

function getOrgLines(org?: PaymentRecordOrgInfo, fallbackOrgId?: string) {
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

const PaymentRecordPage: React.FC = () => {
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
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const recordsRef = useRef<PaymentRecord[]>([]);
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
    params: PaymentRecordPageParams,
    key: keyof PaymentRecordPageParams,
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

  const loadPaymentRecordPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);

    try {
      const params: PaymentRecordPageParams = {
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
      appendTextParam(params, 'channelOrderNo', filters.channelOrderNo);
      appendTextParam(
        params,
        'channelOrderTradeNo',
        filters.channelOrderTradeNo,
      );
      appendTextParam(params, 'accOrderNo', filters.accOrderNo);
      appendTextParam(params, 'accOrderTradeNo', filters.accOrderTradeNo);
      appendTextParam(params, 'channelMerchantNo', filters.channelMerchantNo);
      appendTextParam(params, 'thirdOrderNo', filters.thirdOrderNo);
      appendTextParam(params, 'channelTradeNo', filters.channelTradeNo);
      appendTextParam(params, 'accMerchantNo', filters.accMerchantNo);
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
      if (filters.payWay) {
        params.payWay = filters.payWay;
      }
      if (filters.payState !== undefined) {
        params.payState = filters.payState;
      }
      if (filters.refundState !== undefined) {
        params.refundState = filters.refundState;
      }

      const res = await getPaymentRecordPage(params, {
        skipErrorHandler: true,
      });
      const nextRecords = Array.isArray(res?.records) ? res.records : [];
      recordsRef.current = nextRecords;
      setRecords(nextRecords);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load payment records page failed:', error);
      const errorMessage = getErrorMessage(error, '获取支付记录列表失败');
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
    filters.accOrderNo,
    filters.accOrderTradeNo,
    filters.accMerchantNo,
    filters.channelCode,
    filters.channelMerchantNo,
    filters.channelOrderNo,
    filters.channelOrderTradeNo,
    filters.channelTradeNo,
    filters.createTimeEnd,
    filters.createTimeStart,
    filters.agentOrgId,
    filters.finishTimeEnd,
    filters.finishTimeStart,
    filters.groupOrgId,
    filters.merchantOrgId,
    filters.orderNo,
    filters.orderTradeNo,
    filters.payMethod,
    filters.payState,
    filters.payWay,
    filters.refundState,
    filters.source,
    filters.storeOrgId,
    filters.thirdOrderNo,
    pageSize,
    showAgentFilter,
    showGroupFilter,
    showMerchantFilter,
    showStoreFilter,
  ]);

  useEffect(() => {
    void loadPaymentRecordPage();
  }, [loadPaymentRecordPage]);

  const columns = useMemo<ColumnsType<PaymentRecord>>(
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
          title: '支付金额',
          dataIndex: 'payAmount',
          width: 130,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '退款金额',
          dataIndex: 'refundAmount',
          width: 130,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '支付手续费',
          dataIndex: 'payFee',
          width: 130,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '结算金额',
          dataIndex: 'settleAmount',
          width: 130,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '支付状态',
          dataIndex: 'payState',
          width: 140,
          render: (value: number) => renderStatus(value, PAY_STATE_MAP),
        },
        {
          title: '退款状态',
          dataIndex: 'refundState',
          width: 140,
          render: (value: number) => renderStatus(value, REFUND_STATE_MAP),
        },
        {
          title: '支付来源',
          dataIndex: 'source',
          width: 130,
          render: (value: PaymentRecordSource) => getSourceText(value),
        },
        {
          title: '支付方式',
          dataIndex: 'payMethod',
          width: 130,
          render: (value: PaymentRecordPayMethod) => getPayMethodText(value),
        },
        {
          title: '支付途径',
          dataIndex: 'payWay',
          width: 130,
          render: (value: PaymentRecordPayWay) => getPayWayText(value),
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
          render: (_: unknown, record: PaymentRecord) =>
            renderLines(getOrgLines(record.agentOrg, record.agentOrgId)),
        },
        showGroupFilter && {
          title: '集团组织',
          key: 'groupOrg',
          width: 180,
          render: (_: unknown, record: PaymentRecord) =>
            renderLines(getOrgLines(record.groupOrg, record.groupOrgId)),
        },
        showMerchantFilter && {
          title: '商户组织',
          key: 'merchantOrg',
          width: 180,
          render: (_: unknown, record: PaymentRecord) =>
            renderLines(getOrgLines(record.merchantOrg, record.merchantOrgId)),
        },
        showStoreFilter && {
          title: '门店组织',
          key: 'storeOrg',
          width: 180,
          render: (_: unknown, record: PaymentRecord) =>
            renderLines(getOrgLines(record.storeOrg, record.storeOrgId)),
        },
        {
          title: '通道支付订单号',
          dataIndex: 'channelOrderNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '通道支付流水号',
          dataIndex: 'channelOrderTradeNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '渠道支付订单号',
          dataIndex: 'accOrderNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '渠道支付流水号',
          dataIndex: 'accOrderTradeNo',
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
          title: '三方订单号',
          dataIndex: 'thirdOrderNo',
          width: 190,
          ellipsis: true,
          render: (value: string, record: PaymentRecord) =>
            value || record.outOrderNo || '-',
        },
        {
          title: '渠道流水号',
          dataIndex: 'channelTradeNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '渠道商户号',
          dataIndex: 'accMerchantNo',
          width: 180,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '支付完成时间',
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
      ].filter(Boolean) as ColumnsType<PaymentRecord>,
    [showAgentFilter, showGroupFilter, showMerchantFilter, showStoreFilter],
  );

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
      channelOrderNo: draftFilters.channelOrderNo.trim(),
      channelOrderTradeNo: draftFilters.channelOrderTradeNo.trim(),
      accOrderNo: draftFilters.accOrderNo.trim(),
      accOrderTradeNo: draftFilters.accOrderTradeNo.trim(),
      channelMerchantNo: draftFilters.channelMerchantNo.trim(),
      thirdOrderNo: draftFilters.thirdOrderNo.trim(),
      channelTradeNo: draftFilters.channelTradeNo.trim(),
      accMerchantNo: draftFilters.accMerchantNo.trim(),
      source: draftFilters.source,
      payMethod: draftFilters.payMethod,
      payWay: draftFilters.payWay,
      payState: draftFilters.payState,
      refundState: draftFilters.refundState,
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
    key: 'payState' | 'refundState',
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
    <div className="payment-record-page">
      <ExpandableFilterCard
        className="payment-record-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={
          [
            {
              key: 'finishTime',
              label: '支付完成时间',
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
              label: '订单号',
              content: renderInputControl('orderNo', '请输入订单号'),
            },
            {
              key: 'orderTradeNo',
              label: '支付流水号',
              content: renderInputControl('orderTradeNo', '请输入支付流水号'),
            },
            {
              key: 'channelOrderNo',
              label: '通道支付订单号',
              content: renderInputControl(
                'channelOrderNo',
                '请输入通道支付订单号',
              ),
            },
            {
              key: 'channelOrderTradeNo',
              label: '通道支付流水号',
              content: renderInputControl(
                'channelOrderTradeNo',
                '请输入通道支付流水号',
              ),
            },
            {
              key: 'accOrderNo',
              label: '渠道支付订单号',
              content: renderInputControl('accOrderNo', '请输入渠道支付订单号'),
            },
            {
              key: 'accOrderTradeNo',
              label: '渠道支付流水号',
              content: renderInputControl(
                'accOrderTradeNo',
                '请输入渠道支付流水号',
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
              key: 'thirdOrderNo',
              label: '三方订单号',
              content: renderInputControl('thirdOrderNo', '请输入三方订单号'),
            },
            {
              key: 'channelTradeNo',
              label: '渠道流水号',
              content: renderInputControl('channelTradeNo', '请输入渠道流水号'),
            },
            {
              key: 'accMerchantNo',
              label: '渠道商户号',
              content: renderInputControl('accMerchantNo', '请输入渠道商户号'),
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
              key: 'payWay',
              label: '支付途径',
              content: (
                <Select
                  allowClear
                  placeholder="请选择支付途径"
                  value={draftFilters.payWay}
                  options={PAY_WAY_OPTIONS}
                  onChange={(value) => {
                    updateDraftFilter('payWay', value);
                  }}
                />
              ),
            },
            {
              key: 'payState',
              label: '支付状态',
              content: statusSelect(
                'payState',
                '请选择支付状态',
                Object.entries(PAY_STATE_MAP).map(([value, item]) => ({
                  label: item.text,
                  value: Number(value),
                })),
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

      <div className="content-card payment-record-table-card">
        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<PaymentRecord>
            rowKey={(record) =>
              String(
                record.id ||
                  record.orderNo ||
                  record.orderTradeNo ||
                  record.thirdOrderNo ||
                  `${record.payMethod || 'payment-record'}-${record.createTime || ''}`,
              )
            }
            loading={refreshingList}
            columns={columns}
            dataSource={records}
            scroll={{ x: 3000 }}
            locale={{
              emptyText: <Empty description="暂无支付记录数据" />,
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

export default PaymentRecordPage;
