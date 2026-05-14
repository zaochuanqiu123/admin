import { useModel } from '@umijs/max';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Input,
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
  getReceiptRefundOrderDetailByOrderNo,
  getReceiptRefundOrderPage,
  type ReceiptRefundOrderOrgInfo,
  type ReceiptRefundOrderPageParams,
  type ReceiptRefundOrderRecord,
} from '@/api/receiptRefundOrders';
import { type SearchUserResult, searchUserByPhone } from '@/api/user';
import {
  ExpandableFilterCard,
  OrgOptionsSelect,
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

const REFUND_STATE_MAP: Record<string, { text: string; color: string }> = {
  0: { text: '待退款', color: 'orange' },
  1: { text: '受理中', color: 'blue' },
  10: { text: '退款成功', color: 'green' },
  90: { text: '退款失败', color: 'red' },
  91: { text: '已取消', color: 'default' },
};

const REFUND_STATE_OPTIONS = Object.entries(REFUND_STATE_MAP).map(
  ([value, item]) => ({
    label: `${value}-${item.text}`,
    value: Number(value),
  }),
);

type QueryFilters = {
  agentOrgId: string;
  groupOrgId: string;
  merchantOrgId: string;
  storeOrgId: string;
  userId: string;
  orderNo: string;
  refundNo: string;
  refundTradeNo: string;
  refundState?: number;
  createTimeStart: string;
  createTimeEnd: string;
  finishTimeStart: string;
  finishTimeEnd: string;
};

function createDefaultDateTimeRange(): [Dayjs, Dayjs] {
  return [dayjs().startOf('day'), dayjs().endOf('day')];
}

function createDefaultFilters(): QueryFilters {
  const [createTimeStart, createTimeEnd] = createDefaultDateTimeRange();
  return {
    agentOrgId: '',
    groupOrgId: '',
    merchantOrgId: '',
    storeOrgId: '',
    userId: '',
    orderNo: '',
    refundNo: '',
    refundTradeNo: '',
    refundState: undefined,
    createTimeStart: createTimeStart.format(DATETIME_FORMAT),
    createTimeEnd: createTimeEnd.format(DATETIME_FORMAT),
    finishTimeStart: '',
    finishTimeEnd: '',
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

function renderStatus(value?: number | string) {
  const nextValue =
    value === undefined || value === null ? undefined : String(value);
  const stateInfo = nextValue ? REFUND_STATE_MAP[nextValue] : undefined;

  if (!stateInfo) {
    return nextValue || '-';
  }

  return <Tag color={stateInfo.color}>{stateInfo.text}</Tag>;
}

function renderLines(lines: string[]) {
  const lineKeyCount = new Map<string, number>();

  return (
    <div className="receipt-refund-orders-lines">
      {lines.map((item, index) => {
        const duplicateCount = lineKeyCount.get(item) ?? 0;
        lineKeyCount.set(item, duplicateCount + 1);
        const itemKey =
          duplicateCount === 0 ? item : `${item}-${duplicateCount}`;

        return (
          <div
            key={itemKey}
            className={index > 0 ? 'receipt-refund-orders-sub-text' : undefined}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

function getOrgLines(
  org: ReceiptRefundOrderOrgInfo | undefined,
  fallbackOrgId: string | undefined,
  fallbackOrgName: string | undefined,
  fallbackOrgCode: string | undefined,
) {
  const orgName = normalizeText(org?.orgName) || normalizeText(fallbackOrgName);
  const orgCode = normalizeText(org?.orgCode) || normalizeText(fallbackOrgCode);
  const fallbackId = normalizeText(fallbackOrgId);
  const lines = [
    orgName,
    orgCode && `编码：${orgCode}`,
    !orgName && !orgCode && fallbackId && `ID：${fallbackId}`,
  ].filter(Boolean) as string[];

  return lines.length > 0 ? lines : ['-'];
}

function getRefundUserName(record: ReceiptRefundOrderRecord) {
  return (
    normalizeText(record.refundUserName) ||
    normalizeText(record.userName) ||
    normalizeText(record.name) ||
    '-'
  );
}

function getRefundUserPhone(record: ReceiptRefundOrderRecord) {
  return (
    normalizeText(record.refundUserPhone) ||
    normalizeText(record.phone) ||
    normalizeText(record.userPhone) ||
    '-'
  );
}

const ReceiptRefundOrdersPage: React.FC = () => {
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

  const showAgentFilter = isPlatform;
  const showGroupFilter = isPlatform || isAgent;
  const showMerchantFilter = isPlatform || isAgent;
  const showStoreFilter = isPlatform || isAgent || isMerchant;

  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<ReceiptRefundOrderRecord[]>([]);
  const recordsRef = useRef<ReceiptRefundOrderRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const [detailRecord, setDetailRecord] =
    useState<ReceiptRefundOrderRecord | null>(null);
  const [draftFilters, setDraftFilters] =
    useState<QueryFilters>(createDefaultFilters);
  const [filters, setFilters] = useState<QueryFilters>(createDefaultFilters);
  const [draftCreateTimeRange, setDraftCreateTimeRange] = useState<
    [Dayjs, Dayjs] | null
  >(createDefaultDateTimeRange);
  const [draftFinishTimeRange, setDraftFinishTimeRange] = useState<
    [Dayjs, Dayjs] | null
  >(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearchPhone, setUserSearchPhone] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<
    SearchUserResult[]
  >([]);
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
    setFilters({
      ...draftFilters,
      createTimeStart: draftCreateTimeRange?.[0]?.format(DATETIME_FORMAT) || '',
      createTimeEnd: draftCreateTimeRange?.[1]?.format(DATETIME_FORMAT) || '',
      finishTimeStart: draftFinishTimeRange?.[0]?.format(DATETIME_FORMAT) || '',
      finishTimeEnd: draftFinishTimeRange?.[1]?.format(DATETIME_FORMAT) || '',
    });
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
    params: ReceiptRefundOrderPageParams,
    key: keyof ReceiptRefundOrderPageParams,
    value?: string,
  ) => {
    const nextValue = normalizeText(value);
    if (nextValue) {
      (params as Record<string, unknown>)[key] = nextValue;
    }
  };

  const loadReceiptRefundOrderPage = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setListError(undefined);

    try {
      const params: ReceiptRefundOrderPageParams = {
        current,
        pageSize,
      };

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

      appendTextParam(params, 'userId', filters.userId);
      appendTextParam(params, 'orderNo', filters.orderNo);
      appendTextParam(params, 'refundNo', filters.refundNo);
      appendTextParam(params, 'refundTradeNo', filters.refundTradeNo);
      appendTextParam(params, 'createTimeStart', filters.createTimeStart);
      appendTextParam(params, 'createTimeEnd', filters.createTimeEnd);
      appendTextParam(params, 'finishTimeStart', filters.finishTimeStart);
      appendTextParam(params, 'finishTimeEnd', filters.finishTimeEnd);
      if (filters.refundState !== undefined) {
        params.refundState = filters.refundState;
      }

      const res = await getReceiptRefundOrderPage(params, {
        skipErrorHandler: true,
      });
      const nextRecords = Array.isArray(res?.records) ? res.records : [];
      recordsRef.current = nextRecords;
      setRecords(nextRecords);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load receipt refund orders page failed:', error);
      const errorMessage = getErrorMessage(error, '获取退款订单列表失败');
      setListError(errorMessage);
      if (recordsRef.current.length > 0) {
        message.error(errorMessage);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setListInitialized(true);
    }
  }, [
    current,
    filters.agentOrgId,
    filters.createTimeEnd,
    filters.createTimeStart,
    filters.finishTimeEnd,
    filters.finishTimeStart,
    filters.groupOrgId,
    filters.merchantOrgId,
    filters.orderNo,
    filters.refundNo,
    filters.refundState,
    filters.refundTradeNo,
    filters.storeOrgId,
    filters.userId,
    pageSize,
    showAgentFilter,
    showGroupFilter,
    showMerchantFilter,
    showStoreFilter,
  ]);

  useEffect(() => {
    void loadReceiptRefundOrderPage();
  }, [loadReceiptRefundOrderPage]);

  const handleSearchUser = useCallback(async () => {
    const phone = normalizeText(userSearchPhone);
    if (!phone) {
      message.warning('请输入手机号查询用户');
      return;
    }

    setUserSearchLoading(true);
    try {
      const res = await searchUserByPhone(phone, { skipErrorHandler: true });
      setUserSearchResults(res ? [res] : []);
      if (!res) {
        message.info('未查询到用户');
      }
    } catch (error) {
      console.error('search refund user failed:', error);
      message.error(getErrorMessage(error, '查询用户失败'));
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  }, [userSearchPhone]);

  const handleSelectUser = useCallback((record: SearchUserResult) => {
    const nextUserId =
      normalizeText((record as any).userId) || normalizeText(record.id);
    if (!nextUserId) {
      message.warning('当前用户缺少ID，无法选择');
      return;
    }

    updateDraftFilter('userId', nextUserId);
    setUserPickerOpen(false);
  }, []);

  const handleOpenDetail = useCallback(
    async (record: ReceiptRefundOrderRecord) => {
      const orderNo = normalizeText(record.orderNo);

      if (!orderNo) {
        message.warning('当前退款订单缺少订单号，无法查看详情');
        return;
      }

      setDetailOpen(true);
      setDetailRecord(null);
      setDetailError(undefined);
      setDetailLoading(true);

      try {
        const res = await getReceiptRefundOrderDetailByOrderNo(orderNo, {
          skipErrorHandler: true,
        });
        setDetailRecord(res || null);
      } catch (error) {
        console.error('load receipt refund order detail failed:', error);
        const errorMessage = getErrorMessage(error, '获取退款订单详情失败');
        setDetailError(errorMessage);
        message.error(errorMessage);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const columns = useMemo<ColumnsType<ReceiptRefundOrderRecord>>(
    () =>
      [
        {
          title: '退款单号',
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
          title: '退款状态',
          dataIndex: 'refundState',
          width: 130,
          render: (value: number) => renderStatus(value),
        },
        {
          title: '订单号',
          dataIndex: 'orderNo',
          width: 190,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '退款人姓名',
          key: 'refundUserName',
          width: 140,
          render: (_: unknown, record: ReceiptRefundOrderRecord) =>
            getRefundUserName(record),
        },
        {
          title: '退款人手机号',
          key: 'refundUserPhone',
          width: 150,
          render: (_: unknown, record: ReceiptRefundOrderRecord) =>
            getRefundUserPhone(record),
        },
        {
          title: '创建时间',
          dataIndex: 'createTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '退款时间',
          dataIndex: 'finishTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '商户组织',
          key: 'merchantOrg',
          width: 180,
          render: (_: unknown, record: ReceiptRefundOrderRecord) =>
            renderLines(
              getOrgLines(
                record.merchantOrg,
                record.merchantOrgId,
                record.merchantOrgName,
                record.merchantOrgCode,
              ),
            ),
        },
        {
          title: '门店组织',
          key: 'storeOrg',
          width: 180,
          render: (_: unknown, record: ReceiptRefundOrderRecord) =>
            renderLines(
              getOrgLines(
                record.storeOrg,
                record.storeOrgId,
                record.storeOrgName,
                record.storeOrgCode,
              ),
            ),
        },
        {
          title: '代理组织',
          key: 'agentOrg',
          width: 180,
          render: (_: unknown, record: ReceiptRefundOrderRecord) =>
            renderLines(
              getOrgLines(
                record.agentOrg,
                record.agentOrgId,
                record.agentOrgName,
                record.agentOrgCode,
              ),
            ),
        },
        {
          title: '集团组织',
          key: 'groupOrg',
          width: 180,
          render: (_: unknown, record: ReceiptRefundOrderRecord) =>
            renderLines(
              getOrgLines(
                record.groupOrg,
                record.groupOrgId,
                record.groupOrgName,
                record.groupOrgCode,
              ),
            ),
        },
        {
          title: '操作',
          key: 'action',
          width: 100,
          fixed: 'right',
          render: (_: unknown, record: ReceiptRefundOrderRecord) => (
            <div className="receipt-refund-orders-action-links">
              <Button
                type="link"
                size="small"
                onClick={() => {
                  void handleOpenDetail(record);
                }}
              >
                详情
              </Button>
            </div>
          ),
        },
      ].filter(Boolean) as ColumnsType<ReceiptRefundOrderRecord>,
    [handleOpenDetail],
  );

  const handleReset = () => {
    const nextFilters = createDefaultFilters();
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setDraftCreateTimeRange(createDefaultDateTimeRange());
    setDraftFinishTimeRange(null);
    setUserSearchPhone('');
    setUserSearchResults([]);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return (
    <div className="receipt-refund-orders-page">
      <ExpandableFilterCard
        className="receipt-refund-orders-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={
          [
            {
              key: 'createTime',
              label: '订单时间',
              wideWhenCollapsed: Boolean(draftCreateTimeRange),
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
              key: 'refundNo',
              label: '退款单号',
              content: renderInputControl('refundNo', '请输入退款单号'),
            },
            {
              key: 'refundTradeNo',
              label: '退款流水号',
              content: renderInputControl('refundTradeNo', '请输入退款流水号'),
            },
            {
              key: 'refundState',
              label: '退款状态',
              content: (
                <Select
                  allowClear
                  placeholder="请选择退款状态"
                  value={draftFilters.refundState}
                  options={REFUND_STATE_OPTIONS}
                  onChange={(value) => {
                    updateDraftFilter('refundState', value);
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
              key: 'userId',
              label: '退款人',
              content: (
                <Input
                  allowClear
                  readOnly
                  placeholder="点击选择退款人"
                  value={draftFilters.userId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setUserPickerOpen(true);
                  }}
                  onClear={() => {
                    updateDraftFilter('userId', '');
                  }}
                />
              ),
            },
            {
              key: 'finishTime',
              label: '退款时间',
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
            showAgentFilter && {
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
            showGroupFilter && {
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
            showMerchantFilter && {
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
            showStoreFilter && {
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

      <div className="content-card receipt-refund-orders-table-card">
        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<ReceiptRefundOrderRecord>
            rowKey={(record) =>
              String(
                record.id ||
                  record.refundNo ||
                  record.refundTradeNo ||
                  record.orderNo ||
                  `${record.userId || 'receipt-refund-order'}-${record.createTime || ''}`,
              )
            }
            loading={refreshingList}
            columns={columns}
            dataSource={records}
            scroll={{ x: 3010 }}
            locale={{
              emptyText: <Empty description="暂无退款订单数据" />,
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
        title="选择退款人"
        open={userPickerOpen}
        onCancel={() => {
          setUserPickerOpen(false);
        }}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Input.Search
          allowClear
          placeholder="请输入手机号查询用户"
          enterButton="查询"
          value={userSearchPhone}
          onChange={(event) => {
            setUserSearchPhone(event.target.value);
          }}
          onSearch={() => {
            void handleSearchUser();
          }}
        />
        <Table<SearchUserResult>
          rowKey={(record) =>
            String((record as any).userId || record.id || record.phone || '')
          }
          size="small"
          loading={userSearchLoading}
          dataSource={userSearchResults}
          pagination={false}
          style={{ marginTop: 16 }}
          locale={{
            emptyText: <Empty description="暂无用户数据" />,
          }}
          columns={[
            {
              title: '用户ID',
              key: 'userId',
              ellipsis: true,
              render: (_: unknown, record: SearchUserResult) =>
                (record as any).userId || record.id || '-',
            },
            {
              title: '姓名',
              key: 'name',
              width: 140,
              render: (_: unknown, record: SearchUserResult) =>
                record.name || (record as any).nickName || '-',
            },
            {
              title: '手机号',
              dataIndex: 'phone',
              width: 150,
              render: (value: string) => value || '-',
            },
            {
              title: '操作',
              key: 'action',
              width: 90,
              render: (_: unknown, record: SearchUserResult) => (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    handleSelectUser(record);
                  }}
                >
                  选择
                </Button>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title="退款订单详情"
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
          <div className="receipt-refund-orders-detail-loading">
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
                key: 'refundNo',
                label: '退款单号',
                children: detailRecord.refundNo || '-',
              },
              {
                key: 'refundTradeNo',
                label: '退款流水号',
                children: detailRecord.refundTradeNo || '-',
              },
              {
                key: 'refundState',
                label: '退款状态',
                children: renderStatus(detailRecord.refundState),
              },
              {
                key: 'refundAmount',
                label: '退款金额',
                children: formatMoney(detailRecord.refundAmount),
              },
              {
                key: 'refundFee',
                label: '退款返还手续费',
                children: formatMoney(detailRecord.refundFee),
              },
              {
                key: 'remainingRefundAmount',
                label: '剩余退款金额',
                children: formatMoney(detailRecord.remainingRefundAmount),
              },
              {
                key: 'storeOrg',
                label: '门店组织',
                children: renderLines(
                  getOrgLines(
                    detailRecord.storeOrg,
                    detailRecord.storeOrgId,
                    detailRecord.storeOrgName,
                    detailRecord.storeOrgCode,
                  ),
                ),
              },
              {
                key: 'merchantOrgId',
                label: '商户组织',
                children: renderLines(
                  getOrgLines(
                    detailRecord.merchantOrg,
                    detailRecord.merchantOrgId,
                    detailRecord.merchantOrgName,
                    detailRecord.merchantOrgCode,
                  ),
                ),
              },
              {
                key: 'agentOrgId',
                label: '代理组织',
                children: renderLines(
                  getOrgLines(
                    detailRecord.agentOrg,
                    detailRecord.agentOrgId,
                    detailRecord.agentOrgName,
                    detailRecord.agentOrgCode,
                  ),
                ),
              },
              {
                key: 'groupOrgId',
                label: '集团组织',
                children: renderLines(
                  getOrgLines(
                    detailRecord.groupOrg,
                    detailRecord.groupOrgId,
                    detailRecord.groupOrgName,
                    detailRecord.groupOrgCode,
                  ),
                ),
              },
              {
                key: 'userId',
                label: '退款人ID',
                children: detailRecord.userId || '-',
              },
              {
                key: 'accRefundNo',
                label: '渠道退款订单号',
                children: detailRecord.accRefundNo || '-',
              },
              {
                key: 'accRefundTradeNo',
                label: '渠道退款流水号',
                children: detailRecord.accRefundTradeNo || '-',
              },
              {
                key: 'finishTime',
                label: '退款完成时间',
                children: detailRecord.finishTime || '-',
              },
              {
                key: 'createTime',
                label: '创建时间',
                children: detailRecord.createTime || '-',
              },
              {
                key: 'updateTime',
                label: '修改时间',
                children: detailRecord.updateTime || '-',
              },
              {
                key: 'refundReason',
                label: '退款原因',
                children: detailRecord.refundReason || '-',
                span: 2,
              },
            ]}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default ReceiptRefundOrdersPage;
