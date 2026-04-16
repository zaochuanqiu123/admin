import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CloudStorageConfigRecord,
  deleteCloudStorageConfig,
  getCloudStorageConfigDetail,
  getCloudStorageConfigPage,
  getStorageUploadSettingDetail,
  type StorageUploadSettingDetail,
  saveCloudStorageConfig,
  saveStorageUploadSetting,
  updateCloudStorageConfigStatus,
} from '@/api/cloudStorage';
import { ExpandableFilterCard, PageSectionSkeleton } from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;
const ALIYUN_PROVIDER = 'ALIYUN_OSS';

type UploadSettingFormValues = {
  maxImageSizeMb?: number | null;
  maxVideoSizeMb?: number | null;
  maxDocumentSizeMb?: number | null;
  maxOtherFileSizeMb?: number | null;
};

type CloudStorageFilters = {
  name: string;
};

type CloudStorageFormValues = {
  name: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  stsRoleArn?: string;
  cdnDomain?: string;
  uploadPrefix?: string;
  isPublicRead?: boolean;
  statusEnabled?: boolean;
  remark?: string;
};

function normalizeText(value?: string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function normalizeLimitValue(value?: number | null) {
  if (value === undefined || value === null) return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function getProviderText(value?: string) {
  if (value === ALIYUN_PROVIDER) return '阿里云';
  return normalizeText(value) || '-';
}

function isPublicRead(value?: boolean) {
  return value === true;
}

function isEnabledStatus(status?: string) {
  const value = String(status || '')
    .trim()
    .toUpperCase();
  if (!value) return true;
  return ['1', 'TRUE', 'ENABLE', 'ENABLED', 'OPEN', 'ON', 'ACTIVE'].includes(
    value,
  );
}

function buildStatusValue(
  enabled: boolean | undefined,
  currentStatus?: string,
) {
  const currentValue = normalizeText(currentStatus);
  if (enabled) {
    return currentValue && isEnabledStatus(currentValue)
      ? currentValue
      : 'ENABLE';
  }
  return currentValue && !isEnabledStatus(currentValue)
    ? currentValue
    : 'DISABLE';
}

function parseEnabledValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return isEnabledStatus(text);
}

function getRecordStatusEnabled(record?: Partial<CloudStorageConfigRecord>) {
  return parseEnabledValue(record?.state) ?? true;
}

const BasicConfigTab: React.FC = () => {
  const [form] = Form.useForm<UploadSettingFormValues>();
  const [detail, setDetail] = useState<StorageUploadSettingDetail>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const res = await getStorageUploadSettingDetail({
        skipErrorHandler: true,
      });
      setDetail(res || {});
      form.setFieldsValue({
        maxImageSizeMb: res?.maxImageSizeMb ?? null,
        maxVideoSizeMb: res?.maxVideoSizeMb ?? null,
        maxDocumentSizeMb: res?.maxDocumentSizeMb ?? null,
        maxOtherFileSizeMb: res?.maxOtherFileSizeMb ?? null,
      });
    } catch (error) {
      console.error('load storage upload setting failed:', error);
      setLoadError(getErrorMessage(error, '获取上传策略失败'));
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleSave = async (values: UploadSettingFormValues) => {
    setSaving(true);
    try {
      const res = await saveStorageUploadSetting(
        {
          id: detail?.id,
          maxImageSizeMb: normalizeLimitValue(values.maxImageSizeMb),
          maxVideoSizeMb: normalizeLimitValue(values.maxVideoSizeMb),
          maxDocumentSizeMb: normalizeLimitValue(values.maxDocumentSizeMb),
          maxOtherFileSizeMb: normalizeLimitValue(values.maxOtherFileSizeMb),
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(getApiMessage(res, '保存成功'));
      await loadDetail();
    } catch (error) {
      console.error('save storage upload setting failed:', error);
      message.error(getErrorMessage(error, '保存上传策略失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="storage-config-basic">
      <Alert
        type="info"
        showIcon={false}
        className="storage-config-tip"
        message="使用说明"
        description={
          <div className="storage-config-tip-content">
            <div>上传策略用于限制不同类型附件的上传大小。</div>
            <div>单位为 MB，留空时按后端默认策略处理。</div>
          </div>
        }
      />

      {loading ? (
        <PageSectionSkeleton rows={4} />
      ) : loadError ? (
        <Alert type="error" showIcon message={loadError} />
      ) : (
        <Form
          form={form}
          layout="vertical"
          className="storage-upload-setting-form"
          onFinish={handleSave}
        >
          <div className="storage-upload-setting-grid">
            <Form.Item label="单图上限" name="maxImageSizeMb">
              <InputNumber min={0} precision={0} addonAfter="MB" />
            </Form.Item>
            <Form.Item label="单视频上限" name="maxVideoSizeMb">
              <InputNumber min={0} precision={0} addonAfter="MB" />
            </Form.Item>
            <Form.Item label="单文档上限" name="maxDocumentSizeMb">
              <InputNumber min={0} precision={0} addonAfter="MB" />
            </Form.Item>
            <Form.Item label="其它类型上限" name="maxOtherFileSizeMb">
              <InputNumber min={0} precision={0} addonAfter="MB" />
            </Form.Item>
          </div>
          <Form.Item className="storage-config-save-row">
            <Button type="primary" htmlType="submit" loading={saving}>
              保存
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
};

type CloudStorageModalProps = {
  open: boolean;
  initialValues?: CloudStorageConfigRecord;
  onCancel: () => void;
  onOk: (values: CloudStorageFormValues) => Promise<void>;
};

const CloudStorageModal: React.FC<CloudStorageModalProps> = ({
  open,
  initialValues,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm<CloudStorageFormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      name: initialValues?.name || '',
      endpoint: initialValues?.endpoint || '',
      region: initialValues?.region || '',
      bucket: initialValues?.bucket || '',
      accessKeyId: initialValues?.accessKeyId || '',
      accessKeySecret: initialValues?.accessKeySecret || '',
      stsRoleArn: initialValues?.stsRoleArn || '',
      cdnDomain: initialValues?.cdnDomain || '',
      uploadPrefix: initialValues?.uploadPrefix || '',
      isPublicRead: isPublicRead(initialValues?.isPublicRead),
      statusEnabled: getRecordStatusEnabled(initialValues),
    });
  }, [form, initialValues, open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await onOk(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? '修改阿里云存储' : '添加阿里云存储'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      destroyOnClose
      width={860}
    >
      <Form form={form} layout="vertical" className="cloud-storage-form">
        <div className="cloud-storage-form-grid">
          <Form.Item label="云厂商">
            <Select
              disabled
              value={ALIYUN_PROVIDER}
              options={[{ label: '阿里云', value: ALIYUN_PROVIDER }]}
            />
          </Form.Item>
          <Form.Item
            label="配置名称"
            name="name"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input allowClear placeholder="请输入配置名称" />
          </Form.Item>
          <Form.Item label="Endpoint" name="endpoint">
            <Input allowClear placeholder="请输入 Endpoint" />
          </Form.Item>
          <Form.Item label="区域" name="region">
            <Input allowClear placeholder="请输入区域" />
          </Form.Item>
          <Form.Item label="Bucket" name="bucket">
            <Input allowClear placeholder="请输入 Bucket" />
          </Form.Item>
          <Form.Item
            label="AccessKeyId"
            name="accessKeyId"
            rules={[{ required: true, message: '请输入 AccessKeyId' }]}
          >
            <Input allowClear placeholder="请输入 AccessKeyId" />
          </Form.Item>
          <Form.Item
            label="AccessKeySecret"
            name="accessKeySecret"
            rules={[{ required: true, message: '请输入 AccessKeySecret' }]}
          >
            <Input.Password allowClear placeholder="请输入 AccessKeySecret" />
          </Form.Item>
          <Form.Item label="STS RoleArn" name="stsRoleArn">
            <Input allowClear placeholder="请输入 STS RoleArn" />
          </Form.Item>
          <Form.Item label="CDN 域名" name="cdnDomain">
            <Input allowClear placeholder="请输入 CDN 域名" />
          </Form.Item>
          <Form.Item label="上传前缀" name="uploadPrefix">
            <Input allowClear placeholder="请输入上传前缀" />
          </Form.Item>
          <Form.Item
            label="是否公共读"
            name="isPublicRead"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item label="状态" name="statusEnabled" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

const AliyunStorageTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<CloudStorageConfigRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<CloudStorageConfigRecord>();
  const [detailLoadingId, setDetailLoadingId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [switchLoadingId, setSwitchLoadingId] = useState<string>();
  const [draftFilters, setDraftFilters] = useState<CloudStorageFilters>({
    name: '',
  });
  const [filters, setFilters] = useState<CloudStorageFilters>({
    name: '',
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);
    try {
      const res = await getCloudStorageConfigPage(
        {
          current,
          pageSize,
          name: normalizeText(filters.name),
          provider: ALIYUN_PROVIDER,
        },
        {
          skipErrorHandler: true,
        },
      );
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load cloud storage config page failed:', error);
      setListError(getErrorMessage(error, '获取阿里云存储列表失败'));
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [current, filters.name, pageSize]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const handleSearch = () => {
    setFilters({
      name: draftFilters.name.trim(),
    });
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleReset = () => {
    const nextFilters = {
      name: '',
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleSave = async (values: CloudStorageFormValues) => {
    try {
      const res = await saveCloudStorageConfig(
        {
          id: editingRecord?.id,
          ownerType: editingRecord?.ownerType,
          ownerId: editingRecord?.ownerId,
          provider: ALIYUN_PROVIDER,
          name: values.name.trim(),
          endpoint: normalizeText(values.endpoint),
          region: normalizeText(values.region),
          bucket: normalizeText(values.bucket),
          accessKeyId: normalizeText(values.accessKeyId),
          accessKeySecret: normalizeText(values.accessKeySecret),
          stsRoleArn: normalizeText(values.stsRoleArn),
          cdnDomain: normalizeText(values.cdnDomain),
          uploadPrefix: normalizeText(values.uploadPrefix),
          isPublicRead: values.isPublicRead === true,
          state: values.statusEnabled === true,
          status: buildStatusValue(values.statusEnabled, editingRecord?.status),
          remark: normalizeText(values.remark ?? editingRecord?.remark),
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(
        getApiMessage(res, editingRecord ? '修改成功' : '添加成功'),
      );
      setModalOpen(false);
      setEditingRecord(undefined);
      await loadPage();
    } catch (error) {
      console.error('save cloud storage config failed:', error);
      message.error(
        getErrorMessage(
          error,
          editingRecord ? '修改阿里云存储失败' : '添加阿里云存储失败',
        ),
      );
    }
  };

  const handleOpenEdit = useCallback(
    async (record: CloudStorageConfigRecord) => {
      const id = normalizeText(record.id);
      if (!id) {
        message.warning('缺少配置ID，无法修改');
        return;
      }

      setDetailLoadingId(id);
      try {
        const detail = await getCloudStorageConfigDetail(id, {
          skipErrorHandler: true,
        });
        setEditingRecord({
          ...record,
          ...detail,
        });
        setModalOpen(true);
      } catch (error) {
        console.error('open cloud storage edit failed:', error);
        message.error(getErrorMessage(error, '获取阿里云存储详情失败'));
      } finally {
        setDetailLoadingId(undefined);
      }
    },
    [],
  );

  const handleDelete = async (record: CloudStorageConfigRecord) => {
    const id = normalizeText(record.id);
    if (!id) {
      message.warning('缺少配置ID，无法删除');
      return;
    }
    setDeletingId(id);
    try {
      const res = await deleteCloudStorageConfig(id, {
        skipErrorHandler: true,
      });
      message.success(getApiMessage(res, '删除成功'));
      await loadPage();
    } catch (error) {
      console.error('delete cloud storage config failed:', error);
      message.error(getErrorMessage(error, '删除阿里云存储失败'));
    } finally {
      setDeletingId(undefined);
    }
  };

  const handleToggleStatus = useCallback(
    async (record: CloudStorageConfigRecord, checked: boolean) => {
      const id = normalizeText(record.id);
      if (!id) {
        message.warning('缺少配置信息，无法更新状态');
        return;
      }

      setSwitchLoadingId(id);
      try {
        const res = await updateCloudStorageConfigStatus(id, {
          skipErrorHandler: true,
        });
        setRecords((prev) =>
          prev.map((item) =>
            String(item.id || '') === id
              ? {
                  ...item,
                  state: checked,
                }
              : item,
          ),
        );
        message.success(getApiMessage(res, checked ? '启用成功' : '停用成功'));
      } catch (error) {
        console.error('toggle cloud storage status failed:', error);
        message.error(
          getErrorMessage(
            error,
            checked ? '启用阿里云存储失败' : '停用阿里云存储失败',
          ),
        );
      } finally {
        setSwitchLoadingId(undefined);
      }
    },
    [],
  );

  const columns = useMemo<ColumnsType<CloudStorageConfigRecord>>(
    () => [
      {
        title: '配置名称',
        dataIndex: 'name',
        width: 180,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '云厂商',
        dataIndex: 'provider',
        width: 140,
        render: (value) => getProviderText(value),
      },
      {
        title: '是否公共读',
        dataIndex: 'isPublicRead',
        width: 130,
        render: (value) => (value ? <Tag color="blue">是</Tag> : <Tag>否</Tag>),
      },
      {
        title: '状态',
        dataIndex: 'state',
        width: 130,
        render: (_, record) => (
          <Switch
            checked={getRecordStatusEnabled(record)}
            loading={switchLoadingId === String(record.id || '')}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(checked) => {
              void handleToggleStatus(record, checked);
            }}
          />
        ),
      },
      {
        title: '归属类型',
        dataIndex: 'ownerType',
        width: 150,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '操作',
        key: 'action',
        width: 130,
        fixed: 'right',
        render: (_, record) => (
          <Space size={8} className="cloud-storage-action-links">
            <Button
              type="link"
              size="small"
              loading={detailLoadingId === String(record.id || '')}
              onClick={() => {
                void handleOpenEdit(record);
              }}
            >
              修改
            </Button>
            <Popconfirm
              title="确认删除该阿里云存储配置吗？"
              okText="确认"
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button
                type="link"
                size="small"
                danger
                loading={deletingId === String(record.id || '')}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [
      deletingId,
      detailLoadingId,
      handleOpenEdit,
      handleToggleStatus,
      switchLoadingId,
    ],
  );

  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return (
    <div className="cloud-storage-list">
      <ExpandableFilterCard
        className="cloud-storage-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={[
          {
            key: 'name',
            label: '配置名称',
            content: (
              <Input
                allowClear
                placeholder="请输入配置名称"
                value={draftFilters.name}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
        ]}
      />

      <div className="content-card cloud-storage-table-card">
        <div className="cloud-storage-toolbar">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="cloud-storage-primary-action-btn"
            onClick={() => {
              setEditingRecord(undefined);
              setModalOpen(true);
            }}
          >
            添加阿里云存储
          </Button>
        </div>

        {initialListLoading ? (
          <PageSectionSkeleton rows={6} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<CloudStorageConfigRecord>
            rowKey={(record) =>
              String(record.id || `${record.provider}-${record.name}`)
            }
            loading={refreshingList}
            columns={columns}
            dataSource={records}
            scroll={{ x: 980 }}
            locale={{
              emptyText: <Empty description="暂无阿里云存储配置" />,
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

      <CloudStorageModal
        open={modalOpen}
        initialValues={editingRecord}
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(undefined);
        }}
        onOk={handleSave}
      />
    </div>
  );
};

const StorageConfigPage: React.FC = () => {
  return (
    <div className="storage-config-page">
      <div className="content-card storage-config-card">
        <Tabs
          defaultActiveKey="basic"
          items={[
            {
              key: 'basic',
              label: '基础配置',
              children: <BasicConfigTab />,
            },
            {
              key: 'aliyun',
              label: '阿里云存储',
              children: <AliyunStorageTab />,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default StorageConfigPage;
