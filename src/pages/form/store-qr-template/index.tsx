import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  message,
  Select,
  Space,
  Table,
} from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getQrCodeTemplatePageQuery,
  type QrCodeTemplateRecord,
} from '@/api/qrCodeTemplate';
import './index.less';

const { RangePicker } = DatePicker;

type QueryFilters = {
  name: string;
  brandName?: string;
  state?: string;
  showSn?: string;
  createTimeRange?: RangePickerProps['value'];
};

const DEFAULT_PAGE_SIZE = 10;

function getShowSnLabel(record: QrCodeTemplateRecord) {
  return Number(record?.qrCodeSnConfig?.isShow) === 1 ? '显示' : '隐藏';
}

function getStateLabel(state?: number) {
  if (Number(state) === 1) return '启用';
  if (Number(state) === 0) return '禁用';
  return '未知';
}

function getBrandName(record: QrCodeTemplateRecord) {
  const rawValue =
    record?.brandName ||
    (record as any)?.belongBrandName ||
    (record as any)?.brand ||
    (record as any)?.brandLabel;
  return String(rawValue || '').trim();
}

function getIsDefaultValue(record: QrCodeTemplateRecord) {
  const rawValue =
    record?.isDefault ?? record?.defaultFlag ?? (record as any)?.isDefaultFlag;
  return Number(rawValue) === 1 ? 1 : 0;
}

function getIsDefaultLabel(record: QrCodeTemplateRecord) {
  return getIsDefaultValue(record) === 1 ? '默认' : '否';
}

function buildPreviewImage(record: QrCodeTemplateRecord) {
  return String(record?.prevImageUrl || record?.prevImage || '').trim();
}

function showPendingEditorMessage() {
  message.info('添加模板和编辑模板暂不接入，等你确认改写内容后再补。');
}

const QrTemplateListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<QrCodeTemplateRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [drawerForm] = Form.useForm();
  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    name: '',
    brandName: undefined,
    state: undefined,
    showSn: undefined,
    createTimeRange: undefined,
  });
  const [filters, setFilters] = useState<QueryFilters>({
    name: '',
    brandName: undefined,
    state: undefined,
    showSn: undefined,
    createTimeRange: undefined,
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = pagination.current || 1;
  const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;

  const brandOptions = useMemo(() => {
    const brandMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const brandName = getBrandName(record);
      if (!brandName) return;
      brandMap.set(brandName, { label: brandName, value: brandName });
    });
    return Array.from(brandMap.values());
  }, [records]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQrCodeTemplatePageQuery({
        current,
        pageSize,
        name: filters.name.trim() || undefined,
      });
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load qr code templates failed:', error);
      setRecords([]);
      setServerTotal(0);
      message.error('获取二维码模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [current, filters.name, pageSize]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const nextBrandName = String(filters.brandName || '').trim();
      if (nextBrandName && getBrandName(record) !== nextBrandName) {
        return false;
      }

      if (filters.state !== undefined && filters.state !== '') {
        if (String(Number(record?.state ?? 0)) !== String(filters.state)) {
          return false;
        }
      }

      if (filters.showSn !== undefined && filters.showSn !== '') {
        if (
          String(Number(record?.qrCodeSnConfig?.isShow ?? 0)) !==
          String(filters.showSn)
        ) {
          return false;
        }
      }

      const range = filters.createTimeRange;
      if (range && range[0] && range[1] && record?.createTime) {
        const createTime = dayjs(record.createTime);
        if (createTime.isValid()) {
          const start = range[0].startOf('day');
          const end = range[1].endOf('day');
          if (createTime.isBefore(start) || createTime.isAfter(end)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    filters.brandName,
    filters.createTimeRange,
    filters.showSn,
    filters.state,
    records,
  ]);

  const columns = useMemo<ColumnsType<QrCodeTemplateRecord>>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 180,
        ellipsis: true,
      },
      {
        title: '模板名称',
        dataIndex: 'name',
        width: 220,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '预览',
        dataIndex: 'prevImageUrl',
        width: 160,
        render: (_value, record) => {
          const imageUrl = buildPreviewImage(record);
          if (imageUrl) {
            return (
              <div className="qr-template-preview-box">
                <img
                  src={imageUrl}
                  alt={record?.name || '二维码模板预览'}
                  className="qr-template-preview-image"
                  onClick={() => {
                    setPreviewImage(imageUrl);
                    setPreviewOpen(true);
                  }}
                />
              </div>
            );
          }

          return (
            <div className="qr-template-preview-box qr-template-preview-box-placeholder">
              <span>暂无预览</span>
            </div>
          );
        },
      },
      {
        title: '显示编号',
        dataIndex: ['qrCodeSnConfig', 'isShow'],
        width: 120,
        render: (_value, record) => (
          <span
            className={`qr-template-chip ${
              Number(record?.qrCodeSnConfig?.isShow) === 1
                ? 'is-success'
                : 'is-muted'
            }`}
          >
            {getShowSnLabel(record)}
          </span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'state',
        width: 120,
        render: (value) => (
          <span
            className={`qr-template-chip ${
              Number(value) === 1 ? 'is-success' : 'is-danger'
            }`}
          >
            {getStateLabel(value)}
          </span>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 190,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <div className="qr-template-action-links">
            <a
              onClick={() => {
                void record;
                showPendingEditorMessage();
              }}
            >
              编辑
            </a>
          </div>
        ),
      },
    ],
    [],
  );

  const handleSearch = () => {
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
    setFilters({
      ...draftFilters,
      name: draftFilters.name.trim(),
    });
  };

  const handleReset = () => {
    const nextFilters: QueryFilters = {
      name: '',
      brandName: undefined,
      state: undefined,
      showSn: undefined,
      createTimeRange: undefined,
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
    filters.state ||
    filters.showSn ||
    filters.createTimeRange
      ? filteredRecords.length
      : serverTotal;

  const openCreateDrawer = () => {
    drawerForm.setFieldsValue({
      name: '',
      state: 1,
      showSn: '1',
      remark: '',
    });
    setDrawerOpen(true);
  };

  const handleDrawerSubmit = async () => {
    try {
      await drawerForm.validateFields();
      message.info('添加模板抽屉已接好，保存接口等你确认后再补。');
      setDrawerOpen(false);
    } catch (error: any) {
      if (error?.errorFields) return;
    }
  };

  return (
    <div className="qr-template-page">
      <div className="content-card qr-template-filter-card">
        <div className="filter-grid">
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
            <span className="field-label">模板名称</span>
            <Input
              allowClear
              placeholder="请输入模板名称"
              value={draftFilters.name}
              onChange={(event) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  name: event.target.value,
                }));
              }}
              onPressEnter={handleSearch}
            />
          </div>

          <div className="field">
            <span className="field-label">创建时间</span>
            <RangePicker
              value={draftFilters.createTimeRange}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  createTimeRange: value || undefined,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">状态</span>
            <Select
              allowClear
              placeholder="请选择状态"
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
            <span className="field-label">显示编号</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.showSn}
              options={[
                { label: '显示', value: '1' },
                { label: '隐藏', value: '0' },
              ]}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  showSn: value,
                }));
              }}
            />
          </div>

          <div className="field actions">
            <Button type="primary" onClick={handleSearch}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </div>
        </div>
      </div>

      <div className="content-card qr-template-table-card">
        <div className="qr-template-toolbar">
          <Button
            type="primary"
            shape="round"
            icon={<PlusOutlined />}
            className="qr-template-add-btn"
            onClick={openCreateDrawer}
          >
            添加模板
          </Button>
          <div className="qr-template-toolbar-note">
            当前列表基于模板名称走远程分页，其他筛选按已返回记录过滤。
          </div>
        </div>

        <Table<QrCodeTemplateRecord>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredRecords}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: <Empty description="暂无二维码模板" />,
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

      <Drawer
        title="添加模板"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className="qr-template-drawer"
        footer={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleDrawerSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={drawerForm} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" maxLength={30} />
          </Form.Item>
          <Form.Item
            label="状态"
            name="state"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              placeholder="请选择状态"
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="显示编号"
            name="showSn"
            rules={[{ required: true, message: '请选择显示编号' }]}
          >
            <Select
              placeholder="请选择"
              options={[
                { label: '显示', value: '1' },
                { label: '隐藏', value: '0' },
              ]}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={4} placeholder="请输入备注" maxLength={200} />
          </Form.Item>
        </Form>
      </Drawer>

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

export default QrTemplateListPage;
