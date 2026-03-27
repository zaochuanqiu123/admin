import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  Modal,
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
import {
  getSpeakerChannelDetail,
  getSpeakerChannelPageQuery,
  type SpeakerChannelRecord,
  updateSpeakerChannel,
} from '@/api/speaker';
import {
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

const { RangePicker } = DatePicker;
const DEFAULT_PAGE_SIZE = 10;
const SPEAKER_BRAND_PERMS = {
  add: 'device:admin:speakerChannel:add',
  update: 'device:admin:speakerChannel:update',
  updateState: 'device:admin:speakerChannel:updateState',
  delete: 'device:admin:speakerChannel:delete',
} as const;

type QueryFilters = {
  createTimeRange?: RangePickerProps['value'];
  state?: string;
  name: string;
  code: string;
};

function buildLocalRecordFromForm(
  values: SpeakerBrandFormValues,
  currentRecord?: SpeakerChannelRecord,
): SpeakerChannelRecord {
  return {
    ...(currentRecord || {}),
    id: String(currentRecord?.id || Date.now()),
    name: values.name.trim(),
    code: values.code.trim(),
    logo: String(values.logo || '').trim() || undefined,
    remark: String(values.remark || '').trim() || undefined,
    config: String(values.config || '').trim(),
    state: values.state ? 1 : 0,
    createTime:
      currentRecord?.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  };
}

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
    createTimeRange: undefined,
    state: undefined,
    name: '',
    code: '',
  });
  const [filters, setFilters] = useState<QueryFilters>({
    createTimeRange: undefined,
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

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.createTimeRange?.[0] && filters.createTimeRange[1]) {
        const createTime = dayjs(record?.createTime);
        if (!createTime.isValid()) return false;
        const start = filters.createTimeRange[0].startOf('day');
        const end = filters.createTimeRange[1].endOf('day');
        if (createTime.isBefore(start) || createTime.isAfter(end)) {
          return false;
        }
      }

      return true;
    });
  }, [filters.createTimeRange, records]);

  const filteredTotal = filters.createTimeRange
    ? filteredRecords.length
    : serverTotal;

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
        render: (value) => value || '-',
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 220,
        render: (value) => value || '-',
      },
      {
        title: '通道配置',
        dataIndex: 'config',
        width: 260,
        ellipsis: true,
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
      createTimeRange: undefined,
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

    const nextRecord = buildLocalRecordFromForm(values, editingRecord);
    setRecords((prev) => {
      const hasEditing = prev.some(
        (item) => String(item.id) === String(editingRecord?.id),
      );
      if (hasEditing) {
        return prev.map((item) =>
          String(item.id) === String(editingRecord?.id) ? nextRecord : item,
        );
      }
      return [nextRecord, ...prev];
    });
    if (!editingRecord) {
      setServerTotal((prev) => prev + 1);
    }
    message.success(
      editingRecord
        ? '通道已更新，保存接口后续再补。'
        : '通道已添加，保存接口后续再补。',
    );
    setBrandModalOpen(false);
    setEditingRecord(undefined);
  };

  return (
    <div className="speaker-brand-page">
      <div className="content-card speaker-brand-filter-card">
        <div className="speaker-brand-filter-grid">
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
            <span className="field-label">通道名称</span>
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
          </div>

          <div className="field">
            <span className="field-label">通道编码</span>
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
            dataSource={filteredRecords}
            scroll={{ x: 1280 }}
            locale={{
              emptyText: <Empty description="暂无音响通道数据" />,
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
