import { Alert, Checkbox, Collapse, Empty, Modal, message, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AgentPlugRecord,
  getAgentPlugList,
  updateAgentPlugList,
} from '@/api/agent';
import { getErrorMessage } from '@/utils/apiMessage';

type AgentPlugModalProps = {
  open: boolean;
  agentId?: string;
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
      status: checked ? 1 : 0,
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
  agentId,
  agentName,
  onCancel,
}) => {
  const [records, setRecords] = useState<AgentPlugRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const loadList = useCallback(async () => {
    const normalizedAgentId = readText(agentId);
    if (!normalizedAgentId) {
      setRecords([]);
      setError('当前代理商缺少 oldOrgId，无法获取功能应用');
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      setRecords(await getAgentPlugList(normalizedAgentId));
    } catch (loadError) {
      console.error('load agent plug list failed:', loadError);
      const errorMessage = getErrorMessage(loadError, '获取功能应用失败');
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

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

  const handleSubmit = useCallback(async () => {
    const normalizedAgentId = readText(agentId);
    if (!normalizedAgentId) {
      message.warning('当前代理商缺少 oldOrgId，无法保存功能应用');
      return;
    }

    setSubmitting(true);
    try {
      await updateAgentPlugList(normalizedAgentId, flattenPlugRecords(records));
      message.success('保存功能应用成功');
      await loadList();
    } catch (submitError) {
      console.error('save agent plug list failed:', submitError);
      message.error(getErrorMessage(submitError, '保存功能应用失败'));
    } finally {
      setSubmitting(false);
    }
  }, [agentId, loadList, records]);

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
                record.is_open,
                record.open_status,
                record.status,
                record.state,
              )}
              disabled={submitting}
              onChange={(event) => {
                setRecords((prev) =>
                  patchPlugRecordStatus(prev, id, event.target.checked),
                );
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
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      okButtonProps={{
        disabled: loading || groupedRecords.length === 0,
      }}
      destroyOnClose
      onCancel={onCancel}
      onOk={() => {
        void handleSubmit();
      }}
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
