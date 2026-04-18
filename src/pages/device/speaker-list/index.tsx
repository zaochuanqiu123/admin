import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  message,
  Space,
  Switch,
  Table,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  broadcastSpeaker,
  getSpeakerPageQuery,
  type SpeakerRecord,
  transferSpeaker,
} from '@/api/speaker';
import {
  ExpandableFilterCard,
  OrganizationPickerInput,
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { SpeakerImportModal } from './components/SpeakerImportModal';
import { SpeakerTransferModal } from './components/SpeakerTransferModal';
import {
  getBelongBrandName,
  getBindDisplayLines,
  getOrgDisplayLines,
  getQrCodeSn,
  getSpeakerBrandName,
  getSpeakerNameLines,
  getTrafficCardLines,
  isSpeakerBound,
} from './helpers';
import './index.less';

const SPEAKER_PERMS = {
  add: 'admin:device:speaker:add',
  transfer: 'admin:device:speaker:transfer',
  updateState: 'admin:device:speaker:updateState',
  broadcast: 'admin:device:speaker:broadcast',
  unbind: 'admin:device:speaker:unbind',
} as const;

type QueryFilters = {
  agentOrgId: string;
  groupOrgId: string;
  merchantOrgId: string;
  storeOrgId: string;
  sn: string;
  batchSn: string;
  speakerChannelId: string;
  speakerChannelCode: string;
  model: string;
  bindName: string;
  snList: string;
  startSn: string;
  endSn: string;
};

const DEFAULT_PAGE_SIZE = 10;

function createEmptyFilters(): QueryFilters {
  return {
    agentOrgId: '',
    groupOrgId: '',
    merchantOrgId: '',
    storeOrgId: '',
    sn: '',
    batchSn: '',
    speakerChannelId: '',
    speakerChannelCode: '',
    model: '',
    bindName: '',
    snList: '',
    startSn: '',
    endSn: '',
  };
}

function parseSnList(value: string) {
  return value
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildRandomBroadcastContent() {
  return `播报测试-${dayjs().format('YYYYMMDDHHmmss')}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

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
  const [records, setRecords] = useState<SpeakerRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [broadcastingId, setBroadcastingId] = useState<string>();
  const [draftFilters, setDraftFilters] =
    useState<QueryFilters>(createEmptyFilters);
  const [filters, setFilters] = useState<QueryFilters>(createEmptyFilters);
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
      const snList = parseSnList(filters.snList);
      const res = await getSpeakerPageQuery({
        current,
        pageSize,
        agentOrgId: filters.agentOrgId.trim() || undefined,
        groupOrgId: filters.groupOrgId.trim() || undefined,
        merchantOrgId: filters.merchantOrgId.trim() || undefined,
        storeOrgId: filters.storeOrgId.trim() || undefined,
        sn: filters.sn.trim() || undefined,
        batchSn: filters.batchSn.trim() || undefined,
        speakerChannelId: filters.speakerChannelId.trim() || undefined,
        speakerChannelCode: filters.speakerChannelCode.trim() || undefined,
        model: filters.model.trim() || undefined,
        bindName: filters.bindName.trim() || undefined,
        snList: snList.length > 0 ? snList : undefined,
        startSn: filters.startSn.trim() || undefined,
        endSn: filters.endSn.trim() || undefined,
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
  }, [
    current,
    filters.agentOrgId,
    filters.batchSn,
    filters.bindName,
    filters.endSn,
    filters.groupOrgId,
    filters.merchantOrgId,
    filters.model,
    filters.sn,
    filters.snList,
    filters.speakerChannelCode,
    filters.speakerChannelId,
    filters.startSn,
    filters.storeOrgId,
    pageSize,
  ]);

  useEffect(() => {
    void loadSpeakerPage();
  }, [loadSpeakerPage]);

  const handleBroadcast = useCallback(async (record: SpeakerRecord) => {
    const speakerSn = String(record?.sn || '').trim();
    const qrcodeSn = String(
      record?.qrcodeSn || record?.qrcode?.qrcodeSn || '',
    ).trim();

    if (!speakerSn) {
      message.warning('缺少音箱编号，无法播报测试');
      return;
    }

    const content = buildRandomBroadcastContent();

    Modal.confirm({
      title: '确认播报测试',
      content: (
        <div>
          <div>音箱编号：{speakerSn}</div>
          <div>二维码编号：{qrcodeSn}</div>
          <div>播报内容：{content}</div>
        </div>
      ),
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        setBroadcastingId(String(record.id));
        try {
          const res = await broadcastSpeaker(
            {
              speakerSn,
              qrcodeSn,
              type: 'CONTENT',
              content,
            },
            {
              skipErrorHandler: true,
            },
          );
          message.success(getApiMessage(res, '播报成功'));
        } catch (error) {
          console.error('broadcast speaker failed:', error);
          message.error(getErrorMessage(error, '播报失败'));
          throw error;
        } finally {
          setBroadcastingId(undefined);
        }
      },
    });
  }, []);

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
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <div className="speaker-action-links">
            <PermissionVisible perm={SPEAKER_PERMS.broadcast}>
              <Button
                type="link"
                size="small"
                loading={broadcastingId === String(record.id)}
                onClick={() => {
                  void handleBroadcast(record);
                }}
              >
                播报测试
              </Button>
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
    [broadcastingId, handleBroadcast],
  );

  const handleSearch = () => {
    const nextFilters = {
      ...draftFilters,
      agentOrgId: draftFilters.agentOrgId.trim(),
      groupOrgId: draftFilters.groupOrgId.trim(),
      merchantOrgId: draftFilters.merchantOrgId.trim(),
      storeOrgId: draftFilters.storeOrgId.trim(),
      sn: draftFilters.sn.trim(),
      batchSn: draftFilters.batchSn.trim(),
      speakerChannelId: draftFilters.speakerChannelId.trim(),
      speakerChannelCode: draftFilters.speakerChannelCode.trim(),
      model: draftFilters.model.trim(),
      bindName: draftFilters.bindName.trim(),
      snList: draftFilters.snList.trim(),
      startSn: draftFilters.startSn.trim(),
      endSn: draftFilters.endSn.trim(),
    };
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
    setFilters(nextFilters);
  };

  const handleReset = () => {
    const nextFilters = createEmptyFilters();
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };
  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return (
    <div className="speaker-page">
      <ExpandableFilterCard
        className="speaker-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={[
          {
            key: 'agentOrgId',
            label: '代理组织ID',
            content: (
              <OrganizationPickerInput
                placeholder="请选择代理组织"
                value={draftFilters.agentOrgId}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    agentOrgId: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'groupOrgId',
            label: '集团组织ID',
            content: (
              <Input
                allowClear
                placeholder="请输入集团组织ID"
                value={draftFilters.groupOrgId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    groupOrgId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'merchantOrgId',
            label: '商户组织ID',
            content: (
              <Input
                allowClear
                placeholder="请输入商户组织ID"
                value={draftFilters.merchantOrgId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    merchantOrgId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'storeOrgId',
            label: '门店组织ID',
            content: (
              <Input
                allowClear
                placeholder="请输入门店组织ID"
                value={draftFilters.storeOrgId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    storeOrgId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'batchSn',
            label: '批次号',
            content: (
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
            ),
          },
          {
            key: 'sn',
            label: '编号',
            content: (
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
            ),
          },
          {
            key: 'speakerChannelId',
            label: '音箱通道ID',
            content: (
              <Input
                allowClear
                placeholder="请输入音箱通道ID"
                value={draftFilters.speakerChannelId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    speakerChannelId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'speakerChannelCode',
            label: '音箱通道编码',
            content: (
              <Input
                allowClear
                placeholder="请输入音箱通道编码"
                value={draftFilters.speakerChannelCode}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    speakerChannelCode: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'model',
            label: '型号',
            content: (
              <Input
                allowClear
                placeholder="请输入型号"
                value={draftFilters.model}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    model: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'bindName',
            label: '绑定名称',
            content: (
              <Input
                allowClear
                placeholder="请输入设备绑定时名称"
                value={draftFilters.bindName}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    bindName: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'snList',
            label: '编号集合',
            content: (
              <Input.TextArea
                allowClear
                autoSize={{ minRows: 1, maxRows: 3 }}
                placeholder="多个编号用逗号、空格或换行分隔"
                value={draftFilters.snList}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    snList: event.target.value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'snRange',
            label: '编号区间',
            content: (
              <Space.Compact block>
                <Input
                  allowClear
                  placeholder="起始设备编号"
                  value={draftFilters.startSn}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      startSn: event.target.value,
                    }));
                  }}
                  onPressEnter={handleSearch}
                />
                <Input
                  allowClear
                  placeholder="结束设备编号"
                  value={draftFilters.endSn}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      endSn: event.target.value,
                    }));
                  }}
                  onPressEnter={handleSearch}
                />
              </Space.Compact>
            ),
          },
        ]}
      />

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
            dataSource={records}
            scroll={{ x: 1960 }}
            locale={{
              emptyText: <Empty description="暂无云音响数据" />,
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

      <SpeakerTransferModal
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        selectedRecords={records.filter((item) =>
          selectedRowKeys.includes(item.id),
        )}
        onOk={async (values) => {
          const snList = (Array.isArray(values?.items) ? values.items : [])
            .map((item: SpeakerRecord) => String(item?.sn || '').trim())
            .filter(Boolean);

          if (!snList.length) {
            message.warning('请选择有效的设备编号');
            return;
          }

          const res = await transferSpeaker(
            {
              transferType:
                values?.actionType === 'callback' ? 'RETURN' : 'ISSUE',
              orgId:
                values?.actionType === 'callback' ? undefined : values?.orgId,
              snList,
            },
            {
              skipErrorHandler: true,
            },
          );

          message.success(getApiMessage(res, '操作成功'));
          setTransferModalOpen(false);
          setSelectedRowKeys([]);
          await loadSpeakerPage();
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
