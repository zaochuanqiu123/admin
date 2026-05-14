import { Alert, Checkbox, Empty, Modal, message, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getOrgAppList,
  grantOrgApp,
  type OrgAppGroupRecord,
  type OrgAppRecord,
  revokeGrantOrgApp,
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
  openStatus?: string;
};

function normalizeText(value: unknown) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function normalizeAppState(
  ...values: Array<number | boolean | string | undefined>
) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
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
    state: normalizeAppState(app.openStatus, app.state),
    openStatus: app.openStatus,
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
        const res = await getOrgAppList(normalizedStoreOrgId, {
          skipErrorHandler: true,
        });
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
    async (record: StoreAppRecord, checked: boolean) => {
      if (!normalizedStoreOrgId) {
        message.warning('缺少门店组织 ID，无法变更应用授权');
        return;
      }
      if (!record.id) {
        message.warning('缺少应用 ID，无法变更授权');
        return;
      }

      setSubmittingKey(record.key);
      try {
        const res = checked
          ? await grantOrgApp(
              {
                appId: record.id,
                targetOrgId: normalizedStoreOrgId,
              },
              {
                skipErrorHandler: true,
              },
            )
          : await revokeGrantOrgApp(
              {
                appId: record.id,
                targetOrgId: normalizedStoreOrgId,
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
                  state: checked,
                  openStatus: checked ? 'ACTIVE' : 'INACTIVE',
                }
              : item,
          ),
        );
        message.success(
          getApiMessage(res, checked ? '授权应用成功' : '取消授权应用成功'),
        );
      } catch (error) {
        message.error(
          getErrorMessage(error, checked ? '授权应用失败' : '取消授权应用失败'),
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
        title: '授权状态',
        dataIndex: 'state',
        width: 120,
        render: (value) =>
          value ? <Tag color="success">已授权</Tag> : <Tag>未授权</Tag>,
      },
      {
        title: '授权应用',
        key: 'grant',
        width: 130,
        render: (_, record) => {
          return (
            <Checkbox
              checked={record.state}
              disabled={!!submittingKey || !record.id}
              onChange={(event) => {
                void handleToggle(record, event.target.checked);
              }}
            >
              授权
            </Checkbox>
          );
        },
      },
    ],
    [handleToggle, submittingKey],
  );

  return (
    <Modal
      title={
        normalizedStoreName ? `${normalizedStoreName}应用授权` : '应用授权'
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
