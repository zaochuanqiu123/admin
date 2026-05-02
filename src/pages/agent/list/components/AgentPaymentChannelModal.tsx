import { Alert, Avatar, Empty, Modal, message, Switch, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AgentPaymentChannelRecord,
  type AgentPaymentSwitchType,
  getAgentPaymentChannelList,
  updateAgentPaymentSwitch,
} from '@/api/agent';
import { getErrorMessage } from '@/utils/apiMessage';
import './AgentPaymentChannelModal.less';

const DEFAULT_PAGE_SIZE = 10;

type AgentPaymentChannelModalProps = {
  open: boolean;
  agentId?: string;
  agentName?: string;
  listUrl?: string;
  userType?: string;
  switchEnabled?: boolean;
  onCancel: () => void;
};

function readText(...values: unknown[]) {
  for (const value of values) {
    const nextValue = String(value ?? '').trim();
    if (nextValue) return nextValue;
  }
  return '';
}

function readSwitchState(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    const nextValue = String(value).trim().toUpperCase();
    if (
      ['1', 'TRUE', 'YES', 'ON', 'OPEN', 'ENABLE', 'ENABLED'].includes(
        nextValue,
      )
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
      ].includes(nextValue)
    ) {
      return false;
    }
  }
  return false;
}

function getPaymentId(record: AgentPaymentChannelRecord) {
  return readText(record.id, record.payment_id, record.channel_id);
}

function getSwitchLoadingKey(
  type: AgentPaymentSwitchType,
  record: AgentPaymentChannelRecord,
) {
  return `${type}-${getPaymentId(record)}`;
}

function getSwitchSuccessText(type: AgentPaymentSwitchType, checked: boolean) {
  const actionText = checked ? '开启' : '关闭';
  if (type === 'channel') return `${actionText}支付通道成功`;
  if (type === 'serviceConfig') return `${actionText}服务商配置成功`;
  if (type === 'merchantConfig') return `${actionText}商户号配置成功`;
  return `${actionText}支付路由配置成功`;
}

function patchSwitchState(
  record: AgentPaymentChannelRecord,
  type: AgentPaymentSwitchType,
  checked: boolean,
) {
  const status = checked ? 1 : 0;
  if (type === 'channel') {
    return {
      ...record,
      open: status,
      is_open: status,
      open_status: status,
      state: status,
    };
  }
  if (type === 'serviceConfig') {
    return {
      ...record,
      service_config: status,
      service_status: status,
      is_service_config: status,
      open_service_config: status,
    };
  }
  if (type === 'merchantConfig') {
    return {
      ...record,
      merchant_config: status,
      merchant_status: status,
      is_merchant_config: status,
      mch_config: status,
      is_mch_config: status,
    };
  }
  return {
    ...record,
    route_config: status,
    route_status: status,
    payment_route_config: status,
    is_route_config: status,
  };
}

