import { useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Space,
  Switch,
  Table,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bindMpos,
  getMposPageQuery,
  type MposOrgInfo,
  type MposRecord,
  transferMpos,
  unbindMpos,
} from '@/api/mpos';
import { ORG_LEVEL_CODE } from '@/api/org';
import {
  ExpandableFilterCard,
  OrganizationPickerInput,
  OrgOptionsSelect,
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import {
  getCurrentIdentityItem,
  getIdentityItemsFromStorage,
} from '@/utils/identity';
import { MposTransferModal } from './components/MposTransferModal';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;

const MPOS_PERMS = {
  transfer: 'admin:device:mpos:transfer',
  bind: 'admin:device:mpos:bind',
  unbind: 'admin:device:mpos:unbind',
} as const;

type QueryFilters = {
  agentOrgId: string;
  groupOrgId: string;
  merchantOrgId: string;
  storeOrgId: string;
  batchSn: string;
  sn: string;
  model: string;
  bindName: string;
  snList: string;
  startSn: string;
  endSn: string;
};

type BindFormValues = {
  storeOrgId?: string;
  bindName?: string;
  bindRemark?: string;
};

function createEmptyFilters(): QueryFilters {
  return {
    agentOrgId: '',
    groupOrgId: '',
    merchantOrgId: '',
    storeOrgId: '',
    batchSn: '',
    sn: '',
    model: '',
    bindName: '',
    snList: '',
    startSn: '',
    endSn: '',
  };
}

function normalizeText(value?: string | number | null) {
  const nextValue = String(value ?? '').trim();
  return nextValue || undefined;
}

function parseSnList(value: string) {
  const list = String(value || '')
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return list.length > 0 ? list : undefined;
}

function getRecordKey(record: MposRecord) {
  return String(
    record.id ??
      record.sn ??
      `${record.channelCode || 'mpos'}-${record.terminalNo || record.merchantNo || ''}`,
  );
}

function getOperationPayload(record: MposRecord) {
  return {
    id: record.id,
    sn: normalizeText(record.sn),
  };
}

function getOrgLines(org?: MposOrgInfo, fallbackOrgId?: string) {
  const lines = [
    normalizeText(org?.orgName),
    normalizeText(org?.orgCode) && `编码：${normalizeText(org?.orgCode)}`,
    !normalizeText(org?.orgName) &&
      !normalizeText(org?.orgCode) &&
      normalizeText(fallbackOrgId) &&
      `ID：${normalizeText(fallbackOrgId)}`,
  ].filter(Boolean) as string[];

  return lines.length > 0 ? lines : ['-'];
}

function getChannelLines(record: MposRecord) {
  const lines = [
    normalizeText(record.channelCode),
    normalizeText(record.channelConfigId) &&
      `配置ID：${normalizeText(record.channelConfigId)}`,
  ].filter(Boolean) as string[];

  return lines.length > 0 ? lines : ['-'];
}

function getBindLines(record: MposRecord) {
  const lines = [
    normalizeText(record.merchantOrg?.orgName) &&
      `商户：${normalizeText(record.merchantOrg?.orgName)}`,
    normalizeText(record.storeOrg?.orgName) &&
      `门店：${normalizeText(record.storeOrg?.orgName)}`,
    normalizeText(record.bindName) && `名称：${normalizeText(record.bindName)}`,
    normalizeText(record.bindTime) && `时间：${normalizeText(record.bindTime)}`,
  ].filter(Boolean) as string[];

  return lines.length > 0 ? lines : ['-'];
}

function isMposBound(record: MposRecord) {
  return Boolean(
    normalizeText(record.storeOrg?.id) ||
      normalizeText(record.storeOrg?.orgCode) ||
      normalizeText(record.storeOrg?.orgName) ||
      normalizeText(record.storeOrgId) ||
      normalizeText(record.bindTime),
  );
}

function renderMultiLines(lines: string[]) {
  const lineKeyCount = new Map<string, number>();

  return (
    <div className="mpos-lines">
      {lines.map((item, index) => {
        const duplicateCount = lineKeyCount.get(item) ?? 0;
        lineKeyCount.set(item, duplicateCount + 1);
        const itemKey =
          duplicateCount === 0 ? item : `${item}-${duplicateCount}`;

        return (
          <div
            key={itemKey}
            className={index > 0 ? 'mpos-sub-text' : undefined}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

const MposPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const [bindForm] = Form.useForm<BindFormValues>();
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

  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<MposRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [bindRecord, setBindRecord] = useState<MposRecord | null>(null);
  const [bindSubmitting, setBindSubmitting] = useState(false);
  const [operationKey, setOperationKey] = useState<string>();
  const [draftFilters, setDraftFilters] =
    useState<QueryFilters>(createEmptyFilters);
  const [filters, setFilters] = useState<QueryFilters>(createEmptyFilters);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);

  const loadMposPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);

    try {
      const res = await getMposPageQuery(
        {
          current,
          pageSize,
          agentOrgId: normalizeText(filters.agentOrgId),
          groupOrgId: normalizeText(filters.groupOrgId),
          merchantOrgId: normalizeText(filters.merchantOrgId),
          storeOrgId: normalizeText(filters.storeOrgId),
          batchSn: normalizeText(filters.batchSn),
          sn: normalizeText(filters.sn),
          model: normalizeText(filters.model),
          bindName: normalizeText(filters.bindName),
          snList: parseSnList(filters.snList),
          startSn: normalizeText(filters.startSn),
          endSn: normalizeText(filters.endSn),
        },
        {
          skipErrorHandler: true,
        },
      );

      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load mpos page failed:', error);
      setListError(getErrorMessage(error, '获取手持POS列表失败'));
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
    filters.startSn,
    filters.storeOrgId,
    pageSize,
  ]);

  useEffect(() => {
    void loadMposPage();
  }, [loadMposPage]);

  const openBindModal = useCallback(
    (record: MposRecord) => {
      setBindRecord(record);
      bindForm.setFieldsValue({
        storeOrgId: record.storeOrgId || '',
        bindName: record.bindName || '',
        bindRemark: record.bindRemark || '',
      });
    },
    [bindForm],
  );

  const closeBindModal = useCallback(() => {
    setBindRecord(null);
    bindForm.resetFields();
  }, [bindForm]);

  const handleBindSubmit = useCallback(async () => {
    if (!bindRecord) return;

    const payload = getOperationPayload(bindRecord);
    if (!payload.id && !payload.sn) {
      message.warning('缺少设备ID或编号，无法绑定');
      return;
    }

    setBindSubmitting(true);
    try {
      const values = await bindForm.validateFields();
      const res = await bindMpos(
        {
          ...payload,
          storeOrgId: normalizeText(values.storeOrgId),
          bindName: normalizeText(values.bindName),
          bindRemark: normalizeText(values.bindRemark),
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(getApiMessage(res, '绑定成功'));
      closeBindModal();
      await loadMposPage();
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) {
        return;
      }
      message.error(getErrorMessage(error, '绑定失败'));
    } finally {
      setBindSubmitting(false);
    }
  }, [bindForm, bindRecord, closeBindModal, loadMposPage]);

  const handleUnbind = useCallback(
    (record: MposRecord) => {
      const payload = getOperationPayload(record);
      if (!payload.id && !payload.sn) {
        message.warning('缺少设备ID或编号，无法解绑');
        return;
      }

      Modal.confirm({
        title: '确认解绑',
        content: `确认解绑设备 ${record.sn || record.id || ''} 吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          const key = getRecordKey(record);
          setOperationKey(key);
          try {
            const res = await unbindMpos(payload, {
              skipErrorHandler: true,
            });
            message.success(getApiMessage(res, '解绑成功'));
            await loadMposPage();
          } catch (error) {
            message.error(getErrorMessage(error, '解绑失败'));
            throw error;
          } finally {
            setOperationKey(undefined);
          }
        },
      });
    },
    [loadMposPage],
  );

  const columns = useMemo<ColumnsType<MposRecord>>(
    () =>
      [
        {
          title: '编号',
          dataIndex: 'sn',
          width: 180,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        isPlatform && {
          title: '代理组织',
          key: 'agentOrg',
          width: 180,
          render: (_: unknown, record: MposRecord) =>
            renderMultiLines(getOrgLines(record.agentOrg, record.agentOrgId)),
        },
        (isPlatform || isAgent) && {
          title: '集团组织',
          key: 'groupOrg',
          width: 180,
          render: (_: unknown, record: MposRecord) =>
            renderMultiLines(getOrgLines(record.groupOrg, record.groupOrgId)),
        },
        (isPlatform || isAgent) && {
          title: '商户组织',
          key: 'merchantOrg',
          width: 180,
          render: (_: unknown, record: MposRecord) =>
            renderMultiLines(
              getOrgLines(record.merchantOrg, record.merchantOrgId),
            ),
        },
        (isPlatform || isAgent || isMerchant) && {
          title: '门店组织',
          key: 'storeOrg',
          width: 180,
          render: (_: unknown, record: MposRecord) =>
            renderMultiLines(getOrgLines(record.storeOrg, record.storeOrgId)),
        },
        {
          title: '批次号',
          dataIndex: 'batchSn',
          width: 140,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '型号',
          dataIndex: 'model',
          width: 150,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '通道',
          key: 'channel',
          width: 180,
          render: (_: unknown, record: MposRecord) =>
            renderMultiLines(getChannelLines(record)),
        },
        {
          title: '通道商户/终端号',
          key: 'channelMerchant',
          width: 190,
          render: (_: unknown, record: MposRecord) =>
            renderMultiLines(
              [
                normalizeText(record.merchantNo) &&
                  `商户：${normalizeText(record.merchantNo)}`,
                normalizeText(record.terminalNo) &&
                  `终端：${normalizeText(record.terminalNo)}`,
              ].filter(Boolean) as string[],
            ),
        },
        {
          title: '绑定信息',
          key: 'bindInfo',
          width: 240,
          render: (_: unknown, record: MposRecord) =>
            renderMultiLines(getBindLines(record)),
        },
        {
          title: '备注',
          dataIndex: 'remark',
          width: 180,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '状态',
          dataIndex: 'state',
          width: 120,
          render: (value: string | number) => (
            <Switch
              checked={Number(value) === 1}
              checkedChildren="启用"
              unCheckedChildren="禁用"
              disabled
            />
          ),
        },
        {
          title: '划拨时间',
          dataIndex: 'transferTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '创建时间',
          dataIndex: 'createTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '修改时间',
          dataIndex: 'updateTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '操作',
          key: 'action',
          width: 130,
          fixed: 'right',
          render: (_: unknown, record: MposRecord) => {
            const bound = isMposBound(record);
            const recordKey = getRecordKey(record);

            return (
              <div className="mpos-action-links">
                {bound ? (
                  <PermissionVisible perm={MPOS_PERMS.unbind}>
                    <Button
                      type="link"
                      size="small"
                      danger
                      loading={operationKey === recordKey}
                      onClick={() => handleUnbind(record)}
                    >
                      解绑
                    </Button>
                  </PermissionVisible>
                ) : (
                  <PermissionVisible perm={MPOS_PERMS.bind}>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => openBindModal(record)}
                    >
                      绑定
                    </Button>
                  </PermissionVisible>
                )}
              </div>
            );
          },
        },
      ].filter(Boolean) as ColumnsType<MposRecord>,
    [
      handleUnbind,
      isAgent,
      isMerchant,
      isPlatform,
      openBindModal,
      operationKey,
    ],
  );

  const handleSearch = () => {
    const nextFilters: QueryFilters = {
      agentOrgId: draftFilters.agentOrgId.trim(),
      groupOrgId: draftFilters.groupOrgId.trim(),
      merchantOrgId: draftFilters.merchantOrgId.trim(),
      storeOrgId: draftFilters.storeOrgId.trim(),
      batchSn: draftFilters.batchSn.trim(),
      sn: draftFilters.sn.trim(),
      model: draftFilters.model.trim(),
      bindName: draftFilters.bindName.trim(),
      snList: draftFilters.snList.trim(),
      startSn: draftFilters.startSn.trim(),
      endSn: draftFilters.endSn.trim(),
    };

    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
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
    <div className="mpos-page">
      <ExpandableFilterCard
        className="mpos-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={
          [
            isPlatform && {
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
            (isPlatform || isAgent) && {
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
            (isPlatform || isAgent) && {
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
            (isPlatform || isAgent || isMerchant) && {
              key: 'storeOrgId',
              label: '门店组织',
              content: (
                <OrgOptionsSelect
                  orgLevelCode={ORG_LEVEL_CODE.store}
                  parentOrgId={draftFilters.merchantOrgId}
                  placeholder="请选择门店组织"
                  value={draftFilters.storeOrgId}
                  onChange={(value) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      storeOrgId: value,
                    }));
                  }}
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
                  placeholder="请输入绑定名称"
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
              label: '设备号集合',
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
              label: '设备号区间',
              content: (
                <Space.Compact block>
                  <Input
                    allowClear
                    placeholder="起始设备号"
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
                    placeholder="结束设备号"
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
          ].filter(Boolean) as any
        }
      />

      <div className="content-card mpos-table-card">
        <div className="mpos-toolbar">
          <PermissionButton
            perm={MPOS_PERMS.transfer}
            type="primary"
            onClick={() => {
              setTransferModalOpen(true);
            }}
          >
            划拨/回调
          </PermissionButton>
        </div>

        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<MposRecord>
            rowKey={getRecordKey}
            loading={refreshingList}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns}
            dataSource={records}
            scroll={{ x: 2420 }}
            locale={{
              emptyText: <Empty description="暂无手持POS数据" />,
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

      <MposTransferModal
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        selectedRecords={records.filter((item) =>
          selectedRowKeys.includes(getRecordKey(item)),
        )}
        onOk={async (values) => {
          const snList = (Array.isArray(values.items) ? values.items : [])
            .map((item) => String(item?.sn || '').trim())
            .filter(Boolean);

          if (!snList.length) {
            message.warning('请选择有效的设备编号');
            return;
          }

          const res = await transferMpos(
            {
              transferType:
                values.actionType === 'callback' ? 'RETURN' : 'ISSUE',
              orgId:
                values.actionType === 'callback' ? undefined : values.orgId,
              snList,
              remark: values.remark,
            },
            {
              skipErrorHandler: true,
            },
          );

          message.success(getApiMessage(res, '操作成功'));
          setTransferModalOpen(false);
          setSelectedRowKeys([]);
          await loadMposPage();
        }}
      />

      <Modal
        title="绑定手持POS"
        open={Boolean(bindRecord)}
        onCancel={closeBindModal}
        onOk={() => {
          void handleBindSubmit();
        }}
        okText="确定"
        cancelText="取消"
        confirmLoading={bindSubmitting}
        destroyOnClose
      >
        <Form form={bindForm} layout="vertical">
          <Form.Item label="设备编号">
            <Input value={bindRecord?.sn || ''} disabled />
          </Form.Item>
          <Form.Item name="storeOrgId" label="门店组织">
            <OrganizationPickerInput placeholder="请选择门店组织" />
          </Form.Item>
          <Form.Item name="bindName" label="绑定名称">
            <Input allowClear placeholder="请输入设备绑定时名称" />
          </Form.Item>
          <Form.Item name="bindRemark" label="绑定备注">
            <Input.TextArea
              allowClear
              autoSize={{ minRows: 3, maxRows: 5 }}
              placeholder="请输入设备绑定时备注"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MposPage;
