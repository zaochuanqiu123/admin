import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Empty,
  Image,
  Input,
  message,
  Select,
  Space,
  Switch,
  Table,
} from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getQrCodePageQuery, type QrCodeRecord } from '@/api/qrCode';
import { CreateQrCodeModal } from './components/CreateQrCodeModal';
import { TransferModal } from './components/TransferModal';
import './index.less';

const { RangePicker } = DatePicker;

type QueryFilters = {
  brandName?: string;
  transferTimeRange?: RangePickerProps['value'];
  bizType?: string;
  state?: string;
  isTransferred?: string;
  isBound?: string;
  sn: string;
  batchSn: string;
  qrcodeTemplateId?: string;
  openType?: string;
  snStart: string;
  snEnd: string;
  keyword: string;
  model: string;
};

const DEFAULT_PAGE_SIZE = 10;

function formatOpenType(value?: string) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (!normalized) return '-';
  if (normalized === 'MINI' || normalized === 'MINI_PROGRAM') return '小程序';
  if (normalized === 'H5' || normalized === 'H5-H5') return 'H5';
  return value || '-';
}

function formatBizType(value?: string) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (!normalized) return '-';
  if (normalized === 'RECEIPT_CODE') return '收款码';
  if (normalized === 'CATER_TABLE') return '餐饮桌台';
  if (normalized === 'OTHER') return '其他业务';
  return value || '-';
}

function getTemplateName(record: QrCodeRecord) {
  return String(record?.qrcodeTemplate?.name || '').trim();
}

function getPreviewImage(record: QrCodeRecord) {
  return String(record?.qrcodeTemplate?.prevImageUrl || '').trim();
}

function getBrandName(record: QrCodeRecord) {
  const rawValue =
    (record as any)?.brandName ||
    (record as any)?.belongBrandName ||
    (record as any)?.brand ||
    (record as any)?.brandLabel;
  return String(rawValue || '').trim();
}

function isBound(record: QrCodeRecord) {
  return Boolean(
    String(record?.targetId || '').trim() ||
      String(record?.bindTime || '').trim() ||
      String(record?.merchantOrgId || '').trim() ||
      String(record?.storeOrgId || '').trim() ||
      String(record?.storeOrgUserId || '').trim(),
  );
}

function isTransferred(record: QrCodeRecord) {
  return Boolean(String(record?.transferTime || '').trim());
}

function getOrgDisplay(record: QrCodeRecord) {
  return (
    [record?.agentOrgId, record?.groupOrgId].filter(Boolean).join(' / ') || '-'
  );
}

function getBindDisplay(record: QrCodeRecord) {
  const items = [
    record?.merchantOrgId ? `商户ID：${record.merchantOrgId}` : '',
    record?.storeOrgId ? `门店ID：${record.storeOrgId}` : '',
    record?.storeOrgUserId ? `员工ID：${record.storeOrgUserId}` : '',
  ].filter(Boolean);
  return items;
}

function showPendingActionMessage(label: string) {
  message.info(`${label}功能暂未接入，等你确认接口后再补。`);
}

const StoreQrCodeListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<QrCodeRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  // Modals state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    brandName: undefined,
    transferTimeRange: undefined,
    bizType: undefined,
    state: undefined,
    isTransferred: undefined,
    isBound: undefined,
    sn: '',
    batchSn: '',
    qrcodeTemplateId: undefined,
    openType: undefined,
    snStart: '',
    snEnd: '',
    keyword: '',
    model: '',
  });
  const [filters, setFilters] = useState<QueryFilters>({
    brandName: undefined,
    transferTimeRange: undefined,
    bizType: undefined,
    state: undefined,
    isTransferred: undefined,
    isBound: undefined,
    sn: '',
    batchSn: '',
    qrcodeTemplateId: undefined,
    openType: undefined,
    snStart: '',
    snEnd: '',
    keyword: '',
    model: '',
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = pagination.current || 1;
  const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;

  const templateOptions = useMemo(() => {
    const templateMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const templateId = String(record?.qrcodeTemplateId || '').trim();
      const templateName = getTemplateName(record);
      if (!templateId || !templateName) return;
      templateMap.set(templateId, { label: templateName, value: templateId });
    });
    return Array.from(templateMap.values());
  }, [records]);

  const brandOptions = useMemo(() => {
    const brandMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const brandName = getBrandName(record);
      if (!brandName) return;
      brandMap.set(brandName, { label: brandName, value: brandName });
    });
    return Array.from(brandMap.values());
  }, [records]);

  const openTypeOptions = useMemo(() => {
    const optionMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const value = String(record?.openType || '').trim();
      if (!value) return;
      optionMap.set(value, { label: formatOpenType(value), value });
    });
    return Array.from(optionMap.values());
  }, [records]);

  const bizTypeOptions = useMemo(() => {
    const optionMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const value = String(record?.bizType || '').trim();
      if (!value) return;
      optionMap.set(value, { label: formatBizType(value), value });
    });
    return Array.from(optionMap.values());
  }, [records]);

  const loadQrCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQrCodePageQuery({
        current,
        pageSize,
        sn: filters.sn.trim() || undefined,
        batchSn: filters.batchSn.trim() || undefined,
        model: filters.model.trim() || undefined,
        qrcodeTemplateId: filters.qrcodeTemplateId || undefined,
      });
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load qr code list failed:', error);
      setRecords([]);
      setServerTotal(0);
      message.error('获取收款码列表失败');
    } finally {
      setLoading(false);
    }
  }, [
    current,
    filters.batchSn,
    filters.model,
    filters.qrcodeTemplateId,
    filters.sn,
    pageSize,
  ]);

  useEffect(() => {
    void loadQrCodes();
  }, [loadQrCodes]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.brandName && getBrandName(record) !== filters.brandName) {
        return false;
      }

      if (
        filters.bizType &&
        String(record?.bizType || '') !== filters.bizType
      ) {
        return false;
      }

      if (
        filters.openType &&
        String(record?.openType || '') !== filters.openType
      ) {
        return false;
      }

      if (filters.state !== undefined && filters.state !== '') {
        if (String(Number(record?.state ?? 0)) !== String(filters.state)) {
          return false;
        }
      }

      if (filters.isTransferred !== undefined && filters.isTransferred !== '') {
        if (
          String(Number(isTransferred(record))) !==
          String(filters.isTransferred)
        ) {
          return false;
        }
      }

      if (filters.isBound !== undefined && filters.isBound !== '') {
        if (String(Number(isBound(record))) !== String(filters.isBound)) {
          return false;
        }
      }

      if (
        filters.transferTimeRange &&
        filters.transferTimeRange[0] &&
        filters.transferTimeRange[1]
      ) {
        const transferTime = dayjs(record?.transferTime);
        if (!transferTime.isValid()) return false;
        const start = filters.transferTimeRange[0].startOf('day');
        const end = filters.transferTimeRange[1].endOf('day');
        if (transferTime.isBefore(start) || transferTime.isAfter(end)) {
          return false;
        }
      }

      const snValue = String(record?.sn || '').trim();
      if (filters.snStart && snValue && snValue < filters.snStart) {
        return false;
      }
      if (filters.snEnd && snValue && snValue > filters.snEnd) {
        return false;
      }

      const keyword = filters.keyword.trim();
      if (keyword) {
        const keywordSource = [
          record?.merchantOrgId,
          record?.storeOrgId,
          record?.storeOrgUserId,
          record?.agentOrgId,
          record?.groupOrgId,
          record?.targetId,
          getTemplateName(record),
        ]
          .filter(Boolean)
          .join(' ');
        if (!keywordSource.includes(keyword)) {
          return false;
        }
      }

      return true;
    });
  }, [
    filters.bizType,
    filters.brandName,
    filters.isBound,
    filters.isTransferred,
    filters.keyword,
    filters.openType,
    filters.snEnd,
    filters.snStart,
    filters.state,
    filters.transferTimeRange,
    records,
  ]);

  const columns = useMemo<ColumnsType<QrCodeRecord>>(
    () => [
      {
        title: '批次号',
        dataIndex: 'batchSn',
        width: 140,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '编号',
        dataIndex: 'sn',
        width: 140,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '二维码',
        dataIndex: ['qrcodeTemplate', 'prevImageUrl'],
        width: 140,
        render: (_value, record) => {
          const imageUrl = getPreviewImage(record);
          if (imageUrl) {
            return (
              <div className="qr-code-preview-box">
                <img
                  src={imageUrl}
                  alt={getTemplateName(record) || '收款码预览'}
                  className="qr-code-preview-image"
                  onClick={() => {
                    setPreviewImage(imageUrl);
                    setPreviewOpen(true);
                  }}
                />
              </div>
            );
          }

          return (
            <div className="qr-code-preview-box qr-code-preview-box-placeholder">
              <span>暂无预览</span>
            </div>
          );
        },
      },
      {
        title: '打开方式',
        dataIndex: 'openType',
        width: 120,
        render: (value) => formatOpenType(value),
      },
      {
        title: '类型',
        dataIndex: 'bizType',
        width: 130,
        render: (value) => (
          <span className="qr-code-chip is-muted">{formatBizType(value)}</span>
        ),
      },
      {
        title: '型号',
        dataIndex: 'model',
        width: 120,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '机构',
        key: 'orgInfo',
        width: 180,
        render: (_, record) => getOrgDisplay(record),
      },
      {
        title: '绑定商户',
        key: 'bindInfo',
        width: 220,
        render: (_, record) => {
          const bindInfo = getBindDisplay(record);
          if (!bindInfo.length) return '-';
          return (
            <div className="qr-code-bind-lines">
              {bindInfo.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          );
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 180,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '划拨时间',
        dataIndex: 'transferTime',
        width: 180,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '状态',
        dataIndex: 'state',
        width: 120,
        render: (value, record) => (
          <Switch
            checked={Number(value) === 1}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            onChange={(checked) => {
              setRecords((prev) =>
                prev.map((item) =>
                  String(item.id) === String(record.id)
                    ? {
                        ...item,
                        state: checked ? 1 : 0,
                      }
                    : item,
                ),
              );
              message.info(
                `状态切换为${checked ? '启用' : '禁用'}，后续再接真实接口。`,
              );
            }}
          />
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <div className="qr-code-action-links">
            <a
              onClick={() => {
                showPendingActionMessage(record?.targetId ? '解绑' : '查看');
              }}
            >
              {record?.targetId ? '解绑' : '查看'}
            </a>
          </div>
        ),
      },
    ],
    [],
  );

  const selectedCount = selectedRowKeys.length;

  const handleSearch = () => {
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
    setFilters({
      ...draftFilters,
      sn: draftFilters.sn.trim(),
      batchSn: draftFilters.batchSn.trim(),
      model: draftFilters.model.trim(),
      snStart: draftFilters.snStart.trim(),
      snEnd: draftFilters.snEnd.trim(),
      keyword: draftFilters.keyword.trim(),
    });
  };

  const handleReset = () => {
    const nextFilters: QueryFilters = {
      brandName: undefined,
      transferTimeRange: undefined,
      bizType: undefined,
      state: undefined,
      isTransferred: undefined,
      isBound: undefined,
      sn: '',
      batchSn: '',
      qrcodeTemplateId: undefined,
      openType: undefined,
      snStart: '',
      snEnd: '',
      keyword: '',
      model: '',
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const filteredTotal =
    filters.brandName ||
    filters.transferTimeRange ||
    filters.bizType ||
    filters.state ||
    filters.isTransferred ||
    filters.isBound ||
    filters.openType ||
    filters.snStart ||
    filters.snEnd ||
    filters.keyword
      ? filteredRecords.length
      : serverTotal;

  return (
    <div className="qr-code-page">
      <div className="content-card qr-code-filter-card">
        <div className="filter-grid qr-code-filter-grid">
          <div className="field">
            <span className="field-label">所属品牌</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.brandName}
              options={brandOptions}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  brandName: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">划拨时间</span>
            <RangePicker
              value={draftFilters.transferTimeRange}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  transferTimeRange: value || undefined,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">类别</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.bizType}
              options={bizTypeOptions}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  bizType: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">状态</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.state}
              options={[
                { label: '启用', value: '1' },
                { label: '禁用', value: '0' },
              ]}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  state: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">是否划拨</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.isTransferred}
              options={[
                { label: '是', value: '1' },
                { label: '否', value: '0' },
              ]}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  isTransferred: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">是否绑定</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.isBound}
              options={[
                { label: '是', value: '1' },
                { label: '否', value: '0' },
              ]}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  isBound: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">编号</span>
            <Input
              allowClear
              placeholder="请输入编号"
              value={draftFilters.sn}
              onChange={(event) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  sn: event.target.value,
                }));
              }}
              onPressEnter={handleSearch}
            />
          </div>

          <div className="field">
            <span className="field-label">批次号</span>
            <Input
              allowClear
              placeholder="请输入批次号"
              value={draftFilters.batchSn}
              onChange={(event) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  batchSn: event.target.value,
                }));
              }}
              onPressEnter={handleSearch}
            />
          </div>

          <div className="field">
            <span className="field-label">模板</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.qrcodeTemplateId}
              options={templateOptions}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  qrcodeTemplateId: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">打开方式</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.openType}
              options={openTypeOptions}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  openType: value,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">编号区间</span>
            <Space.Compact block>
              <Input
                placeholder="请输入起始编号"
                value={draftFilters.snStart}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    snStart: event.target.value,
                  }));
                }}
              />
              <Input
                placeholder="请输入截止编号"
                value={draftFilters.snEnd}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    snEnd: event.target.value,
                  }));
                }}
              />
            </Space.Compact>
          </div>

          <div className="field">
            <span className="field-label">关键字</span>
            <Input
              allowClear
              placeholder="请输入商户/门店/机构名称"
              value={draftFilters.keyword}
              onChange={(event) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  keyword: event.target.value,
                }));
              }}
              onPressEnter={handleSearch}
            />
          </div>

          <div className="field actions">
            <Space>
              <Button type="primary" onClick={handleSearch}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>
        </div>
      </div>

      <div className="content-card qr-code-table-card">
        <div className="qr-code-toolbar">
          <Space wrap size={12}>
            <Button
              type="primary"
              className="qr-code-primary-action-btn"
              onClick={() => {
                setTransferModalOpen(true);
              }}
            >
              划拨/回调
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="qr-code-primary-action-btn"
              onClick={() => {
                setCreateModalOpen(true);
              }}
            >
              生成收款码
            </Button>
            <Button
              onClick={() => {
                showPendingActionMessage('批量修改模板');
              }}
            >
              批量修改模板
            </Button>
            <Button
              onClick={() => {
                showPendingActionMessage('导出收款码数据');
              }}
            >
              导出收款码数据
            </Button>
            <Button
              onClick={() => {
                showPendingActionMessage('导出二维码');
              }}
            >
              导出二维码
            </Button>
            <Button
              onClick={() => {
                showPendingActionMessage('导出合成码');
              }}
            >
              导出合成码
            </Button>
          </Space>
          <div className="qr-code-toolbar-note">
            当前页已补齐参考图中的筛选区和工具按钮，已确认字段走真实响应结构，未确认查询项先按返回记录过滤。
          </div>
        </div>

        <Table<QrCodeRecord>
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          columns={columns}
          dataSource={filteredRecords}
          scroll={{ x: 1760 }}
          locale={{
            emptyText: <Empty description="暂无收款码数据" />,
          }}
          pagination={{
            ...pagination,
            total: filteredTotal,
            onChange: (nextCurrent, nextPageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: nextCurrent,
                pageSize: nextPageSize,
              }));
            },
          }}
        />
      </div>

      <TransferModal
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        selectedRecords={records.filter((r) => selectedRowKeys.includes(r.id))}
        onOk={(values) => {
          console.log('Transfer values:', values);
          message.success('操作成功 (Mock)');
          setTransferModalOpen(false);
          setSelectedRowKeys([]);
        }}
      />

      <CreateQrCodeModal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        brandOptions={brandOptions}
        templateOptions={templateOptions}
        onOk={(values) => {
          console.log('Create QR code values:', values);
          message.success('生成收款码成功 (Mock)');
          setCreateModalOpen(false);
        }}
      />

      <Image
        preview={{
          visible: previewOpen,
          src: previewImage,
          onVisibleChange: (visible) => {
            setPreviewOpen(visible);
            if (!visible) {
              setPreviewImage('');
            }
          },
        }}
        src={previewImage || undefined}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default StoreQrCodeListPage;
