import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
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
import {
  getSpeakerListQuery,
  getSpeakerPageQuery,
  type SpeakerRecord,
} from '@/api/speaker';
import {
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { SpeakerImportModal } from './components/SpeakerImportModal';
import { SpeakerTransferModal } from './components/SpeakerTransferModal';
import {
  getBelongBrandName,
  getBindDisplayLines,
  getKeywordSource,
  getOrgDisplayLines,
  getQrCodeSn,
  getSpeakerBrandName,
  getSpeakerNameLines,
  getTrafficCardLines,
  isSpeakerBound,
  isSpeakerTransferred,
} from './helpers';
import './index.less';

const { RangePicker } = DatePicker;
const SPEAKER_PERMS = {
  add: 'device:admin:speaker:add',
  transfer: 'device:admin:speaker:transfer',
  updateState: 'device:admin:speaker:updateState',
  broadcast: 'device:admin:speaker:broadcast',
  unbind: 'device:admin:speaker:unbind',
} as const;

type QueryFilters = {
  belongBrand?: string;
  transferTimeRange?: RangePickerProps['value'];
  speakerBrand?: string;
  state?: string;
  isTransferred?: string;
  isBound?: string;
  sn: string;
  batchSn: string;
  qrcodeSn: string;
  keyword: string;
};

const DEFAULT_PAGE_SIZE = 10;

function renderMultiLines(lines: string[], secondaryStartIndex = 1) {
  const lineKeyCount = new Map<string, number>();

  return (
    <div className="speaker-lines">
      {lines.map((item, index) => {
        const duplicateCount = lineKeyCount.get(item) ?? 0;
        lineKeyCount.set(item, duplicateCount + 1);
        const itemKey =
          duplicateCount === 0 ? item : `${item}-${duplicateCount}`;

        return (
          <div
            key={itemKey}
            className={index >= secondaryStartIndex ? 'speaker-sub-text' : ''}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

function showPendingActionMessage(label: string) {
  message.info(`${label}接口暂未提供，当前先还原页面和交互结构。`);
}

const SpeakerListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [listMode, setListMode] = useState<'page' | 'list'>('page');
  const [records, setRecords] = useState<SpeakerRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    belongBrand: undefined,
    transferTimeRange: undefined,
    speakerBrand: undefined,
    state: undefined,
    isTransferred: undefined,
    isBound: undefined,
    sn: '',
    batchSn: '',
    qrcodeSn: '',
    keyword: '',
  });
  const [filters, setFilters] = useState<QueryFilters>({
    belongBrand: undefined,
    transferTimeRange: undefined,
    speakerBrand: undefined,
    state: undefined,
    isTransferred: undefined,
    isBound: undefined,
    sn: '',
    batchSn: '',
    qrcodeSn: '',
    keyword: '',
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

  const speakerBrandOptions = useMemo(() => {
    const optionMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const value = getSpeakerBrandName(record);
      if (!value || value === '-') return;
      optionMap.set(value, { label: value, value });
    });
    return Array.from(optionMap.values());
  }, [records]);

  const loadSpeakerPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);

    try {
      const res = await getSpeakerPageQuery({
        current,
        pageSize,
        sn: filters.sn.trim() || undefined,
        batchSn: filters.batchSn.trim() || undefined,
      });
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load speaker list failed:', error);
      const nextError = '获取云音响列表失败，请稍后重试';
      setListError(nextError);
      message.error(nextError);
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [current, filters.batchSn, filters.sn, pageSize]);

  const loadSpeakerList = useCallback(async (nextFilters: QueryFilters) => {
    setLoading(true);
    setListError(undefined);

    try {
      const list = await getSpeakerListQuery({
        sn: nextFilters.sn.trim() || undefined,
        batchSn: nextFilters.batchSn.trim() || undefined,
      });
      setRecords(Array.isArray(list) ? list : []);
      setServerTotal(Array.isArray(list) ? list.length : 0);
    } catch (error) {
      console.error('load speaker search list failed:', error);
      const nextError = '搜索云音响失败，请稍后重试';
      setListError(nextError);
      message.error(nextError);
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (listMode !== 'page') return;
    void loadSpeakerPage();
  }, [listMode, loadSpeakerPage]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (
        filters.belongBrand &&
        getBelongBrandName(record) !== filters.belongBrand
      ) {
        return false;
      }

      if (
        filters.speakerBrand &&
        getSpeakerBrandName(record) !== filters.speakerBrand
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
          String(Number(isSpeakerTransferred(record))) !==
          String(filters.isTransferred)
        ) {
          return false;
        }
      }

      if (filters.isBound !== undefined && filters.isBound !== '') {
        if (
          String(Number(isSpeakerBound(record))) !== String(filters.isBound)
        ) {
          return false;
        }
      }

      if (filters.transferTimeRange?.[0] && filters.transferTimeRange[1]) {
        const transferTime = dayjs(record?.transferTime);
        if (!transferTime.isValid()) return false;
        const start = filters.transferTimeRange[0].startOf('day');
        const end = filters.transferTimeRange[1].endOf('day');
        if (transferTime.isBefore(start) || transferTime.isAfter(end)) {
          return false;
        }
      }

      if (
        filters.qrcodeSn &&
        !String(getQrCodeSn(record)).includes(filters.qrcodeSn)
      ) {
        return false;
      }

      const keyword = filters.keyword.trim();
      if (keyword && !getKeywordSource(record).includes(keyword)) {
        return false;
      }

      return true;
    });
  }, [
    filters.belongBrand,
    filters.isBound,
    filters.isTransferred,
    filters.keyword,
    filters.qrcodeSn,
    filters.speakerBrand,
    filters.state,
    filters.transferTimeRange,
    records,
  ]);

  const columns = useMemo<ColumnsType<SpeakerRecord>>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 90,
        render: (value) => value || '-',
      },
      {
        title: '所属品牌',
        key: 'belongBrand',
        width: 120,
        render: (_, record) => getBelongBrandName(record),
      },
      {
        title: '编号',
        dataIndex: 'sn',
        width: 180,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '批次号',
        dataIndex: 'batchSn',
        width: 120,
        render: (value) => value || '-',
      },
      {
        title: '收款码',
        key: 'qrcodeSn',
        width: 150,
        render: (_, record) => getQrCodeSn(record),
      },
      {
        title: '名称/配置/型号',
        key: 'speakerMeta',
        width: 170,
        render: (_, record) => renderMultiLines(getSpeakerNameLines(record)),
      },
      {
        title: '品牌',
        key: 'speakerBrand',
        width: 120,
        render: (_, record) => getSpeakerBrandName(record),
      },
      {
        title: '机构',
        key: 'orgInfo',
        width: 180,
        render: (_, record) => renderMultiLines(getOrgDisplayLines(record)),
      },
      {
        title: '绑定商户',
        key: 'bindInfo',
        width: 240,
        render: (_, record) => renderMultiLines(getBindDisplayLines(record)),
      },
      {
        title: '流量卡',
        key: 'trafficCard',
        width: 220,
        render: (_, record) => renderMultiLines(getTrafficCardLines(record)),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 180,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '是否启用',
        dataIndex: 'state',
        width: 120,
        render: (value, record) => (
          <PermissionVisible
            perm={SPEAKER_PERMS.updateState}
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
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <div className="speaker-action-links">
            <PermissionVisible perm={SPEAKER_PERMS.broadcast}>
              <a
                onClick={() => {
                  showPendingActionMessage('播报测试');
                }}
              >
                播报测试
              </a>
            </PermissionVisible>
            {isSpeakerBound(record) ? (
              <PermissionVisible perm={SPEAKER_PERMS.unbind}>
                <a
                  onClick={() => {
                    showPendingActionMessage('解绑');
                  }}
                >
                  解绑
                </a>
              </PermissionVisible>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  const handleSearch = () => {
    const nextFilters = {
      ...draftFilters,
      sn: draftFilters.sn.trim(),
      batchSn: draftFilters.batchSn.trim(),
      qrcodeSn: draftFilters.qrcodeSn.trim(),
      keyword: draftFilters.keyword.trim(),
    };
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
    setFilters(nextFilters);
    setListMode('list');
    void loadSpeakerList(nextFilters);
  };

  const handleReset = () => {
    const nextFilters: QueryFilters = {
      belongBrand: undefined,
      transferTimeRange: undefined,
      speakerBrand: undefined,
      state: undefined,
      isTransferred: undefined,
      isBound: undefined,
      sn: '',
      batchSn: '',
      qrcodeSn: '',
      keyword: '',
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setListMode('page');
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const filteredRecordsForRender =
    listMode === 'list'
      ? filteredRecords.slice(
          ((pagination.current || 1) - 1) *
            (pagination.pageSize || DEFAULT_PAGE_SIZE),
          (pagination.current || 1) *
            (pagination.pageSize || DEFAULT_PAGE_SIZE),
        )
      : filteredRecords;

  const filteredTotal =
    filters.belongBrand ||
    filters.transferTimeRange ||
    filters.speakerBrand ||
    filters.state ||
    filters.isTransferred ||
    filters.isBound ||
    filters.qrcodeSn ||
    filters.keyword
      ? filteredRecords.length
      : serverTotal;
  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return (
    <div className="speaker-page">
      <div className="content-card speaker-filter-card">
        <div className="speaker-filter-grid">
          <div className="field">
            <span className="field-label">所属品牌</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.belongBrand}
              options={belongBrandOptions}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  belongBrand: value,
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
            <span className="field-label">音响品牌</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.speakerBrand}
              options={speakerBrandOptions}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  speakerBrand: value,
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
            <span className="field-label">收款码</span>
            <Input
              allowClear
              placeholder="请输入收款码"
              value={draftFilters.qrcodeSn}
              onChange={(event) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  qrcodeSn: event.target.value,
                }));
              }}
              onPressEnter={handleSearch}
            />
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
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>
        </div>
      </div>

      <div className="content-card speaker-table-card">
        <div className="speaker-toolbar">
          <Space wrap size={12}>
            <PermissionButton
              perm={SPEAKER_PERMS.add}
              type="primary"
              icon={<PlusOutlined />}
              className="speaker-primary-action-btn"
              onClick={() => {
                setImportModalOpen(true);
              }}
            >
              入库
            </PermissionButton>
            <PermissionButton
              perm={SPEAKER_PERMS.transfer}
              type="primary"
              className="speaker-primary-action-btn"
              onClick={() => {
                setTransferModalOpen(true);
              }}
            >
              划拨/回调
            </PermissionButton>
          </Space>

          <div className="speaker-toolbar-note">
            默认分页走 `/api/device/admin/speaker/page`，顶部搜索和弹窗搜索都走
            `/api/device/admin/speaker/list`，其余提交动作待接口补齐。
          </div>
        </div>

        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<SpeakerRecord>
            rowKey="id"
            loading={refreshingList}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns}
            dataSource={filteredRecordsForRender}
            scroll={{ x: 1960 }}
            locale={{
              emptyText: <Empty description="暂无云音响数据" />,
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

      <SpeakerTransferModal
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        selectedRecords={records.filter((item) =>
          selectedRowKeys.includes(item.id),
        )}
        onOk={async (values) => {
          console.log('speaker transfer values:', values);
          message.info('划拨/回调接口待补充，当前先保留弹窗与搜索交互。');
          setTransferModalOpen(false);
          setSelectedRowKeys([]);
        }}
      />

      <SpeakerImportModal
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        belongBrandOptions={belongBrandOptions}
        speakerBrandOptions={speakerBrandOptions}
        onDownloadTemplate={() => {
          message.info('Excel 模板文件待补充，当前先保留下载入口。');
        }}
        onOk={async (values) => {
          console.log('speaker import values:', values);
          message.info('音响入库接口待补充，当前先保留表单和文件上传结构。');
          setImportModalOpen(false);
        }}
      />
    </div>
  );
};

export default SpeakerListPage;
