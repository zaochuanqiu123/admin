import { Alert, Checkbox, Collapse, Empty, Modal, message, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentPlugRecord } from '@/api/agent';
import {
  getOrgAppList,
  grantOrgApp,
  type OrgAppGroupRecord,
  revokeGrantOrgApp,
} from '@/api/app';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';

type AgentPlugModalProps = {
  open: boolean;
  orgId?: string;
  agentName?: string;
  onCancel: () => void;
};

type FlatAgentPlugRecord = AgentPlugRecord & {
  categoryName: string;
};

function readText(...values: unknown[]) {
  for (const value of values) {
    const nextValue = String(value ?? '').trim();
    if (nextValue) return nextValue;
  }
  return '';
}

function readChecked(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    const nextValue = String(value).trim().toUpperCase();
    if (
      [
        '1',
        'TRUE',
        'YES',
        'ON',
        'OPEN',
        'ENABLE',
        'ENABLED',
        'ACTIVE',
      ].includes(nextValue)
    ) {
      return true;
    }
    if (
      [
        '0',
        'FALSE',
        'NO',
        'OFF',
        'CLOSE',
        'CLOSED',
        'DISABLE',
        'DISABLED',
        'INACTIVE',
      ].includes(nextValue)
    ) {
      return false;
    }
  }
  return false;
}

function getChildren(record: AgentPlugRecord) {
  if (Array.isArray(record.children)) return record.children;
  if (Array.isArray(record.list)) return record.list;
  if (Array.isArray(record.plug_list)) return record.plug_list;
  return [];
}

function getCategoryName(record: AgentPlugRecord, fallback?: string) {
  return (
    readText(
      record.category_name,
      record.type_name,
      record.group_name,
      record.category,
      record.type,
    ) ||
    fallback ||
    '功能应用'
  );
}

function getPlugName(record: AgentPlugRecord) {
  return (
    readText(record.plug_name, record.app_name, record.name, record.title) ||
    '-'
  );
}

function getPlugRecordKey(record: AgentPlugRecord) {
  return (
    readText(record.id, record.plug_id, record.identification) ||
    getPlugName(record)
  );
}

function mapOrgAppGroupsToPlugRecords(
  groups: OrgAppGroupRecord[],
): AgentPlugRecord[] {
  return groups.map((group) => ({
    category_name: readText(group.categoryName, group.typeName),
    plug_list: (Array.isArray(group.appList) ? group.appList : []).map(
      (app) => {
        const checked = readChecked(app.openStatus, app.state);
        return {
          id: app.id,
          plug_id: app.id,
          identification: readText(app.appCode, app.id),
          plug_name: app.appName,
          app_name: app.appName,
          information: app.appDesc,
          openStatus: app.openStatus,
          open_status: app.openStatus,
          state: app.state,
          status: checked ? 1 : 0,
        };
      },
    ),
  }));
}

function patchPlugRecordStatus(
  records: AgentPlugRecord[],
  targetKey: string,
  checked: boolean,
): AgentPlugRecord[] {
  return records.map((record) => {
    const children = getChildren(record);
    if (children.length > 0) {
      const nextRecord = {
        ...record,
      };
      if (Array.isArray(record.children)) {
        nextRecord.children = patchPlugRecordStatus(
          record.children,
          targetKey,
          checked,
        );
      }
      if (Array.isArray(record.list)) {
        nextRecord.list = patchPlugRecordStatus(
          record.list,
          targetKey,
          checked,
        );
      }
      if (Array.isArray(record.plug_list)) {
        nextRecord.plug_list = patchPlugRecordStatus(
          record.plug_list,
          targetKey,
          checked,
        );
      }
      return nextRecord;
    }
    if (getPlugRecordKey(record) !== targetKey) return record;
    return {
      ...record,
      is_open: checked,
      openStatus: checked ? 'ACTIVE' : 'INACTIVE',
      open_status: checked ? 'ACTIVE' : 'INACTIVE',
      status: checked ? 1 : 0,
      state: checked,
    };
  });
}

function flattenPlugRecords(
  records: AgentPlugRecord[],
  parentCategory?: string,
): FlatAgentPlugRecord[] {
  return records.flatMap((record) => {
    const children = getChildren(record);
    const categoryName = getCategoryName(record, parentCategory);
    if (children.length > 0) {
      return flattenPlugRecords(children, categoryName);
    }
    return [
      {
        ...record,
        categoryName,
      },
    ];
  });
}

