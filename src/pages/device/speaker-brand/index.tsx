import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  message,
  Select,
  Switch,
  Table,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addSpeakerChannel,
  getSpeakerChannelDetail,
  getSpeakerChannelPageQuery,
  type SpeakerChannelRecord,
  updateSpeakerChannel,
} from '@/api/speaker';
import {
  ExpandableFilterCard,
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import {
  type SpeakerBrandFormValues,
  SpeakerBrandModal,
} from './components/SpeakerBrandModal';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;
const SPEAKER_BRAND_PERMS = {
  add: 'admin:device:speakerChannel:add',
  update: 'admin:device:speakerChannel:update',
  updateState: 'admin:device:speakerChannel:updateState',
  delete: 'admin:device:speakerChannel:delete',
} as const;

function readText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) {
      return text;
    }
  }
  return '';
}

function getSpeakerChannelLogoUrl(record: SpeakerChannelRecord) {
  const logo = String(record?.logo || '').trim();
  return readText(
    record?.logoUrl,
    record?.logoImageUrl,
    record?.logoAttachmentUrl,
    record?.logoAttachment?.url,
    record?.attachment?.url,
    /^https?:\/\//i.test(logo) ? logo : '',
  );
}

type QueryFilters = {
  state?: string;
  name: string;
  code: string;
};

const SpeakerBrandPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<SpeakerChannelRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SpeakerChannelRecord>();
  const [detailLoadingId, setDetailLoadingId] = useState<string>();
  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    state: undefined,
    name: '',
    code: '',
  });
  const [filters, setFilters] = useState<QueryFilters>({
    state: undefined,
    name: '',
    code: '',
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = pagination.current || 1;
  const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;

  const loadBrandPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);

    try {
      const res = await getSpeakerChannelPageQuery({
        current,
        pageSize,
        name: filters.name.trim() || undefined,
        code: filters.code.trim() || undefined,
        state:
          filters.state === undefined || filters.state === ''
            ? undefined
            : Number(filters.state),
      });
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load speaker brand list failed:', error);
      const nextError = '获取音响通道列表失败，请稍后重试';
      setListError(nextError);
      message.error(nextError);
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [current, filters.code, filters.name, filters.state, pageSize]);

  useEffect(() => {
    void loadBrandPage();
  }, [loadBrandPage]);

  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  const columns = useMemo<ColumnsType<SpeakerChannelRecord>>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 80,
        render: (value) => value || '-',
      },
      {
        title: '通道名称',
        dataIndex: 'name',
        width: 200,
        render: (value) => value || '-',
      },
      {
        title: '通道编码',
        dataIndex: 'code',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: 'LOGO',
        dataIndex: 'logo',
        width: 180,
        render: (_, record) => {
          const logoUrl = getSpeakerChannelLogoUrl(record);
          return logoUrl ? (
            <img
              src={logoUrl}
              alt="通道LOGO"
              className="speaker-brand-logo-image"
            />
          ) : (
            '-'
          );
        },
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 220,
        render: (value) => value || '-',
      },
      {
        title: '是否启用',
        dataIndex: 'state',
        width: 120,
        render: (value) => (
          <Switch
            checked={Number(value) === 1}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            disabled
          />
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
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <div className="speaker-brand-action-links">
            <PermissionVisible perm={SPEAKER_BRAND_PERMS.update}>
              <Button
                type="link"
                size="small"
                loading={detailLoadingId === String(record.id)}
                onClick={() => {
                  void handleOpenEdit(record);
                }}
              >
                修改
              </Button>
            </PermissionVisible>
            <PermissionVisible perm={SPEAKER_BRAND_PERMS.delete}>
              <a
                className="is-danger"
                onClick={() => {
                  Modal.confirm({
                    title: '确认删除该音响通道吗？',
                    okText: '确认',
                    cancelText: '取消',
                    onOk: () => {
                      setRecords((prev) =>
                        prev.filter(
                          (item) => String(item.id) !== String(record.id),
                        ),
                      );
                      setServerTotal((prev) => Math.max(prev - 1, 0));
                      message.success('已删除，删除接口后续再补。');
                    },
                  });
                }}
              >
                删除
              </a>
            </PermissionVisible>
          </div>
        ),
      },
    ],
    [detailLoadingId, handleOpenEdit],
  );

  const handleSearch = () => {
    const nextFilters = {
      ...draftFilters,
      name: draftFilters.name.trim(),
      code: draftFilters.code.trim(),
    };
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleReset = () => {
    const nextFilters: QueryFilters = {
      state: undefined,
      name: '',
      code: '',
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  async function handleOpenEdit(record: SpeakerChannelRecord) {
    if (!record?.id) {
      message.warning('缺少通道ID，无法修改');
      return;
    }

    const recordId = String(record.id);
    setDetailLoadingId(recordId);
    try {
      const detail = await getSpeakerChannelDetail(recordId, {
        skipErrorHandler: true,
      });
      setEditingRecord({
        ...record,
        ...detail,
      });
      setBrandModalOpen(true);
    } catch (error) {
      console.error('open speaker channel edit failed:', error);
      message.error(getErrorMessage(error, '获取音响通道详情失败'));
    } finally {
      setDetailLoadingId(undefined);
    }
  }

  const handleSave = async (values: SpeakerBrandFormValues) => {
    if (editingRecord?.id) {
      try {
        const res = await updateSpeakerChannel(
          {
            id: String(editingRecord.id),
            name: values.name.trim(),
            code: values.code.trim(),
            logo: String(values.logo || '').trim() || undefined,
            remark: String(values.remark || '').trim() || undefined,
            config: String(values.config || '').trim(),
            state: values.state ? 1 : 0,
          },
          {
            skipErrorHandler: true,
          },
        );
        message.success(getApiMessage(res, '修改成功'));
        setBrandModalOpen(false);
        setEditingRecord(undefined);
        await loadBrandPage();
      } catch (error) {
        console.error('update speaker channel failed:', error);
        message.error(getErrorMessage(error, '修改音响通道失败'));
      }
      return;
    }

    try {
      const res = await addSpeakerChannel(
        {
          name: values.name.trim(),
          code: values.code.trim(),
          logo: String(values.logo || '').trim() || undefined,
          remark: String(values.remark || '').trim() || undefined,
          config: String(values.config || '').trim(),
          state: values.state ? 1 : 0,
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(getApiMessage(res, '添加成功'));
      setBrandModalOpen(false);
      setEditingRecord(undefined);
      if (current === 1) {
        await loadBrandPage();
      } else {
        setPagination((prev) => ({
          ...prev,
          current: 1,
        }));
      }
    } catch (error) {
      console.error('add speaker channel failed:', error);
      message.error(getErrorMessage(error, '添加音响通道失败'));
    }
  };

  return (
    <div className="speaker-brand-page">
      <ExpandableFilterCard
        className="speaker-brand-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={[
          {
            key: 'state',
            label: '状态',
            content: (
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
            ),
          },
          {
            key: 'name',
            label: '通道名称',
            content: (
              <Input
                allowClear
                placeholder="请输入通道名称"
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
          {
            key: 'code',
            label: '通道编码',
            content: (
              <Input
                allowClear
                placeholder="请输入通道编码"
                value={draftFilters.code}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    code: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
        ]}
      />

      <div className="content-card speaker-brand-table-card">
        <div className="speaker-brand-toolbar">
          <PermissionButton
            perm={SPEAKER_BRAND_PERMS.add}
            type="primary"
            className="speaker-brand-primary-action-btn"
            onClick={() => {
              setEditingRecord(undefined);
              setBrandModalOpen(true);
            }}
          >
            添加音响通道
          </PermissionButton>
        </div>

        {initialListLoading ? (
          <PageSectionSkeleton rows={6} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<SpeakerChannelRecord>
            rowKey="id"
            loading={refreshingList}
            columns={columns}
            dataSource={records}
            scroll={{ x: 1280 }}
            locale={{
              emptyText: <Empty description="暂无音响通道数据" />,
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

      <SpeakerBrandModal
        open={brandModalOpen}
        title={editingRecord ? '修改音响通道' : '添加音响通道'}
        initialValues={editingRecord}
        onCancel={() => {
          setBrandModalOpen(false);
          setEditingRecord(undefined);
        }}
        onOk={handleSave}
      />
    </div>
  );
};

export default SpeakerBrandPage;
