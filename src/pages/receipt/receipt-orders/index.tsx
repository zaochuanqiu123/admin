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
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ORG_LEVEL_CODE } from '@/api/org';
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
import { getReceiptRefundOrderDetailByNo } from '@/api/receiptRefundOrders';
import {
  ExpandableFilterCard,
  OrgOptionsSelect,
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
const REFUND_RESULT_POLL_INTERVAL = 1000;

const RECEIPT_ORDER_PERMS = {
  detail: 'admin:receipt:receiptOrders:queryById',
  page: 'admin:receipt:receiptOrders:page',
  refund: 'admin:receipt:receiptOrders:refund',
};

const PAY_METHOD_OPTIONS = [
  { label: 'WECHAT-微信', value: 'WECHAT' },
  { label: 'ALIPAY-支付宝', value: 'ALIPAY' },
  { label: 'UNIONPAY-云闪付', value: 'UNIONPAY' },
  { label: 'UNION_CARD-银联卡', value: 'UNION_CARD' },
  { label: 'MEMBER_CARD-会员卡', value: 'MEMBER_CARD' },
  { label: 'CASH-现金', value: 'CASH' },
];

const PAY_WAY_OPTIONS = [
  { label: 'BARCODE-付款码', value: 'BARCODE' },
  { label: 'JSAPI-JSAPI', value: 'JSAPI' },
  { label: 'MINI_PROGRAM-小程序', value: 'MINI_PROGRAM' },
  { label: 'H5-H5', value: 'H5' },
  { label: 'NATIVE-扫码', value: 'NATIVE' },
  { label: 'BANK_TRANSFER-银行转账', value: 'BANK_TRANSFER' },
  { label: 'QUICK-快捷支付', value: 'QUICK' },
  { label: 'CARD_PRESENT-刷卡', value: 'CARD_PRESENT' },
];

const PAY_METHOD_TEXT: Record<string, string> = {
  WECHAT: '微信',
  ALIPAY: '支付宝',
  UNIONPAY: '云闪付',
  UNION_CARD: '银联卡',
  MEMBER_CARD: '会员卡',
  CASH: '现金',
};

const PAY_WAY_TEXT: Record<string, string> = {
  BARCODE: '付款码',
  JSAPI: 'JSAPI',
  MINI: '小程序',
  MINI_PROGRAM: '小程序',
  H5: 'H5',
  NATIVE: '扫码',
  BANK_TRANSFER: '银行转账',
  QUICK: '快捷支付',
  CARD_PRESENT: '刷卡',
};

const PAY_STATE_MAP: Record<string, { text: string; color: string }> = {
  0: { text: '待支付', color: 'orange' },
  1: { text: '等待输入密码', color: 'blue' },
  10: { text: '支付成功', color: 'green' },
  90: { text: '支付失败', color: 'red' },
  91: { text: '已取消', color: 'default' },
  92: { text: '已过期', color: 'default' },
};

const PAY_STATE_OPTIONS = Object.entries(PAY_STATE_MAP).map(
  ([value, { text }]) => ({
    label: `${value}-${text}`,
    value,
  }),
);

const PAY_REFUND_STATE_MAP: Record<string, { text: string; color: string }> = {
  0: { text: '未退款', color: 'default' },
  1: { text: '部分退款', color: 'orange' },
  10: { text: '全部退款', color: 'green' },
};

type QueryFilters = {
  merchantOrgId: string;
  storeOrgId: string;
  agentOrgId: string;
  groupOrgId: string;
  orderNo: string;
  orderTradeNo: string;
  createTimeStart: string;
  createTimeEnd: string;
  phone: string;
  payState?: string;
  payMethod?: ReceiptPayMethod;
  payWay?: ReceiptPayWay;
  deviceSn: string;
  finishTimeStart: string;
  finishTimeEnd: string;
};

type RefundFormValues = {
  amount?: number | null;
  refundReason?: string;
};

function createDefaultDateTimeRange(): [Dayjs, Dayjs] {
  return [dayjs().startOf('day'), dayjs().endOf('day')];
}

function createDefaultFilters(): QueryFilters {
  const [createTimeStart, createTimeEnd] = createDefaultDateTimeRange();
  return {
    merchantOrgId: '',
    storeOrgId: '',
    agentOrgId: '',
    groupOrgId: '',
    orderNo: '',
    orderTradeNo: '',
    createTimeStart: createTimeStart.format(DATETIME_FORMAT),
    createTimeEnd: createTimeEnd.format(DATETIME_FORMAT),
    phone: '',
    payState: undefined,
    payMethod: undefined,
    payWay: undefined,
    deviceSn: '',
    finishTimeStart: '',
    finishTimeEnd: '',
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

function getFirstRecordValue(
  record: ReceiptOrderRecord,
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function getOrderQuantity(record: ReceiptOrderRecord) {
  const value = getFirstRecordValue(record, [
    'orderQuantity',
    'quantity',
    'orderNum',
    'orderCount',
    'goodsNum',
    'num',
  ]);
  return value === undefined ? '-' : String(value);
}

function getRefundAmount(record: ReceiptOrderRecord) {
  const value = getFirstRecordValue(record, [
    'refundAmount',
    'payRefundAmount',
    'refundedAmount',
  ]);
  return formatMoney(value as number | string | undefined);
}

function getDeviceSn(record: ReceiptOrderRecord) {
  return normalizeText(record.deviceSn) || normalizeText(record.sn) || '-';
}

function getPayerLines(record: ReceiptOrderRecord) {
  const payerName =
    normalizeText(record.payerName) ||
    normalizeText(record.payUserName) ||
    normalizeText(record.userName) ||
    normalizeText(record.nickName);
  const phone = normalizeText(record.phone);
  const lines = [payerName, phone].filter(Boolean) as string[];
  return lines.length > 0 ? lines : ['-'];
}

function getCashierLines(record: ReceiptOrderRecord) {
  const cashierName =
    normalizeText(record.cashier?.nickName) ||
    normalizeText(record.cashierNickName) ||
    normalizeText(record.storeOrgUserName);
  return cashierName ? [cashierName] : ['-'];
}

function getPayMethodText(value?: ReceiptPayMethod) {
  const nextValue = normalizeText(value);
  return nextValue ? PAY_METHOD_TEXT[nextValue] || nextValue : '-';
}

function getPayWayText(value?: ReceiptPayWay) {
  const nextValue = normalizeText(value);
  return nextValue ? PAY_WAY_TEXT[nextValue] || nextValue : '-';
}

function isUnionCardPayMethod(value?: string) {
  const nextValue = normalizeText(value)?.replace(/_/g, '').toUpperCase();
  return nextValue === 'UNIONCARD';
}

function getResponseData(source: any) {
  if (source?.data && typeof source.data === 'object') {
    return source.data;
  }
  return source;
}

function getRefundPollingNo(source: any, payMethod?: string) {
  const data = getResponseData(source);
  if (isUnionCardPayMethod(payMethod)) {
    return normalizeText(data?.accRefundTradeNo);
  }

  return normalizeText(data?.refundNo);
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

function renderPayRefundState(value?: number | string, text?: string) {
  const nextValue =
    value === undefined || value === null ? undefined : String(value);
  const stateInfo = nextValue ? PAY_REFUND_STATE_MAP[nextValue] : undefined;

  if (!stateInfo) {
    return text || nextValue || '-';
  }

  return <Tag color={stateInfo.color}>{text || stateInfo.text}</Tag>;
}

function canRefundReceiptOrder(record: ReceiptOrderRecord) {
  return String(record.payRefundState ?? '') !== '10';
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
  const refundResultPollTimerRef = useRef<number | undefined>(undefined);
  const refundResultPollingRef = useRef(false);
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
    useState<QueryFilters>(createDefaultFilters);
  const [filters, setFilters] = useState<QueryFilters>(createDefaultFilters);
  const [draftCreateTimeRange, setDraftCreateTimeRange] = useState<
    [Dayjs, Dayjs] | null
  >(createDefaultDateTimeRange);
  const [draftFinishTimeRange, setDraftFinishTimeRange] = useState<
    [Dayjs, Dayjs] | null
  >(null);
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

      appendTextParam(params, 'orderNo', filters.orderNo);
      appendTextParam(params, 'orderTradeNo', filters.orderTradeNo);
      appendTextParam(params, 'createTimeStart', filters.createTimeStart);
      appendTextParam(params, 'createTimeEnd', filters.createTimeEnd);
      appendTextParam(params, 'phone', filters.phone);
      appendTextParam(params, 'deviceSn', filters.deviceSn);
      appendTextParam(params, 'finishTimeStart', filters.finishTimeStart);
      appendTextParam(params, 'finishTimeEnd', filters.finishTimeEnd);
      if (filters.payState) {
        params.payState = filters.payState;
      }
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
    filters.createTimeEnd,
    filters.createTimeStart,
    filters.deviceSn,
    filters.agentOrgId,
    filters.finishTimeEnd,
    filters.finishTimeStart,
    filters.groupOrgId,
    filters.merchantOrgId,
    filters.orderNo,
    filters.orderTradeNo,
    filters.payMethod,
    filters.payWay,
    filters.payState,
    filters.phone,
    filters.storeOrgId,
    isAgent,
    isMerchant,
    isPlatform,
    pageSize,
  ]);

  useEffect(() => {
    void loadReceiptOrderPage();
  }, [loadReceiptOrderPage]);

  const clearRefundResultPolling = useCallback(() => {
    if (refundResultPollTimerRef.current !== undefined) {
      window.clearInterval(refundResultPollTimerRef.current);
      refundResultPollTimerRef.current = undefined;
    }
    refundResultPollingRef.current = false;
  }, []);

  const startRefundResultPolling = useCallback(
    (no: string, payMethod: string) => {
      clearRefundResultPolling();

      refundResultPollTimerRef.current = window.setInterval(() => {
        if (refundResultPollingRef.current) return;
        refundResultPollingRef.current = true;

        getReceiptRefundOrderDetailByNo(no, payMethod, {
          skipErrorHandler: true,
        })
          .then((res) => {
            if (!res) return;
            clearRefundResultPolling();
            void loadReceiptOrderPage();
          })
          .catch(() => undefined)
          .finally(() => {
            if (refundResultPollTimerRef.current !== undefined) {
              refundResultPollingRef.current = false;
            }
          });
      }, REFUND_RESULT_POLL_INTERVAL);
    },
    [clearRefundResultPolling, loadReceiptOrderPage],
  );

  useEffect(() => clearRefundResultPolling, [clearRefundResultPolling]);

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
      const responseData = getResponseData(res);
      const payMethod =
        normalizeText(responseData?.payMethod) ||
        normalizeText(refundModalRecord?.payMethod);
      const pollingNo = getRefundPollingNo(res, payMethod);
      setRefundModalRecord(null);
      refundForm.resetFields();
      await loadReceiptOrderPage();
      if (pollingNo && payMethod) {
        startRefundResultPolling(pollingNo, payMethod);
      }
    } catch (error) {
      if ((error as any)?.errorFields) return;
      console.error('refund receipt order failed:', error);
      message.error(getErrorMessage(error, '退款失败'));
    } finally {
      setRefundSubmitting(false);
    }
  }, [
    loadReceiptOrderPage,
    refundForm,
    refundModalRecord?.orderNo,
    refundModalRecord?.payMethod,
    startRefundResultPolling,
  ]);

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
          title: '服务费',
          dataIndex: 'serviceFee',
          width: 120,
          align: 'right',
          render: (value: number) => formatMoney(value),
        },
        {
          title: '订单数量',
          key: 'orderQuantity',
          width: 110,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            getOrderQuantity(record),
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
          title: '支付状态',
          dataIndex: 'payState',
          width: 140,
          render: (value: number) => renderPayState(value),
        },
        {
          title: '付款人',
          key: 'payer',
          width: 160,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            renderLines(getPayerLines(record)),
        },
        {
          title: '收银员',
          key: 'cashier',
          width: 140,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            renderLines(getCashierLines(record)),
        },
        {
          title: '退款金额',
          key: 'refundAmount',
          width: 120,
          align: 'right',
          render: (_: unknown, record: ReceiptOrderRecord) =>
            getRefundAmount(record),
        },
        {
          title: '退款状态',
          dataIndex: 'payRefundState',
          width: 140,
          render: (value: number, record: ReceiptOrderRecord) =>
            renderPayRefundState(value, record.payRefundStateName),
        },
        {
          title: '设备编号',
          key: 'deviceSn',
          width: 160,
          ellipsis: true,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            getDeviceSn(record),
        },
        {
          title: '创建时间',
          dataIndex: 'createTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '支付完成时间',
          dataIndex: 'finishTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '商户组织',
          key: 'merchantOrg',
          width: 180,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            renderLines(getOrgLines(record.merchantOrg, record.merchantOrgId)),
        },
        {
          title: '门店组织',
          key: 'storeOrg',
          width: 180,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            renderLines(getOrgLines(record.storeOrg, record.storeOrgId)),
        },
        {
          title: '代理组织',
          key: 'agentOrg',
          width: 180,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            renderLines(getOrgLines(record.agentOrg, record.agentOrgId)),
        },
        {
          title: '集团组织',
          key: 'groupOrg',
          width: 180,
          render: (_: unknown, record: ReceiptOrderRecord) =>
            renderLines(getOrgLines(record.groupOrg, record.groupOrgId)),
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
                {canRefundReceiptOrder(record) ? (
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
                ) : null}
              </PermissionVisible>
            </div>
          ),
        },
      ].filter(Boolean) as ColumnsType<ReceiptOrderRecord>,
    [handleOpenDetail, handleOpenRefund],
  );

  const handleSearch = () => {
    const nextFilters: QueryFilters = {
      merchantOrgId: draftFilters.merchantOrgId.trim(),
      storeOrgId: draftFilters.storeOrgId.trim(),
      agentOrgId: draftFilters.agentOrgId.trim(),
      groupOrgId: draftFilters.groupOrgId.trim(),
      orderNo: draftFilters.orderNo.trim(),
      orderTradeNo: draftFilters.orderTradeNo.trim(),
      createTimeStart: draftCreateTimeRange?.[0]?.format(DATETIME_FORMAT) || '',
      createTimeEnd: draftCreateTimeRange?.[1]?.format(DATETIME_FORMAT) || '',
      phone: draftFilters.phone.trim(),
      payState: draftFilters.payState,
      payMethod: draftFilters.payMethod,
      payWay: draftFilters.payWay,
      deviceSn: draftFilters.deviceSn.trim(),
      finishTimeStart: draftFinishTimeRange?.[0]?.format(DATETIME_FORMAT) || '',
      finishTimeEnd: draftFinishTimeRange?.[1]?.format(DATETIME_FORMAT) || '',
    };

    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleReset = () => {
    const nextFilters = createDefaultFilters();
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setDraftCreateTimeRange(createDefaultDateTimeRange());
    setDraftFinishTimeRange(null);
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
            {
              key: 'createTime',
              label: '订单时间',
              content: (
                <DatePicker.RangePicker
                  showTime
                  allowClear
                  value={draftCreateTimeRange}
                  format={DATETIME_FORMAT}
                  onChange={(dates) => {
                    setDraftCreateTimeRange(dates as [Dayjs, Dayjs] | null);
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
              key: 'phone',
              label: '付款人手机号',
              content: renderInputControl('phone', '请输入付款人手机号'),
            },
            {
              key: 'payState',
              label: '支付状态',
              content: (
                <Select
                  allowClear
                  placeholder="请选择支付状态"
                  value={draftFilters.payState}
                  options={PAY_STATE_OPTIONS}
                  onChange={(value) => {
                    updateDraftFilter('payState', value);
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
              key: 'deviceSn',
              label: '设备编号',
              content: renderInputControl('deviceSn', '请输入设备编号'),
            },
            {
              key: 'finishTime',
              label: '支付完成时间',
              content: (
                <DatePicker.RangePicker
                  showTime
                  allowClear
                  value={draftFinishTimeRange}
                  format={DATETIME_FORMAT}
                  onChange={(dates) => {
                    setDraftFinishTimeRange(dates as [Dayjs, Dayjs] | null);
                  }}
                />
              ),
            },
            isPlatform && {
              key: 'agentOrgId',
              label: '代理组织',
              content: (
                <OrgOptionsSelect
                  orgLevelCode={ORG_LEVEL_CODE.agent}
                  placeholder="请选择代理组织"
                  value={draftFilters.agentOrgId}
                  onChange={(value) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      agentOrgId: value,
                      groupOrgId: '',
                      merchantOrgId: '',
                      storeOrgId: '',
                    }));
                  }}
                />
              ),
            },
            (isPlatform || isAgent) && {
              key: 'groupOrgId',
              label: '集团组织',
              content: (
                <OrgOptionsSelect
                  orgLevelCode={ORG_LEVEL_CODE.group}
                  parentOrgId={draftFilters.agentOrgId}
                  placeholder="请选择集团组织"
                  value={draftFilters.groupOrgId}
                  onChange={(value) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      groupOrgId: value,
                      merchantOrgId: '',
                      storeOrgId: '',
                    }));
                  }}
                />
              ),
            },
            (isPlatform || isAgent) && {
              key: 'merchantOrgId',
              label: '商户组织',
              content: (
                <OrgOptionsSelect
                  orgLevelCode={ORG_LEVEL_CODE.merchant}
                  parentOrgId={draftFilters.groupOrgId}
                  placeholder="请选择商户组织"
                  value={draftFilters.merchantOrgId}
                  onChange={(value) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      merchantOrgId: value,
                      storeOrgId: '',
                    }));
                  }}
                />
              ),
            },
            (isPlatform || isAgent || isMerchant) && {
              key: 'storeOrgId',
              label: '门店组织',
              content: (
                <OrgOptionsSelect
                  orgLevelCode={ORG_LEVEL_CODE.store}
                  parentOrgId={draftFilters.merchantOrgId}
                  placeholder="请选择门店"
                  value={draftFilters.storeOrgId}
                  onChange={(value) => {
                    updateDraftFilter('storeOrgId', value || '');
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
            scroll={{ x: 3000 }}
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
