import { useModel } from '@umijs/max';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentMerchantStoreList } from '@/api/org';
import {
  getReceiptOrderDetail,
  getReceiptOrderPage,
  type ReceiptOrderOrgInfo,
  type ReceiptOrderPageParams,
  type ReceiptOrderRecord,
  type ReceiptPayMethod,
  type ReceiptPayWay,
  refundReceiptOrder,
} from '@/api/receiptOrders';
import {
  ExpandableFilterCard,
  OrganizationPickerInput,
  PageSectionSkeleton,
  PermissionVisible,
} from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import {
  getCurrentIdentityItem,
  getIdentityItemsFromStorage,
} from '@/utils/identity';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const RECEIPT_ORDER_PERMS = {
  detail: 'admin:receipt:receiptOrders:queryById',
  page: 'admin:receipt:receiptOrders:page',
  refund: 'admin:receipt:receiptOrders:refund',
};

const PAY_METHOD_OPTIONS = [
  { label: 'WECHAT-微信', value: 'WECHAT' },
  { label: 'ALIPAY-支付宝', value: 'ALIPAY' },
  { label: 'UNIONPAY-云闪付', value: 'UNIONPAY' },
];

const PAY_WAY_OPTIONS = [
  { label: 'MINI-小程序', value: 'MINI' },
  { label: 'H5-H5', value: 'H5' },
  { label: 'BARCODE-付款码', value: 'BARCODE' },
];

const PAY_METHOD_TEXT: Record<string, string> = {
  WECHAT: '微信',
  ALIPAY: '支付宝',
  UNIONPAY: '云闪付',
};

const PAY_WAY_TEXT: Record<string, string> = {
  MINI: '小程序',
  H5: 'H5',
  BARCODE: '付款码',
};

const PAY_STATE_MAP: Record<string, { text: string; color: string }> = {
  0: { text: '待支付', color: 'orange' },
  1: { text: '等待输入密码', color: 'blue' },
  10: { text: '支付成功', color: 'green' },
  90: { text: '支付失败', color: 'red' },
  91: { text: '已取消', color: 'default' },
  92: { text: '已过期', color: 'default' },
};

type QueryFilters = {
  merchantOrgId: string;
  storeOrgId: string;
  agentOrgId: string;
  groupOrgId: string;
  receiptCodeRuleId: string;
  qrcodeId: string;
  qrcodeSn: string;
  userId: string;
  orderNo: string;
  orderTradeNo: string;
  phone: string;
  payMethod?: ReceiptPayMethod;
  payWay?: ReceiptPayWay;
  startTime: string;
  endTime: string;
};

type RefundFormValues = {
  amount?: number | null;
  refundReason?: string;
};

type StoreOption = {
  label: string;
  value: string;
};

