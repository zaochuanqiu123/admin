import {
  Alert,
  Button,
  Descriptions,
  Empty,
  InputNumber,
  Modal,
  message,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageSectionSkeleton } from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';

type CapabilityActionType = 'enable' | 'reEnable' | 'renew' | 'upgrade';

export type MerchantCapabilityListRecord = {
  id: string;
  name?: string;
  state?: boolean;
  openStatus?: string;
  categoryName?: string;
  description?: string;
};

export type MerchantCapabilityVersionRecord = {
  id: string;
  name?: string;
  description?: string;
  level?: string | number;
  price?: string | number;
  state?: boolean;
  isDefault?: boolean;
};

export type MerchantCapabilityCurrentDetail = {
  startDate?: string;
  endDate?: string;
  versionName?: string;
  versionDescription?: string;
  level?: string | number;
  price?: string | number;
};

type MerchantCapabilityManagementConfig = {
  managementName: string;
  getList: (orgId: string) => Promise<MerchantCapabilityListRecord[]>;
  getEnableVersionList: (
    orgId: string,
    itemId: string,
  ) => Promise<MerchantCapabilityVersionRecord[]>;
  getUpgradeVersionList: (
    orgId: string,
    itemId: string,
  ) => Promise<MerchantCapabilityVersionRecord[]>;
  getCurrentDetail: (
    orgId: string,
    itemId: string,
  ) => Promise<MerchantCapabilityCurrentDetail>;
  enable: (params: {
    orgId: string;
    itemId: string;
    versionId: string;
    cycle: number;
  }) => Promise<any>;
  renew: (params: {
    orgId: string;
    itemId: string;
    cycle: number;
  }) => Promise<any>;
  upgrade: (params: {
    orgId: string;
    itemId: string;
    versionId: string;
  }) => Promise<any>;
};

type MerchantCapabilityManagementModalProps = {
  open: boolean;
  orgId?: string;
  merchantName?: string;
  config: MerchantCapabilityManagementConfig;
  onCancel: () => void;
};

type CapabilityActionPayload = {
  type: CapabilityActionType;
  record: MerchantCapabilityListRecord;
};

function normalizeText(value?: string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function normalizeCycle(value?: number | null) {
  const nextValue = Number(value || 1);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return 1;
  }
  return Math.floor(nextValue);
}

function formatValue(value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  return String(value);
}

function getStatusText(value?: string) {
  const status = String(value || '')
    .trim()
    .toUpperCase();
  if (status === 'INACTIVE') return '未开通';
  if (status === 'ACTIVE') return '已开通';
  if (status === 'EXPIRED') return '已过期';
  return status || '-';
}

function getStatusTag(value?: string) {
  const status = String(value || '')
    .trim()
    .toUpperCase();
  if (status === 'ACTIVE') return <Tag color="success">已开通</Tag>;
  if (status === 'EXPIRED') return <Tag color="warning">已过期</Tag>;
  if (status === 'INACTIVE') return <Tag>未开通</Tag>;
  return <Tag>{status || '-'}</Tag>;
}

function getStateTag(value?: boolean) {
  return value ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>;
}

function getActionText(type: CapabilityActionType) {
  if (type === 'enable') return '开通';
  if (type === 'reEnable') return '重新开通';
  if (type === 'renew') return '续费';
  return '升级';
}

function getActionList(
  record: MerchantCapabilityListRecord,
): CapabilityActionType[] {
  const status = String(record.openStatus || '')
    .trim()
    .toUpperCase();
  if (status === 'INACTIVE') return ['enable'];
  if (status === 'ACTIVE') return ['renew', 'upgrade'];
  if (status === 'EXPIRED') return ['renew', 'reEnable'];
  return [];
}

function getActionModalTitle(
  managementName: string,
  actionType: CapabilityActionType,
) {
  if (actionType === 'enable') return `开通${managementName}`;
  if (actionType === 'reEnable') return `重新开通${managementName}`;
  if (actionType === 'renew') return `续费${managementName}`;
  return `升级${managementName}`;
}