const AgentPaymentChannelModal: React.FC<AgentPaymentChannelModalProps> = ({
  open,
  agentId,
  agentName,
  listUrl,
  userType = '2',
  switchEnabled = true,
  onCancel,
}) => {
  const [records, setRecords] = useState<AgentPaymentChannelRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [switchingKeys, setSwitchingKeys] = useState<Record<string, boolean>>(
    {},
  );
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);

  const loadList = useCallback(async () => {
    const normalizedAgentId = readText(agentId);
    if (!normalizedAgentId) {
      setRecords([]);
      setError('当前代理商缺少 oldOrgId，无法获取支付通道');
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const res = await getAgentPaymentChannelList({
        userId: normalizedAgentId,
        userType,
        page: current,
        limit: pageSize,
        url: listUrl,
      });
      setRecords(res.records);
      setPagination((prev) => ({
        ...prev,
        total: res.total,
      }));
    } catch (loadError) {
      console.error('load agent payment channel list failed:', loadError);
      const errorMessage = getErrorMessage(loadError, '获取支付通道列表失败');
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [agentId, current, listUrl, pageSize, userType]);

  useEffect(() => {
    if (!open) {
      setRecords([]);
      setLoading(false);
      setError(undefined);
      setSwitchingKeys({});
      setPagination((prev) => ({
        ...prev,
        current: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
      }));
      return;
    }

    void loadList();
  }, [loadList, open]);

  const handleSwitchChange = useCallback(
    async (
      type: AgentPaymentSwitchType,
      checked: boolean,
      record: AgentPaymentChannelRecord,
    ) => {
      const normalizedAgentId = readText(agentId);
      const paymentId = getPaymentId(record);
      if (!switchEnabled) return;
      if (!normalizedAgentId) {
        message.warning('当前代理商缺少 oldOrgId，无法修改支付通道配置');
        return;
      }
      if (!paymentId) {
        message.warning('当前支付通道缺少ID，无法修改配置');
        return;
      }

      const loadingKey = getSwitchLoadingKey(type, record);
      setSwitchingKeys((prev) => ({
        ...prev,
        [loadingKey]: true,
      }));

      try {
        await updateAgentPaymentSwitch(type, {
          userId: normalizedAgentId,
          paymentId,
          status: checked ? 1 : 0,
        });
        setRecords((prev) =>
          prev.map((item) =>
            getPaymentId(item) === paymentId
              ? patchSwitchState(item, type, checked)
              : item,
          ),
        );
        message.success(getSwitchSuccessText(type, checked));
      } catch (switchError) {
        console.error('update agent payment switch failed:', switchError);
        message.error(getErrorMessage(switchError, '修改支付通道配置失败'));
      } finally {
        setSwitchingKeys((prev) => {
          const next = { ...prev };
          delete next[loadingKey];
          return next;
        });
      }
    },
    [agentId, switchEnabled],
  );

  const columns = useMemo<ColumnsType<AgentPaymentChannelRecord>>(
    () => [
      {
        title: '序号',
        key: 'index',
        width: 72,
        align: 'center',
        render: (_, __, index) => (current - 1) * pageSize + index + 1,
      },
      {
        title: 'logo',
        key: 'logo',
        width: 120,
        align: 'center',
        render: (_, record) => {
          const logoUrl = readText(
            record.logo_url,
            record.logo,
            record.icon_url,
            record.icon,
          );
          return (
            <Avatar
              size={56}
              shape="square"
              src={logoUrl || undefined}
              className="agent-payment-channel-logo"
            >
              {readText(
                record.payment_name,
                record.channel_name,
                record.name,
                record.title,
              ).slice(0, 1) || '-'}
            </Avatar>
          );
        },
      },
      {
        title: '支付通道名称',
        key: 'name',
        width: 180,
        render: (_, record) =>
          readText(
            record.payment_name,
            record.channel_name,
            record.name,
            record.title,
          ) || '-',
      },
      {
        title: '支付通道描述',
        key: 'description',
        width: 240,
        render: (_, record) =>
          readText(
            record.payment_desc,
            record.channel_desc,
            record.description,
            record.information,
            record.desc,
          ) || '-',
      },
      {
        title: '开启通道',
        key: 'open',
        width: 130,
        align: 'center',
        render: (_, record) => {
          const type: AgentPaymentSwitchType = 'channel';
          const loadingKey = getSwitchLoadingKey(type, record);
          return (
            <Switch
              size="small"
              checked={readSwitchState(
                record.open,
                record.is_open,
                record.status,
                record.open_status,
                record.state,
              )}
              loading={!!switchingKeys[loadingKey]}
              disabled={!switchEnabled || !getPaymentId(record)}
              onChange={(checked) => {
                void handleSwitchChange(type, checked, record);
              }}
            />
          );
        },
      },
      {
        title: '开启服务商配置',
        key: 'serviceConfig',
        width: 160,
        align: 'center',
        render: (_, record) => {
          const type: AgentPaymentSwitchType = 'serviceConfig';
          const loadingKey = getSwitchLoadingKey(type, record);
          return (
            <Switch
              size="small"
              checked={readSwitchState(
                record.service_config,
                record.service_status,
                record.is_service_config,
                record.open_service_config,
              )}
              loading={!!switchingKeys[loadingKey]}
              disabled={!switchEnabled || !getPaymentId(record)}
              onChange={(checked) => {
                void handleSwitchChange(type, checked, record);
              }}
            />
          );
        },
      },
      {
        title: '开启商户号配置',
        key: 'merchantConfig',
        width: 160,
        align: 'center',
        render: (_, record) => {
          const type: AgentPaymentSwitchType = 'merchantConfig';
          const loadingKey = getSwitchLoadingKey(type, record);
          return (
            <Switch
              size="small"
              checked={readSwitchState(
                record.merchant_config,
                record.merchant_status,
                record.is_merchant_config,
                record.mch_config,
                record.is_mch_config,
              )}
              loading={!!switchingKeys[loadingKey]}
              disabled={!switchEnabled || !getPaymentId(record)}
              onChange={(checked) => {
                void handleSwitchChange(type, checked, record);
              }}
            />
          );
        },
      },
      {
        title: '开启支付路由配置',
        key: 'routeConfig',
        width: 170,
        align: 'center',
        render: (_, record) => {
          const type: AgentPaymentSwitchType = 'routeConfig';
          const loadingKey = getSwitchLoadingKey(type, record);
          return (
            <Switch
              size="small"
              checked={readSwitchState(
                record.route_config,
                record.route_status,
                record.payment_route_config,
                record.is_route_config,
              )}
              loading={!!switchingKeys[loadingKey]}
              disabled={!switchEnabled || !getPaymentId(record)}
              onChange={(checked) => {
                void handleSwitchChange(type, checked, record);
              }}
            />
          );
        },
      },
    ],
    [current, handleSwitchChange, pageSize, switchingKeys],
  );

  return (
    <Modal
      title={agentName ? `支付通道 - ${agentName}` : '支付通道'}
      open={open}
      width={1120}
      footer={null}
      destroyOnClose
      onCancel={onCancel}
      className="agent-payment-channel-modal"
    >
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Table<AgentPaymentChannelRecord>
        rowKey={(record, index) =>
          readText(record.id, record.payment_id, record.channel_id) ||
          `${readText(record.payment_name, record.channel_name, record.name)}-${index}`
        }
        loading={loading}
        columns={columns}
        dataSource={records}
        scroll={{ x: 1230 }}
        locale={{
          emptyText: <Empty description="暂无支付通道数据" />,
        }}
        pagination={{
          ...pagination,
          onChange: (nextCurrent, nextPageSize) => {
            setPagination((prev) => ({
              ...prev,
              current: nextCurrent,
              pageSize: nextPageSize,
            }));
          },
        }}
      />
    </Modal>
  );
};

export default AgentPaymentChannelModal;