const AgentPlugModal: React.FC<AgentPlugModalProps> = ({
  open,
  orgId,
  agentName,
  onCancel,
}) => {
  const [records, setRecords] = useState<AgentPlugRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const loadList = useCallback(async () => {
    const normalizedOrgId = readText(orgId);
    if (!normalizedOrgId) {
      setRecords([]);
      setError('当前代理商缺少 orgId，无法获取功能应用');
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const res = await getOrgAppList(normalizedOrgId, {
        skipErrorHandler: true,
      });
      setRecords(mapOrgAppGroupsToPlugRecords(Array.isArray(res) ? res : []));
    } catch (loadError) {
      console.error('load agent plug list failed:', loadError);
      const errorMessage = getErrorMessage(loadError, '获取功能应用失败');
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!open) {
      setRecords([]);
      setLoading(false);
      setSubmitting(false);
      setError(undefined);
      return;
    }

    void loadList();
  }, [loadList, open]);

  const handleToggleGrant = useCallback(
    async (record: AgentPlugRecord, checked: boolean) => {
      const normalizedOrgId = readText(orgId);
      if (!normalizedOrgId) {
        message.warning('当前代理商缺少 orgId，无法变更功能应用授权');
        return;
      }

      const appId = readText(record.id, record.plug_id);
      if (!appId) {
        message.warning('当前应用缺少 appId，无法变更授权');
        return;
      }

      setSubmitting(true);
      try {
        const res = checked
          ? await grantOrgApp(
              {
                appId,
                targetOrgId: normalizedOrgId,
              },
              {
                skipErrorHandler: true,
              },
            )
          : await revokeGrantOrgApp(
              {
                appId,
                targetOrgId: normalizedOrgId,
              },
              {
                skipErrorHandler: true,
              },
            );
        setRecords((prev) =>
          patchPlugRecordStatus(prev, getPlugRecordKey(record), checked),
        );
        message.success(
          getApiMessage(
            res,
            checked ? '授权功能应用成功' : '取消授权功能应用成功',
          ),
        );
      } catch (submitError) {
        console.error('toggle agent app grant failed:', submitError);
        message.error(
          getErrorMessage(
            submitError,
            checked ? '授权功能应用失败' : '取消授权功能应用失败',
          ),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [orgId],
  );

  const handleCheckboxChange = useCallback(
    (record: AgentPlugRecord, checked: boolean) => {
      if (submitting) {
        return;
      }
      void handleToggleGrant(record, checked);
    },
    [handleToggleGrant, submitting],
  );

  const handleCancel = useCallback(() => {
    if (submitting) {
      return;
    }
    onCancel();
  }, [onCancel, submitting]);

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, FlatAgentPlugRecord[]>();
    flattenPlugRecords(records).forEach((record) => {
      const categoryName = record.categoryName;
      const currentRecords = groups.get(categoryName) || [];
      currentRecords.push(record);
      groups.set(categoryName, currentRecords);
    });
    return Array.from(groups.entries()).map(([categoryName, groupRecords]) => ({
      categoryName,
      records: groupRecords,
    }));
  }, [records]);

  const collapseItems = groupedRecords.map((group) => ({
    key: group.categoryName,
    label: group.categoryName,
    children: (
      <div className="agent-plug-grid">
        {group.records.map((record) => {
          const name = getPlugName(record);
          const id = getPlugRecordKey(record);
          return (
            <Checkbox
              key={`${group.categoryName}-${id}-${name}`}
              checked={readChecked(
                record.openStatus,
                record.open_status,
                record.is_open,
                record.status,
                record.state,
              )}
              disabled={submitting}
              onChange={(event) => {
                handleCheckboxChange(record, event.target.checked);
              }}
            >
              {name}
            </Checkbox>
          );
        })}
      </div>
    ),
  }));

  return (
    <Modal
      title={agentName ? `功能应用 - ${agentName}` : '功能应用'}
      open={open}
      width={860}
      footer={null}
      maskClosable={!submitting}
      destroyOnClose
      onCancel={handleCancel}
      className="agent-plug-modal"
    >
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Spin spinning={loading}>
        {groupedRecords.length > 0 ? (
          <Collapse
            bordered={false}
            defaultActiveKey={groupedRecords.map((item) => item.categoryName)}
            items={collapseItems}
          />
        ) : (
          <Empty description="暂无功能应用数据" />
        )}
      </Spin>
    </Modal>
  );
};

export default AgentPlugModal;