function getDefaultVersionId(records: MerchantCapabilityVersionRecord[]) {
  const preferredRecord =
    records.find((item) => item.isDefault) ||
    records.find((item) => item.state !== false) ||
    records[0];
  return normalizeText(preferredRecord?.id);
}

const MerchantCapabilityManagementModal: React.FC<
  MerchantCapabilityManagementModalProps
> = ({ open, orgId, merchantName, config, onCancel }) => {
  const normalizedOrgId = normalizeText(orgId);
  const [records, setRecords] = useState<MerchantCapabilityListRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [actionPayload, setActionPayload] =
    useState<CapabilityActionPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const [currentDetail, setCurrentDetail] =
    useState<MerchantCapabilityCurrentDetail>();
  const [versionRecords, setVersionRecords] = useState<
    MerchantCapabilityVersionRecord[]
  >([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [cycle, setCycle] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const resetActionState = useCallback(() => {
    setActionPayload(null);
    setDetailLoading(false);
    setDetailError(undefined);
    setCurrentDetail(undefined);
    setVersionRecords([]);
    setSelectedVersionId(undefined);
    setCycle(1);
    setSubmitting(false);
  }, []);

  const loadList = useCallback(async () => {
    if (!normalizedOrgId) {
      setRecords([]);
      setListError(`缺少组织ID，无法获取${config.managementName}列表`);
      setListInitialized(true);
      return;
    }

    setListLoading(true);
    setListError(undefined);
    try {
      const res = await config.getList(normalizedOrgId);
      setRecords(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error(`load ${config.managementName} list failed:`, error);
      setListError(
        getErrorMessage(error, `获取${config.managementName}列表失败`),
      );
    } finally {
      setListLoading(false);
      setListInitialized(true);
    }
  }, [config, normalizedOrgId]);

  useEffect(() => {
    if (!open) {
      setRecords([]);
      setListLoading(false);
      setListInitialized(false);
      setListError(undefined);
      resetActionState();
      return;
    }

    void loadList();
  }, [loadList, open, resetActionState]);

  useEffect(() => {
    if (!open || !actionPayload || !normalizedOrgId) {
      return;
    }

    const itemId = normalizeText(actionPayload.record.id);
    if (!itemId) {
      setDetailError(`缺少${config.managementName}标识，无法继续操作`);
      return;
    }

    let cancelled = false;

    const loadActionDetail = async () => {
      setDetailLoading(true);
      setDetailError(undefined);
      setCurrentDetail(undefined);
      setVersionRecords([]);
      setSelectedVersionId(undefined);
      setCycle(1);

      try {
        if (
          actionPayload.type === 'enable' ||
          actionPayload.type === 'reEnable'
        ) {
          const res = await config.getEnableVersionList(
            normalizedOrgId,
            itemId,
          );
          if (cancelled) return;
          const nextRecords = Array.isArray(res) ? res : [];
          setVersionRecords(nextRecords);
          setSelectedVersionId(getDefaultVersionId(nextRecords));
          return;
        }

        if (actionPayload.type === 'renew') {
          const res = await config.getCurrentDetail(normalizedOrgId, itemId);
          if (cancelled) return;
          setCurrentDetail(res || {});
          return;
        }

        const [detailRes, versionRes] = await Promise.all([
          config.getCurrentDetail(normalizedOrgId, itemId),
          config.getUpgradeVersionList(normalizedOrgId, itemId),
        ]);
        if (cancelled) return;
        const nextRecords = Array.isArray(versionRes) ? versionRes : [];
        setCurrentDetail(detailRes || {});
        setVersionRecords(nextRecords);
        setSelectedVersionId(getDefaultVersionId(nextRecords));
      } catch (error) {
        if (cancelled) return;
        console.error(
          `load ${config.managementName} action detail failed:`,
          error,
        );
        setDetailError(
          getErrorMessage(error, `获取${config.managementName}信息失败`),
        );
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadActionDetail();

    return () => {
      cancelled = true;
    };
  }, [actionPayload, config, normalizedOrgId, open]);

  const hasCategoryColumn = useMemo(
    () => records.some((item) => !!normalizeText(item.categoryName)),
    [records],
  );
  const hasListDescriptionColumn = useMemo(
    () => records.some((item) => !!normalizeText(item.description)),
    [records],
  );
  const hasVersionDescriptionColumn = useMemo(
    () =>
      versionRecords.some((item) => !!normalizeText(item.description)) ||
      !!normalizeText(currentDetail?.versionDescription),
    [currentDetail?.versionDescription, versionRecords],
  );

  const listColumns = useMemo<ColumnsType<MerchantCapabilityListRecord>>(() => {
    const columns: ColumnsType<MerchantCapabilityListRecord> = [
      {
        title: `${config.managementName}名称`,
        dataIndex: 'name',
        width: 120,
        render: (value) => value || '-',
      },
    ];

    if (hasCategoryColumn) {
      columns.push({
        title: `${config.managementName}分类`,
        dataIndex: 'categoryName',
        width: 120,
        ellipsis: true,
        render: (value) => value || '-',
      });
    }

    if (hasListDescriptionColumn) {
      columns.push({
        title: `${config.managementName}描述`,
        dataIndex: 'description',
        width: 140,
        ellipsis: true,
        render: (value) => value || '-',
      });
    }

    columns.push(
      {
        title: '状态',
        dataIndex: 'state',
        width: 90,
        render: (value) => getStateTag(value),
      },
      {
        title: '开通状态',
        dataIndex: 'openStatus',
        width: 100,
        render: (value) => getStatusTag(value),
      },
      {
        title: '操作',
        key: 'action',
        width: 110,
        render: (_, record) => {
          const itemId = normalizeText(record.id);
          const disabled = record.state === false || !itemId;
          const actions = getActionList(record);
          if (actions.length === 0) {
            return (
              <span className="merchant-capability-modal-action-placeholder">
                -
              </span>
            );
          }
          return (
            <Space
              size={0}
              wrap
              className="merchant-capability-modal-action-links"
            >
              {actions.map((actionType) => (
                <Button
                  key={actionType}
                  type="link"
                  size="small"
                  disabled={disabled}
                  onClick={() => {
                    setActionPayload({
                      type: actionType,
                      record,
                    });
                  }}
                >
                  {getActionText(actionType)}
                </Button>
              ))}
            </Space>
          );
        },
      },
    );

    return columns;
  }, [config.managementName, hasCategoryColumn, hasListDescriptionColumn]);

  const versionColumns = useMemo<
    ColumnsType<MerchantCapabilityVersionRecord>
  >(() => {
    const columns: ColumnsType<MerchantCapabilityVersionRecord> = [
      {
        title: `${config.managementName}版本名称`,
        dataIndex: 'name',
        width: 220,
        ellipsis: true,
        render: (value) => value || '-',
      },
    ];

    if (hasVersionDescriptionColumn) {
      columns.push({
        title: `${config.managementName}版本描述`,
        dataIndex: 'description',
        width: 280,
        ellipsis: true,
        render: (value) => value || '-',
      });
    }

    columns.push(
      {
        title: '等级',
        dataIndex: 'level',
        width: 120,
        render: (value) => formatValue(value),
      },
      {
        title: '价格',
        dataIndex: 'price',
        width: 160,
        render: (value) => formatValue(value),
      },
    );

    return columns;
  }, [config.managementName, hasVersionDescriptionColumn]);

  const handleSubmit = useCallback(async () => {
    if (!actionPayload || !normalizedOrgId) {
      message.warning('缺少组织信息，无法提交');
      return;
    }

    const itemId = normalizeText(actionPayload.record.id);
    if (!itemId) {
      message.warning(`缺少${config.managementName}标识，无法提交`);
      return;
    }

    const nextCycle = normalizeCycle(cycle);
    const selectedCapabilityVersionId = normalizeText(selectedVersionId);

    if (
      (actionPayload.type === 'enable' || actionPayload.type === 'reEnable') &&
      !selectedCapabilityVersionId
    ) {
      message.warning(`请选择待开通${config.managementName}版本`);
      return;
    }

    if (actionPayload.type === 'upgrade' && !selectedCapabilityVersionId) {
      message.warning(`请选择升级${config.managementName}版本`);
      return;
    }

    setSubmitting(true);
    try {
      let res: any;

      if (
        actionPayload.type === 'enable' ||
        actionPayload.type === 'reEnable'
      ) {
        const versionId = selectedCapabilityVersionId;
        if (!versionId) {
          message.warning(`请选择待开通${config.managementName}版本`);
          return;
        }

        res = await config.enable({
          orgId: normalizedOrgId,
          itemId,
          versionId,
          cycle: nextCycle,
        });
      } else if (actionPayload.type === 'renew') {
        res = await config.renew({
          orgId: normalizedOrgId,
          itemId,
          cycle: nextCycle,
        });
      } else {
        const versionId = selectedCapabilityVersionId;
        if (!versionId) {
          message.warning(`请选择升级${config.managementName}版本`);
          return;
        }

        res = await config.upgrade({
          orgId: normalizedOrgId,
          itemId,
          versionId,
        });
      }

      message.success(
        getApiMessage(res, `${getActionText(actionPayload.type)}成功`),
      );
      await loadList();
      resetActionState();
    } catch (error) {
      console.error(`submit ${config.managementName} action failed:`, error);
      message.error(
        getErrorMessage(error, `${getActionText(actionPayload.type)}失败`),
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    actionPayload,
    config,
    cycle,
    loadList,
    normalizedOrgId,
    resetActionState,
    selectedVersionId,
  ]);

  const selectedVersionKeys = selectedVersionId ? [selectedVersionId] : [];
  const initialListLoading = listLoading && !listInitialized;
  const refreshingList = listLoading && listInitialized;
  const actionTitle = actionPayload
    ? getActionModalTitle(config.managementName, actionPayload.type)
    : '';

  return (
    <>
      <Modal
        title={
          normalizeText(merchantName)
            ? `${merchantName}${config.managementName}管理`
            : `${config.managementName}管理`
        }
        open={open}
        onCancel={onCancel}
        footer={null}
        width={960}
        destroyOnClose
      >
        {initialListLoading ? (
          <PageSectionSkeleton rows={5} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <div className="merchant-capability-modal-table-wrap">
            {listError ? (
              <Alert
                type="error"
                showIcon
                message={listError}
                className="merchant-capability-modal-alert"
              />
            ) : null}
            <Table<MerchantCapabilityListRecord>
              rowKey={(record) => record.id}
              loading={refreshingList}
              columns={listColumns}
              dataSource={records}
              pagination={false}
              scroll={{ x: hasListDescriptionColumn ? 720 : 620 }}
              locale={{
                emptyText: (
                  <Empty description={`暂无${config.managementName}数据`} />
                ),
              }}
            />
          </div>
        )}
      </Modal>

      <Modal
        title={
          actionPayload?.record?.name
            ? `${actionTitle} · ${actionPayload.record.name}`
            : actionTitle
        }
        open={!!actionPayload}
        onCancel={resetActionState}
        onOk={() => {
          void handleSubmit();
        }}
        confirmLoading={submitting}
        destroyOnClose
        width={900}
      >
        {detailLoading ? (
          <PageSectionSkeleton rows={4} />
        ) : detailError ? (
          <Alert type="error" showIcon message={detailError} />
        ) : (
          <div className="merchant-capability-modal-detail">
            {actionPayload?.type === 'renew' ||
            actionPayload?.type === 'upgrade' ? (
              <div className="merchant-capability-modal-section">
                <div className="merchant-capability-modal-section-title">
                  当前开通详情
                </div>
                <Descriptions
                  bordered
                  size="small"
                  column={2}
                  className="merchant-capability-modal-descriptions"
                >
                  <Descriptions.Item label="当前版本">
                    {formatValue(currentDetail?.versionName)}
                  </Descriptions.Item>
                  <Descriptions.Item label="版本等级">
                    {formatValue(currentDetail?.level)}
                  </Descriptions.Item>
                  {hasVersionDescriptionColumn ? (
                    <Descriptions.Item label="版本描述" span={2}>
                      {formatValue(currentDetail?.versionDescription)}
                    </Descriptions.Item>
                  ) : null}
                  <Descriptions.Item label="开始时间">
                    {formatValue(currentDetail?.startDate)}
                  </Descriptions.Item>
                  <Descriptions.Item label="到期时间">
                    {formatValue(currentDetail?.endDate)}
                  </Descriptions.Item>
                  <Descriptions.Item label="当前价格" span={2}>
                    {formatValue(currentDetail?.price)}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            ) : null}

            {actionPayload?.type === 'enable' ||
            actionPayload?.type === 'reEnable' ? (
              <div className="merchant-capability-modal-section">
                <div className="merchant-capability-modal-section-title">
                  待开通版本
                </div>
                <Table<MerchantCapabilityVersionRecord>
                  rowKey={(record) => record.id}
                  columns={versionColumns}
                  dataSource={versionRecords}
                  pagination={false}
                  scroll={{ x: hasVersionDescriptionColumn ? 880 : 620 }}
                  locale={{
                    emptyText: <Empty description="暂无可开通版本" />,
                  }}
                  rowSelection={{
                    type: 'radio',
                    selectedRowKeys: selectedVersionKeys,
                    onChange: (nextKeys) => {
                      setSelectedVersionId(
                        normalizeText(String(nextKeys[0] || '')),
                      );
                    },
                  }}
                  onRow={(record) => ({
                    onClick: () => {
                      setSelectedVersionId(record.id);
                    },
                  })}
                />
              </div>
            ) : null}

            {actionPayload?.type === 'upgrade' ? (
              <div className="merchant-capability-modal-section">
                <div className="merchant-capability-modal-section-title">
                  可升级版本
                </div>
                <Table<MerchantCapabilityVersionRecord>
                  rowKey={(record) => record.id}
                  columns={versionColumns}
                  dataSource={versionRecords}
                  pagination={false}
                  scroll={{ x: hasVersionDescriptionColumn ? 880 : 620 }}
                  locale={{
                    emptyText: <Empty description="暂无可升级版本" />,
                  }}
                  rowSelection={{
                    type: 'radio',
                    selectedRowKeys: selectedVersionKeys,
                    onChange: (nextKeys) => {
                      setSelectedVersionId(
                        normalizeText(String(nextKeys[0] || '')),
                      );
                    },
                  }}
                  onRow={(record) => ({
                    onClick: () => {
                      setSelectedVersionId(record.id);
                    },
                  })}
                />
              </div>
            ) : null}

            {actionPayload?.type === 'enable' ||
            actionPayload?.type === 'reEnable' ||
            actionPayload?.type === 'renew' ? (
              <div className="merchant-capability-modal-section">
                <div className="merchant-capability-modal-section-title">
                  周期设置
                </div>
                <div className="merchant-capability-modal-cycle-row">
                  <InputNumber
                    min={1}
                    precision={0}
                    value={cycle}
                    onChange={(value) => {
                      setCycle(normalizeCycle(value));
                    }}
                  />
                  <span className="merchant-capability-modal-cycle-unit">
                    个周期
                  </span>
                </div>
                <div className="merchant-capability-modal-cycle-tip">
                  1个周期 = 30天
                </div>
              </div>
            ) : null}

            {actionPayload ? (
              <div className="merchant-capability-modal-summary">
                当前动作：{getActionText(actionPayload.type)}，开通状态：
                {getStatusText(actionPayload.record.openStatus)}
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  );
};

export default MerchantCapabilityManagementModal;
