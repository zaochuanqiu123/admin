import { Alert, Button, DatePicker, Empty, Input, Modal, Select, Space, Switch, Table, message } from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getSpeakerChannelPageQuery,
  type SpeakerChannelRecord,
} from '@/api/speaker';
import { PageSectionSkeleton, PermissionButton, PermissionVisible } from '@/components';
import {
  SpeakerBrandModal,
  type SpeakerBrandFormValues,
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
  belongBrandName?: string;
  createTimeRange?: RangePickerProps['value'];
  state?: string;
  name: string;
  code: string;
};

function getBelongBrandName(record: SpeakerChannelRecord) {
  return (
    String(record?.belongBrandName || record?.brandName || '').trim() || '-'
  );
}

function getSortValue(record: SpeakerChannelRecord) {
  return Number(record?.sort ?? record?.sortNum ?? record?.orderNum ?? 0);
}

function buildLocalRecordFromForm(
  values: SpeakerBrandFormValues,
  currentRecord?: SpeakerChannelRecord,
): SpeakerChannelRecord {
  return {
    ...(currentRecord || {}),
    id: String(currentRecord?.id || Date.now()),
    belongBrandName: values.belongBrandName,
    name: values.name.trim(),
    code: values.code.trim(),
    config: String(values.config || '').trim(),
    sort: Number(values.sort || 0),
    state: values.state ? 1 : 0,
    createTime: currentRecord?.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
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
  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    belongBrandName: undefined,
    createTimeRange: undefined,
    state: undefined,
    name: '',
    code: '',
  });
  const [filters, setFilters] = useState<QueryFilters>({
    belongBrandName: undefined,
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

  const belongBrandOptions = useMemo(() => {
    const optionMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const value = getBelongBrandName(record);
      if (!value || value === '-') return;
      optionMap.set(value, { label: value, value });
    });
    return Array.from(optionMap.values());
  }, [records]);

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
      const nextError = '获取云音响品牌列表失败，请稍后重试';
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
      if (
        filters.belongBrandName &&
        getBelongBrandName(record) !== filters.belongBrandName
      ) {
        return false;
      }

      if (
        filters.createTimeRange &&
        filters.createTimeRange[0] &&
        filters.createTimeRange[1]
      ) {
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
  }, [filters.belongBrandName, filters.createTimeRange, records]);

  const filteredTotal =
    filters.belongBrandName || filters.createTimeRange
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
        title: '所属品牌',
        key: 'belongBrandName',
        width: 140,
        render: (_, record) => getBelongBrandName(record),
      },
      {
        title: '品牌名称',
        dataIndex: 'name',
        width: 200,
        render: (value) => value || '-',
      },
      {
        title: '品牌标识',
        dataIndex: 'code',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: '排序',
        key: 'sort',
        width: 100,
        render: (_, record) => getSortValue(record),
      },
      {
        title: '是否启用',
        dataIndex: 'state',
        width: 120,
        render: (value, record) => (
          <PermissionVisible
            perm={SPEAKER_BRAND_PERMS.updateState}
            fallback={<span>{Number(value) === 1 ? '启用' : '禁用'}</span>}
          >
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
                          updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        }
                      : item,
                  ),
                );
                message.info(
                  `状态切换为${checked ? '启用' : '禁用'}，后续再接真实接口。`,
                );
              }}
            />
          </PermissionVisible>
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
              <a
                onClick={() => {
                  setEditingRecord(record);
                  setBrandModalOpen(true);
                }}
              >
                编辑
              </a>
            </PermissionVisible>
            <PermissionVisible perm={SPEAKER_BRAND_PERMS.delete}>
              <a
                className="is-danger"
                onClick={() => {
                  Modal.confirm({
                    title: '确认删除该云音响品牌吗？',
                    okText: '确认',
                    cancelText: '取消',
                    onOk: () => {
                      setRecords((prev) =>
                        prev.filter((item) => String(item.id) !== String(record.id)),
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
    [],
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
      belongBrandName: undefined,
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

  const handleSave = async (values: SpeakerBrandFormValues) => {
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
      editingRecord ? '品牌已更新，保存接口后续再补。' : '品牌已添加，保存接口后续再补。',
    );
    setBrandModalOpen(false);
    setEditingRecord(undefined);
  };

  return (
    <div className="speaker-brand-page">
      <div className="content-card speaker-brand-filter-card">
        <div className="speaker-brand-filter-grid">
          <div className="field">
            <span className="field-label">所属品牌</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.belongBrandName}
              options={belongBrandOptions}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  belongBrandName: value,
                }));
              }}
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
            <span className="field-label">品牌名称</span>
            <Input
              allowClear
              placeholder="请输入品牌名称"
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
            <span className="field-label">品牌标识</span>
            <Input
              allowClear
              placeholder="请输入品牌标识"
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
            添加音响品牌
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
              emptyText: <Empty description="暂无云音响品牌数据" />,
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
        title={editingRecord ? '编辑音响品牌' : '添加音响品牌'}
        initialValues={editingRecord}
        belongBrandOptions={belongBrandOptions}
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
