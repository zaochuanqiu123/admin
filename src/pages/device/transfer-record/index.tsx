import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type DeviceTransferDetailRecord,
  type DeviceTransferDeviceType,
  type DeviceTransferRecord,
  type DeviceTransferType,
  getDeviceTransferDetailPage,
  getDeviceTransferPage,
} from '@/api/transfer';
import { PageSectionSkeleton } from '@/components';
import { getErrorMessage } from '@/utils/apiMessage';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;

type QueryFilters = {
  orderNo: string;
  transferType?: DeviceTransferType;
  deviceType?: DeviceTransferDeviceType;
  orgId: string;
};

type DetailQueryFilters = {
  deviceSn: string;
};

function getTransferTypeText(value?: DeviceTransferType) {
  return value === 'RETURN' ? '回调' : '划拨';
}

function getDeviceTypeText(value?: DeviceTransferDeviceType) {
  if (value === 'SPEAKER') return '音箱';
  if (value === 'PRINTER') return '打印机';
  return '二维码';
}

const TransferRecordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<DeviceTransferRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [detailRecord, setDetailRecord] = useState<DeviceTransferRecord | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const [detailRecords, setDetailRecords] = useState<
    DeviceTransferDetailRecord[]
  >([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    orderNo: '',
    transferType: undefined,
    deviceType: undefined,
    orgId: '',
  });
  const [filters, setFilters] = useState<QueryFilters>({
    orderNo: '',
    transferType: undefined,
    deviceType: undefined,
    orgId: '',
  });
  const [detailDraftFilters, setDetailDraftFilters] =
    useState<DetailQueryFilters>({
      deviceSn: '',
    });
  const [detailFilters, setDetailFilters] = useState<DetailQueryFilters>({
    deviceSn: '',
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });
  const [detailPagination, setDetailPagination] =
    useState<TablePaginationConfig>({
      current: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      showSizeChanger: true,
      showTotal: (total) => `共 ${total} 条`,
    });

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);
  const detailCurrent = Number(detailPagination.current || 1);
  const detailPageSize = Number(detailPagination.pageSize || DEFAULT_PAGE_SIZE);

  const loadTransferRecords = useCallback(async () => {
    setLoading(true);
    setListError(undefined);

    try {
      const res = await getDeviceTransferPage(
        {
          current,
          pageSize,
          orderNo: filters.orderNo.trim() || undefined,
          transferType: filters.transferType,
          deviceType: filters.deviceType,
          orgId: filters.orgId.trim() || undefined,
        },
        {
          skipErrorHandler: true,
        },
      );
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load transfer records failed:', error);
      setListError(getErrorMessage(error, '获取流转记录失败'));
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [
    current,
    filters.deviceType,
    filters.orderNo,
    filters.orgId,
    filters.transferType,
    pageSize,
  ]);

  useEffect(() => {
    void loadTransferRecords();
  }, [loadTransferRecords]);

  const loadTransferDetails = useCallback(async () => {
    if (!detailRecord?.id) {
      return;
    }

    setDetailLoading(true);
    setDetailError(undefined);

    try {
      const res = await getDeviceTransferDetailPage(
        {
          current: detailCurrent,
          pageSize: detailPageSize,
          transferId: String(detailRecord.id),
          transferOrderNo: detailRecord.orderNo || undefined,
          deviceType: detailRecord.deviceType,
          deviceSn: detailFilters.deviceSn.trim() || undefined,
        },
        {
          skipErrorHandler: true,
        },
      );
      setDetailRecords(Array.isArray(res?.records) ? res.records : []);
      setDetailTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load transfer details failed:', error);
      setDetailError(getErrorMessage(error, '获取流转明细失败'));
    } finally {
      setDetailLoading(false);
    }
  }, [detailCurrent, detailFilters.deviceSn, detailPageSize, detailRecord]);

  useEffect(() => {
    if (!detailRecord?.id) {
      return;
    }

    void loadTransferDetails();
  }, [detailRecord, loadTransferDetails]);

  const columns = useMemo<ColumnsType<DeviceTransferRecord>>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 90,
        render: (value) => value || '-',
      },
      {
        title: '流转单号',
        dataIndex: 'orderNo',
        width: 220,
        render: (value) => value || '-',
      },
      {
        title: '操作类型',
        dataIndex: 'transferType',
        width: 120,
        render: (value: DeviceTransferType) => (
          <Tag color="processing">{getTransferTypeText(value)}</Tag>
        ),
      },
      {
        title: '转出组织ID',
        dataIndex: 'fromOrgId',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: '转入组织ID',
        dataIndex: 'toOrgId',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        width: 100,
        render: (value) => value ?? '-',
      },
      {
        title: '设备类型',
        dataIndex: 'deviceType',
        width: 130,
        render: (value: DeviceTransferDeviceType) => (
          <Tag>{getDeviceTypeText(value)}</Tag>
        ),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 220,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            onClick={() => {
              const nextDetailFilters: DetailQueryFilters = {
                deviceSn: '',
              };
              setDetailDraftFilters(nextDetailFilters);
              setDetailFilters(nextDetailFilters);
              setDetailPagination((prev) => ({
                ...prev,
                current: 1,
                pageSize: DEFAULT_PAGE_SIZE,
              }));
              setDetailRecords([]);
              setDetailTotal(0);
              setDetailError(undefined);
              setDetailRecord(record);
            }}
          >
            查看明细
          </Button>
        ),
      },
    ],
    [],
  );

  const detailColumns = useMemo<ColumnsType<DeviceTransferDetailRecord>>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 90,
        render: (value) => value || '-',
      },
      {
        title: '设备编号',
        dataIndex: 'deviceSn',
        width: 220,
        render: (value) => value || '-',
      },
      {
        title: '设备类型',
        dataIndex: 'deviceType',
        width: 130,
        render: (value: DeviceTransferDeviceType) => (
          <Tag>{getDeviceTypeText(value)}</Tag>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: '修改时间',
        dataIndex: 'updateTime',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: '创建人ID',
        dataIndex: 'createUserId',
        width: 150,
        render: (value) => value || '-',
      },
      {
        title: '修改人ID',
        dataIndex: 'updateUserId',
        width: 150,
        render: (value) => value || '-',
      },
    ],
    [],
  );

  const handleSearch = () => {
    setFilters({
      orderNo: draftFilters.orderNo.trim(),
      transferType: draftFilters.transferType,
      deviceType: draftFilters.deviceType,
      orgId: draftFilters.orgId.trim(),
    });
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleReset = () => {
    const nextFilters: QueryFilters = {
      orderNo: '',
      transferType: undefined,
      deviceType: undefined,
      orgId: '',
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleDetailSearch = () => {
    setDetailFilters({
      deviceSn: detailDraftFilters.deviceSn.trim(),
    });
    setDetailPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleDetailReset = () => {
    const nextFilters: DetailQueryFilters = {
      deviceSn: '',
    };
    setDetailDraftFilters(nextFilters);
    setDetailFilters(nextFilters);
    setDetailPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return (
    <div className="transfer-record-page">
      <div className="content-card transfer-record-filter-card">
        <div className="transfer-record-filter-grid">
          <div className="field">
            <span className="field-label">流转单号</span>
            <Input
              allowClear
              placeholder="请输入流转单号"
              value={draftFilters.orderNo}
              onChange={(event) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  orderNo: event.target.value,
                }));
              }}
              onPressEnter={handleSearch}
            />
          </div>

          <div className="field">
            <span className="field-label">操作类型</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.transferType}
              options={[
                { label: '划拨', value: 'ISSUE' },
                { label: '回调', value: 'RETURN' },
              ]}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  transferType: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">设备类型</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.deviceType}
              options={[
                { label: '二维码', value: 'QRCODE' },
                { label: '音箱', value: 'SPEAKER' },
                { label: '打印机', value: 'PRINTER' },
              ]}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  deviceType: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">组织ID</span>
            <Input
              allowClear
              placeholder="请输入组织ID"
              value={draftFilters.orgId}
              onChange={(event) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  orgId: event.target.value,
                }));
              }}
              onPressEnter={handleSearch}
            />
          </div>

          <div className="field actions">
            <Space>
              <Button type="primary" onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>
        </div>
      </div>

      <div className="content-card transfer-record-table-card">
        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<DeviceTransferRecord>
            rowKey="id"
            loading={refreshingList}
            columns={columns}
            dataSource={records}
            scroll={{ x: 1500 }}
            locale={{
              emptyText: <Empty description="暂无流转记录数据" />,
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
        title="查看明细"
        open={Boolean(detailRecord)}
        onCancel={() => {
          setDetailRecord(null);
        }}
        footer={null}
        width={1080}
        destroyOnClose
        className="transfer-record-detail-modal"
      >
        {detailRecord ? (
          <div className="transfer-record-detail">
            <Descriptions
              className="transfer-record-detail-summary"
              column={2}
              bordered
              items={[
                { key: 'id', label: 'ID', children: detailRecord.id || '-' },
                {
                  key: 'orderNo',
                  label: '流转单号',
                  children: detailRecord.orderNo || '-',
                },
                {
                  key: 'transferType',
                  label: '操作类型',
                  children: getTransferTypeText(detailRecord.transferType),
                },
                {
                  key: 'deviceType',
                  label: '设备类型',
                  children: getDeviceTypeText(detailRecord.deviceType),
                },
                {
                  key: 'fromOrgId',
                  label: '转出组织ID',
                  children: detailRecord.fromOrgId || '-',
                },
                {
                  key: 'toOrgId',
                  label: '转入组织ID',
                  children: detailRecord.toOrgId || '-',
                },
                {
                  key: 'quantity',
                  label: '数量',
                  children: detailRecord.quantity ?? '-',
                },
                {
                  key: 'createTime',
                  label: '创建时间',
                  children: detailRecord.createTime || '-',
                },
                {
                  key: 'remark',
                  label: '备注',
                  children: detailRecord.remark || '-',
                  span: 2,
                },
              ]}
            />

            <div className="transfer-record-detail-toolbar">
              <div className="detail-toolbar-title">设备明细</div>
              <Space>
                <Input
                  allowClear
                  placeholder="请输入设备编号"
                  value={detailDraftFilters.deviceSn}
                  onChange={(event) => {
                    setDetailDraftFilters((prev) => ({
                      ...prev,
                      deviceSn: event.target.value,
                    }));
                  }}
                  onPressEnter={handleDetailSearch}
                />
                <Button type="primary" onClick={handleDetailSearch}>
                  搜索
                </Button>
                <Button onClick={handleDetailReset}>重置</Button>
              </Space>
            </div>

            {detailError && detailRecords.length === 0 ? (
              <Alert type="error" showIcon message={detailError} />
            ) : (
              <Table<DeviceTransferDetailRecord>
                rowKey="id"
                loading={detailLoading}
                columns={detailColumns}
                dataSource={detailRecords}
                scroll={{ x: 1200 }}
                locale={{
                  emptyText: <Empty description="暂无流转明细数据" />,
                }}
                pagination={{
                  ...detailPagination,
                  total: detailTotal,
                  onChange: (nextCurrent, nextPageSize) => {
                    setDetailPagination((prev) => ({
                      ...prev,
                      current: nextCurrent,
                      pageSize: nextPageSize,
                    }));
                  },
                }}
              />
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default TransferRecordPage;
