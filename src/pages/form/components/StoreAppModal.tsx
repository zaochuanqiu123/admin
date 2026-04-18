import { Alert, Button, Empty, Modal, message, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getStoreApplicationStatusList,
  type OrgAppGroupRecord,
  type OrgAppRecord,
  storeEnableDisableApp,
} from '@/api/app';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';

type StoreAppModalProps = {
  open: boolean;
  storeOrgId?: string;
  storeName?: string;
  onCancel: () => void;
};

type StoreAppRecord = {
  key: string;
  id: string;
  name: string;
  state: boolean;
};

function normalizeText(value: unknown) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function normalizeAppState(value?: number | boolean | string) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const nextValue = value.trim().toUpperCase();
    if (
      ['TRUE', '1', 'ENABLE', 'ENABLED', 'OPEN', 'ON', 'ACTIVE'].includes(
        nextValue,
      )
    ) {
      return true;
    }
    if (
      [
        'FALSE',
        '0',
        'DISABLE',
        'DISABLED',
        'OFF',
        'INACTIVE',
        'CLOSE',
        'CLOSED',
      ].includes(nextValue)
    ) {
      return false;
    }
  }
  return false;
}

function mapAppRecord(
  app: OrgAppRecord,
  groupIndex: number,
  appIndex: number,
): StoreAppRecord {
  const id = normalizeText(app.id) || '';
  return {
    key: id || `${groupIndex}-${appIndex}`,
    id,
    name: normalizeText(app.appName) || '-',
    state: normalizeAppState(app.state),
  };
}

function flattenAppGroups(groups: OrgAppGroupRecord[]) {
  return groups.flatMap((group, groupIndex) => {
    if (Array.isArray(group.appList)) {
      return group.appList.map((app, appIndex) =>
        mapAppRecord(app, groupIndex, appIndex),
      );
    }
    return [];
  });
}

const StoreAppModal: React.FC<StoreAppModalProps> = ({
  open,
  storeOrgId,
  storeName,
  onCancel,
}) => {
  const normalizedStoreOrgId = normalizeText(storeOrgId);
  const normalizedStoreName = normalizeText(storeName);
  const [records, setRecords] = useState<StoreAppRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string>();
  const [submittingKey, setSubmittingKey] = useState<string>();

  useEffect(() => {
    if (!open) {
      setRecords([]);
      setLoading(false);
      setListError(undefined);
      setSubmittingKey(undefined);
      return;
    }

    if (!normalizedStoreOrgId) {
      setRecords([]);
      setLoading(false);
      setListError('缺少门店组织 ID，无法获取应用列表');
      return;
    }

    let cancelled = false;

    const loadApps = async () => {
      setLoading(true);
      setListError(undefined);
      try {
        const res = await getStoreApplicationStatusList(
          {
            storeOrgId: normalizedStoreOrgId,
          },
          {
            skipErrorHandler: true,
          },
        );
        if (cancelled) return;
        setRecords(flattenAppGroups(Array.isArray(res) ? res : []));
      } catch (error) {
        if (cancelled) return;
        setListError(getErrorMessage(error, '获取门店应用列表失败'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadApps();

    return () => {
      cancelled = true;
    };
  }, [normalizedStoreOrgId, open]);

  const handleToggle = useCallback(
    async (record: StoreAppRecord, enable: boolean) => {
      if (!normalizedStoreOrgId) {
        message.warning('缺少门店组织 ID，无法操作应用');
        return;
      }
      if (!record.id) {
        message.warning('缺少应用 ID，无法操作应用');
        return;
      }

      const nextSubmittingKey = `${record.key}:${enable ? 'enable' : 'disable'}`;
      setSubmittingKey(nextSubmittingKey);
      try {
        const res = await storeEnableDisableApp(
          {
            storeOrgId: normalizedStoreOrgId,
            appId: record.id,
            enable,
          },
          {
            skipErrorHandler: true,
          },
        );
        setRecords((prev) =>
          prev.map((item) =>
            item.key === record.key
              ? {
                  ...item,
                  state: enable,
                }
              : item,
          ),
        );
        message.success(
          getApiMessage(res, enable ? '应用已开通' : '应用已关闭'),
        );
      } catch (error) {
        message.error(
          getErrorMessage(error, enable ? '开通应用失败' : '关闭应用失败'),
        );
      } finally {
        setSubmittingKey(undefined);
      }
    },
    [normalizedStoreOrgId],
  );

  const columns = useMemo<ColumnsType<StoreAppRecord>>(
    () => [
      {
        title: '应用名称',
        dataIndex: 'name',
        width: 220,
        render: (value) => value || '-',
      },
      {
        title: '开通状态',
        dataIndex: 'state',
        width: 120,
        render: (value) =>
          value ? <Tag color="success">已开通</Tag> : <Tag>未开通</Tag>,
      },
      {
        title: '开通应用',
        key: 'enable',
        width: 120,
        render: (_, record) => {
          const rowSubmitting = submittingKey?.startsWith(`${record.key}:`);
          const currentSubmittingKey = `${record.key}:enable`;
          return (
            <Button
              type="link"
              size="small"
              loading={submittingKey === currentSubmittingKey}
              disabled={record.state || rowSubmitting || !record.id}
              onClick={() => {
                void handleToggle(record, true);
              }}
            >
              开通应用
            </Button>
          );
        },
      },
      {
        title: '关闭应用',
        key: 'disable',
        width: 120,
        render: (_, record) => {
          const rowSubmitting = submittingKey?.startsWith(`${record.key}:`);
          const currentSubmittingKey = `${record.key}:disable`;
          return (
            <Button
              type="link"
              size="small"
              danger
              loading={submittingKey === currentSubmittingKey}
              disabled={!record.state || rowSubmitting || !record.id}
              onClick={() => {
                void handleToggle(record, false);
              }}
            >
              关闭应用
            </Button>
          );
        },
      },
    ],
    [handleToggle, submittingKey],
  );

  return (
    <Modal
      title={
        normalizedStoreName ? `${normalizedStoreName}应用开通` : '应用开通'
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      destroyOnClose
    >
      {listError ? (
        <Alert
          type="error"
          showIcon
          message={listError}
          style={{ marginBottom: records.length > 0 ? 12 : 0 }}
        />
      ) : null}
      <Table<StoreAppRecord>
        rowKey={(record) => record.key}
        loading={loading}
        columns={columns}
        dataSource={records}
        pagination={false}
        locale={{
          emptyText: <Empty description="暂无应用数据" />,
        }}
      />
    </Modal>
  );
};

export type { StoreAppModalProps };
export default StoreAppModal;