function createEmptyFilters(): QueryFilters {
  return {
    merchantOrgId: '',
    storeOrgId: '',
    agentOrgId: '',
    groupOrgId: '',
    receiptCodeRuleId: '',
    qrcodeId: '',
    qrcodeSn: '',
    userId: '',
    orderNo: '',
    orderTradeNo: '',
    phone: '',
    payMethod: undefined,
    payWay: undefined,
    startTime: '',
    endTime: '',
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

function getPayMethodText(value?: ReceiptPayMethod) {
  const nextValue = normalizeText(value);
  return nextValue ? PAY_METHOD_TEXT[nextValue] || nextValue : '-';
}

function getPayWayText(value?: ReceiptPayWay) {
  const nextValue = normalizeText(value);
  return nextValue ? PAY_WAY_TEXT[nextValue] || nextValue : '-';
}

function renderPayState(value?: number | string) {
  const nextValue =
    value === undefined || value === null ? undefined : String(value);
  const stateInfo = nextValue ? PAY_STATE_MAP[nextValue] : undefined;

  if (!stateInfo) {
    return nextValue || '-';
  }

  return <Tag color={stateInfo.color}>{stateInfo.text}</Tag>;
}

function renderLines(lines: string[]) {
  const lineKeyCount = new Map<string, number>();

  return (
    <div className="receipt-orders-lines">
      {lines.map((item, index) => {
        const duplicateCount = lineKeyCount.get(item) ?? 0;
        lineKeyCount.set(item, duplicateCount + 1);
        const itemKey =
          duplicateCount === 0 ? item : `${item}-${duplicateCount}`;

        return (
          <div
            key={itemKey}
            className={index > 0 ? 'receipt-orders-sub-text' : undefined}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

function getOrgLines(org?: ReceiptOrderOrgInfo, fallbackOrgId?: string) {
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

const ReceiptOrdersPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const identityItems = useMemo(() => getIdentityItemsFromStorage(), []);
  const currentIdentity = useMemo(
    () => getCurrentIdentityItem(initialState?.currentOrgCode, identityItems),
    [initialState?.currentOrgCode, identityItems],
  );
  const accountRole = currentIdentity?.levelName || '';
  const isStore = accountRole.includes('门店');
  const isMerchant = accountRole.includes('商户');
  const isAgent = accountRole.includes('代理');
  const isPlatform = !isMerchant && !isStore && !isAgent;

  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<ReceiptOrderRecord[]>([]);
  const recordsRef = useRef<ReceiptOrderRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const [detailRecord, setDetailRecord] = useState<ReceiptOrderRecord | null>(
    null,
  );
  const [refundModalRecord, setRefundModalRecord] =
    useState<ReceiptOrderRecord | null>(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundForm] = Form.useForm<RefundFormValues>();
  const [draftFilters, setDraftFilters] =
    useState<QueryFilters>(createEmptyFilters);
  const [filters, setFilters] = useState<QueryFilters>(createEmptyFilters);
  const [draftTimeRange, setDraftTimeRange] = useState<[Dayjs, Dayjs] | null>(
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
    params: ReceiptOrderPageParams,
    key: keyof ReceiptOrderPageParams,
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

  const loadReceiptOrderPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);

    try {
      const params: ReceiptOrderPageParams = {
        current,
        pageSize,
      };

      if (isPlatform) {
        appendTextParam(params, 'agentOrgId', filters.agentOrgId);
      }
      if (isPlatform || isAgent) {
        appendTextParam(params, 'groupOrgId', filters.groupOrgId);
        appendTextParam(params, 'merchantOrgId', filters.merchantOrgId);
      }
      if (isPlatform || isAgent || isMerchant) {
        appendTextParam(params, 'storeOrgId', filters.storeOrgId);
      }

      appendTextParam(params, 'receiptCodeRuleId', filters.receiptCodeRuleId);
      appendTextParam(params, 'qrcodeId', filters.qrcodeId);
      appendTextParam(params, 'qrcodeSn', filters.qrcodeSn);
      appendTextParam(params, 'userId', filters.userId);
      appendTextParam(params, 'orderNo', filters.orderNo);
      appendTextParam(params, 'orderTradeNo', filters.orderTradeNo);
      appendTextParam(params, 'phone', filters.phone);
      appendTextParam(params, 'startTime', filters.startTime);
      appendTextParam(params, 'endTime', filters.endTime);
      if (filters.payMethod) {
        params.payMethod = filters.payMethod;
      }
      if (filters.payWay) {
        params.payWay = filters.payWay;
      }

      const res = await getReceiptOrderPage(params, {
        skipErrorHandler: true,
      });
      const nextRecords = Array.isArray(res?.records) ? res.records : [];
      recordsRef.current = nextRecords;
      setRecords(nextRecords);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load receipt orders page failed:', error);
      const errorMessage = getErrorMessage(error, '获取收款订单列表失败');
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
    filters.agentOrgId,
    filters.endTime,
    filters.groupOrgId,
    filters.merchantOrgId,
    filters.orderNo,
    filters.orderTradeNo,
    filters.payMethod,
    filters.payWay,
    filters.phone,
    filters.qrcodeId,
    filters.qrcodeSn,
    filters.receiptCodeRuleId,
    filters.startTime,
    filters.storeOrgId,
    filters.userId,
    isAgent,
    isMerchant,
    isPlatform,
    pageSize,
  ]);

  useEffect(() => {
    void loadReceiptOrderPage();
  }, [loadReceiptOrderPage]);

  const handleOpenDetail = useCallback(async (record: ReceiptOrderRecord) => {
    const id = normalizeText(String(record.id ?? ''));
    if (!id) {
      message.warning('当前订单缺少主键，无法查看详情');
      return;
    }

    setDetailOpen(true);
    setDetailRecord(null);
    setDetailError(undefined);
    setDetailLoading(true);

    try {
      const res = await getReceiptOrderDetail(id, {
        skipErrorHandler: true,
      });
      setDetailRecord(res || null);
    } catch (error) {
      console.error('load receipt order detail failed:', error);
      const errorMessage = getErrorMessage(error, '获取收款订单详情失败');
      setDetailError(errorMessage);
      message.error(errorMessage);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleOpenRefund = useCallback(
    (record: ReceiptOrderRecord) => {
      const orderNo = normalizeText(record.orderNo);
      if (!orderNo) {
        message.warning('当前订单缺少订单号，无法退款');
        return;
      }

      setRefundModalRecord(record);
      refundForm.setFieldsValue({
        amount: undefined,
        refundReason: '',
      });
    },
    [refundForm],
  );

  const handleCloseRefundModal = useCallback(() => {
    if (refundSubmitting) return;
    setRefundModalRecord(null);
    refundForm.resetFields();
  }, [refundForm, refundSubmitting]);

  const handleSubmitRefund = useCallback(async () => {
    const orderNo = normalizeText(refundModalRecord?.orderNo);
    if (!orderNo) {
      message.warning('当前订单缺少订单号，无法退款');
      return;
    }

    try {
      const values = await refundForm.validateFields();
      setRefundSubmitting(true);
      const res = await refundReceiptOrder(
        {
          orderNo,
          amount: values.amount ?? '',
          refundReason: normalizeText(values.refundReason) || '',
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(getApiMessage(res, '退款提交成功'));
      setRefundModalRecord(null);
      refundForm.resetFields();
      await loadReceiptOrderPage();
    } catch (error) {
      if ((error as any)?.errorFields) return;
      console.error('refund receipt order failed:', error);
      message.error(getErrorMessage(error, '退款失败'));
    } finally {
      setRefundSubmitting(false);
    }
  }, [loadReceiptOrderPage, refundForm, refundModalRecord?.orderNo]);

  const columns = useMemo<ColumnsType<ReceiptOrderRecord>>(
    () =>
      [
        {
          title: '订单号',
          dataIndex: 'orderNo',
          width: 190,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        (isPlatform || isAgent || isMerchant) && {
          title: '门店组织',
          key: 'storeOrg',
          width: 180,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            renderLines(getOrgLines(record.storeOrg, record.storeOrgId)),
        },
        {
          title: '二维码编号',
          dataIndex: 'qrcodeSn',
          width: 180,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '订单金额',
          dataIndex: 'amount',
          width: 130,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '服务费',
          dataIndex: 'serviceFee',
          width: 120,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '支付金额',
          dataIndex: 'payAmount',
          width: 130,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '支付状态',
          dataIndex: 'payState',
          width: 140,
          render: (value: number) => renderPayState(value),
        },
        {
          title: '支付方式',
          dataIndex: 'payMethod',
          width: 130,
          render: (value: ReceiptPayMethod) => getPayMethodText(value),
        },
        {
          title: '支付途径',
          dataIndex: 'payWay',
          width: 130,
          render: (value: ReceiptPayWay) => getPayWayText(value),
        },
        {
          title: '流水号',
          dataIndex: 'orderTradeNo',
          width: 210,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '创建时间',
          dataIndex: 'createTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '完成时间',
          dataIndex: 'finishTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '操作',
          key: 'action',
          width: 160,
          fixed: 'right',
          render: (_: unknown, record: ReceiptOrderRecord) => (
            <div className="receipt-orders-action-links">
              <PermissionVisible perm={RECEIPT_ORDER_PERMS.detail}>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    void handleOpenDetail(record);
                  }}
                >
                  详情
                </Button>
              </PermissionVisible>
              <PermissionVisible perm={RECEIPT_ORDER_PERMS.refund}>
                <Button
                  type="link"
                  danger
                  size="small"
                  className="is-danger"
                  disabled={!normalizeText(record.orderNo)}
                  onClick={() => {
                    handleOpenRefund(record);
                  }}
                >
                  退款
                </Button>
              </PermissionVisible>
            </div>
          ),
        },
      ].filter(Boolean) as ColumnsType<ReceiptOrderRecord>,
    [handleOpenDetail, handleOpenRefund, isAgent, isMerchant, isPlatform],
  );

  const handleSearch = () => {
    const nextFilters: QueryFilters = {
      merchantOrgId: draftFilters.merchantOrgId.trim(),
      storeOrgId: draftFilters.storeOrgId.trim(),
      agentOrgId: draftFilters.agentOrgId.trim(),
      groupOrgId: draftFilters.groupOrgId.trim(),
      receiptCodeRuleId: draftFilters.receiptCodeRuleId.trim(),
      qrcodeId: draftFilters.qrcodeId.trim(),
      qrcodeSn: draftFilters.qrcodeSn.trim(),
      userId: draftFilters.userId.trim(),
      orderNo: draftFilters.orderNo.trim(),
      orderTradeNo: draftFilters.orderTradeNo.trim(),
      phone: draftFilters.phone.trim(),
      payMethod: draftFilters.payMethod,
      payWay: draftFilters.payWay,
      startTime: draftTimeRange?.[0]?.format(DATETIME_FORMAT) || '',
      endTime: draftTimeRange?.[1]?.format(DATETIME_FORMAT) || '',
    };

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
    setDraftTimeRange(null);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return (
    <div className="receipt-orders-page">
      <ExpandableFilterCard
        className="receipt-orders-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={
          [
            isPlatform && {
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
            (isPlatform || isAgent) && {
              key: 'groupOrgId',
              label: '集团组织ID',
              content: renderInputControl('groupOrgId', '请输入集团组织ID'),
            },
            (isPlatform || isAgent) && {
              key: 'merchantOrgId',
              label: '商户组织ID',
              content: renderInputControl('merchantOrgId', '请输入商户组织ID'),
            },
            (isPlatform || isAgent) && {
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
              key: 'receiptCodeRuleId',
              label: '收款码ID',
              content: renderInputControl(
                'receiptCodeRuleId',
                '请输入收款码规则ID',
              ),
            },
            {
              key: 'qrcodeId',
              label: '二维码ID',
              content: renderInputControl('qrcodeId', '请输入二维码ID'),
            },
            {
              key: 'qrcodeSn',
              label: '二维码编号',
              content: renderInputControl('qrcodeSn', '请输入二维码编号'),
            },
            {
              key: 'userId',
              label: '付款用户ID',
              content: renderInputControl('userId', '请输入付款用户ID'),
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
              key: 'phone',
              label: '付款人手机号',
              content: renderInputControl('phone', '请输入付款人手机号'),
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
              key: 'orderTime',
              label: '订单时间',
              content: (
                <DatePicker.RangePicker
                  showTime
                  allowClear
                  value={draftTimeRange}
                  format={DATETIME_FORMAT}
                  onChange={(dates) => {
                    setDraftTimeRange(dates as [Dayjs, Dayjs] | null);
                  }}
                />
              ),
            },
          ].filter(Boolean) as any
        }
      />

      <div className="content-card receipt-orders-table-card">
        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<ReceiptOrderRecord>
            rowKey={(record) =>
              String(
                record.id ||
                  record.orderNo ||
                  record.orderTradeNo ||
                  record.qrcodeSn ||
                  `${record.userId || 'receipt-order'}-${record.createTime || ''}`,
              )
            }
            loading={refreshingList}
            columns={columns}
            dataSource={records}
            scroll={{ x: 2340 }}
            locale={{
              emptyText: <Empty description="暂无收款订单数据" />,
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

      <Modal
        title="收款订单详情"
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailRecord(null);
          setDetailError(undefined);
        }}
        footer={null}
        width={980}
        destroyOnClose
      >
        {detailLoading ? (
          <div className="receipt-orders-detail-loading">
            <Spin />
          </div>
        ) : detailError ? (
          <Alert type="error" showIcon message={detailError} />
        ) : detailRecord ? (
          <Descriptions
            bordered
            column={2}
            items={[
              { key: 'id', label: '主键', children: detailRecord.id || '-' },
              {
                key: 'orderNo',
                label: '订单号',
                children: detailRecord.orderNo || '-',
              },
              {
                key: 'orderTradeNo',
                label: '支付流水号',
                children: detailRecord.orderTradeNo || '-',
              },
              {
                key: 'payState',
                label: '支付状态',
                children: renderPayState(detailRecord.payState),
              },
              {
                key: 'payAmount',
                label: '支付金额',
                children: formatMoney(detailRecord.payAmount),
              },
              {
                key: 'amount',
                label: '金额',
                children: formatMoney(detailRecord.amount),
              },
              {
                key: 'serviceFee',
                label: '服务费金额',
                children: formatMoney(detailRecord.serviceFee),
              },
              {
                key: 'payMethod',
                label: '支付方式',
                children: getPayMethodText(detailRecord.payMethod),
              },
              {
                key: 'payWay',
                label: '支付途径',
                children: getPayWayText(detailRecord.payWay),
              },
              {
                key: 'phone',
                label: '付款人手机号',
                children: detailRecord.phone || '-',
              },
              {
                key: 'userId',
                label: '付款用户ID',
                children: detailRecord.userId || '-',
              },
              {
                key: 'qrcodeId',
                label: '二维码ID',
                children: detailRecord.qrcodeId || '-',
              },
              {
                key: 'qrcodeSn',
                label: '二维码编号',
                children: detailRecord.qrcodeSn || '-',
              },
              {
                key: 'receiptCodeRuleId',
                label: '收款码规则ID',
                children:
                  detailRecord.receiptCodeRuleId ||
                  detailRecord.receiptColeRulesId ||
                  '-',
              },
              {
                key: 'agentOrg',
                label: '代理组织',
                children: renderLines(
                  getOrgLines(detailRecord.agentOrg, detailRecord.agentOrgId),
                ),
              },
              {
                key: 'groupOrg',
                label: '集团组织',
                children: renderLines(
                  getOrgLines(detailRecord.groupOrg, detailRecord.groupOrgId),
                ),
              },
              {
                key: 'merchantOrg',
                label: '商户组织',
                children: renderLines(
                  getOrgLines(
                    detailRecord.merchantOrg,
                    detailRecord.merchantOrgId,
                  ),
                ),
              },
              {
                key: 'storeOrg',
                label: '门店组织',
                children: renderLines(
                  getOrgLines(detailRecord.storeOrg, detailRecord.storeOrgId),
                ),
              },
              {
                key: 'limitPay',
                label: '限制支付',
                children: detailRecord.limitPay || '-',
              },
              {
                key: 'createTime',
                label: '创建时间',
                children: detailRecord.createTime || '-',
              },
              {
                key: 'finishTime',
                label: '支付完成时间',
                children: detailRecord.finishTime || '-',
              },
              {
                key: 'remark',
                label: '付款人备注',
                children: detailRecord.remark || '-',
                span: 2,
              },
              {
                key: 'goodsDesc',
                label: '商品描述',
                children: detailRecord.goodsDesc || '-',
                span: 2,
              },
            ]}
          />
        ) : null}
      </Modal>

      <Modal
        title="订单退款"
        open={Boolean(refundModalRecord)}
        confirmLoading={refundSubmitting}
        onOk={() => {
          void handleSubmitRefund();
        }}
        onCancel={handleCloseRefundModal}
        destroyOnClose
      >
        <Form<RefundFormValues>
          form={refundForm}
          layout="horizontal"
          colon={false}
          className="receipt-orders-refund-form"
        >
          <Form.Item label="订单号">
            <Input value={refundModalRecord?.orderNo || ''} disabled />
          </Form.Item>
          <Form.Item label="退款金额" name="amount">
            <InputNumber
              min={0}
              precision={2}
              placeholder="请输入退款金额"
              className="receipt-orders-refund-amount"
            />
          </Form.Item>
          <Form.Item label="退款原因" name="refundReason">
            <Input.TextArea
              allowClear
              placeholder="请输入退款原因"
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReceiptOrdersPage;
