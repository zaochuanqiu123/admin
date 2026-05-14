import { DownOutlined, UserOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Dropdown,
  Empty,
  Input,
  message,
  Popconfirm,
  Switch,
  Table,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type AgentPageRecord, deleteAgent, getAgentPage } from '@/api/agent';
import { modifyOrgState } from '@/api/store';
import {
  ExpandableFilterCard,
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { AGENT_PERMS } from '../agent-perms';
import AgentPaymentChannelModal from './components/AgentPaymentChannelModal';
import AgentPlugModal from './components/AgentPlugModal';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;

type AgentFilters = {
  name: string;
};

type AgentListLine = {
  key: string;
  text: string;
  secondary?: boolean;
};

function normalizeText(value?: string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function getAgentStateText(state?: boolean) {
  return state ? '启用' : '停用';
}

function getAddressLines(record: AgentPageRecord) {
  const region = [
    normalizeText(record.province),
    normalizeText(record.city),
    normalizeText(record.area),
  ]
    .filter(Boolean)
    .join(' ');

  const detailAddress = normalizeText(record.address);
  const lines: AgentListLine[] = [];

  if (region) {
    lines.push({
      key: 'region',
      text: region,
    });
  }

  if (detailAddress) {
    lines.push({
      key: 'address',
      text: detailAddress,
      secondary: lines.length > 0,
    });
  }

  return lines.length > 0
    ? lines
    : [
        {
          key: 'empty',
          text: '-',
        },
      ];
}

function renderLines(lines: AgentListLine[]) {
  return (
    <div className="agent-list-lines">
      {lines.map((item) => (
        <div
          key={item.key}
          className={item.secondary ? 'agent-list-sub-text' : undefined}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}

function renderAgentNameCell(record: AgentPageRecord) {
  return (
    <div className="agent-list-name-cell">
      <Avatar
        size={44}
        shape="square"
        src={normalizeText(record.logoUrl) || undefined}
        icon={<UserOutlined />}
        className="agent-list-avatar"
      />
      {renderLines([
        {
          key: 'name',
          text: normalizeText(record.name) || '-',
        },
        {
          key: 'orgCode',
          text: normalizeText(record.orgCode)
            ? `组织编码：${normalizeText(record.orgCode)}`
            : '-',
          secondary: true,
        },
      ])}
    </div>
  );
}

const AgentListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<AgentPageRecord[]>([]);
  const recordsLengthRef = useRef(0);
  const [serverTotal, setServerTotal] = useState(0);
  const [draftFilters, setDraftFilters] = useState<AgentFilters>({
    name: '',
  });
  const [filters, setFilters] = useState<AgentFilters>({
    name: '',
  });
  const [switchingOrgIds, setSwitchingOrgIds] = useState<
    Record<string, boolean>
  >({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [paymentChannelModalRecord, setPaymentChannelModalRecord] =
    useState<AgentPageRecord>();
  const [plugModalRecord, setPlugModalRecord] = useState<AgentPageRecord>();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);

  const loadAgentPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);
    try {
      const res = await getAgentPage(
        {
          current,
          pageSize,
          name: filters.name.trim(),
        },
        {
          skipErrorHandler: true,
        },
      );
      const nextRecords = Array.isArray(res?.records) ? res.records : [];
      recordsLengthRef.current = nextRecords.length;
      setRecords(nextRecords);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load agent page failed:', error);
      const errorMessage = getErrorMessage(error, '获取代理商列表失败');
      setListError(errorMessage);
      if (recordsLengthRef.current > 0) {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [current, filters.name, pageSize]);

  useEffect(() => {
    void loadAgentPage();
  }, [loadAgentPage]);

  const handleSearch = () => {
    setFilters({
      name: draftFilters.name.trim(),
    });
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleReset = () => {
    const nextFilters = {
      name: '',
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleAgentStateChange = useCallback(
    async (checked: boolean, record: AgentPageRecord) => {
      const orgId = normalizeText(record.orgId);
      if (!orgId) {
        message.warning('当前代理商缺少组织信息，无法修改状态');
        return;
      }

      setSwitchingOrgIds((prev) => ({
        ...prev,
        [orgId]: true,
      }));

      try {
        const res = await modifyOrgState(orgId, { skipErrorHandler: true });
        setRecords((prev) =>
          prev.map((item) =>
            normalizeText(item.orgId) === orgId
              ? {
                  ...item,
                  state: checked,
                }
              : item,
          ),
        );
        message.success(
          getApiMessage(res, checked ? '代理商已启用' : '代理商已停用'),
        );
      } catch (error) {
        console.error('modify agent state failed:', error);
        message.error(getErrorMessage(error, '修改代理商状态失败'));
      } finally {
        setSwitchingOrgIds((prev) => {
          const next = { ...prev };
          delete next[orgId];
          return next;
        });
      }
    },
    [],
  );

  const handleDeleteAgent = useCallback(
    async (record: AgentPageRecord) => {
      const id = normalizeText(record.id);
      if (!id) {
        message.warning('当前代理商缺少ID，无法删除');
        return;
      }

      setDeletingIds((prev) => ({
        ...prev,
        [id]: true,
      }));

      try {
        const res = await deleteAgent(id, { skipErrorHandler: true });
        message.success(getApiMessage(res, '删除代理商成功'));
        const shouldBackToPrevPage = records.length === 1 && current > 1;
        if (shouldBackToPrevPage) {
          setPagination((prev) => ({
            ...prev,
            current: Math.max(1, Number(prev.current || 1) - 1),
          }));
        } else {
          await loadAgentPage();
        }
      } catch (error) {
        console.error('delete agent failed:', error);
        message.error(getErrorMessage(error, '删除代理商失败'));
      } finally {
        setDeletingIds((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [current, loadAgentPage, records.length],
  );

  const columns = useMemo<ColumnsType<AgentPageRecord>>(
    () => [
      {
        title: '代理商名称',
        dataIndex: 'name',
        width: 280,
        render: (_, record) => renderAgentNameCell(record),
      },
      {
        title: '联系人',
        dataIndex: 'contactsName',
        width: 140,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '联系电话',
        dataIndex: 'contactsPhone',
        width: 150,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '状态',
        dataIndex: 'state',
        width: 130,
        render: (value, record) => {
          const orgId = normalizeText(record.orgId);
          return (
            <div className="agent-list-state-switch">
              <Switch
                checked={!!value}
                size="small"
                loading={!!(orgId && switchingOrgIds[orgId])}
                disabled={!orgId}
                onChange={(checked) => {
                  void handleAgentStateChange(checked, record);
                }}
              />
              <span>{getAgentStateText(!!value)}</span>
            </div>
          );
        },
      },
      {
        title: '代理商地址',
        key: 'agentAddress',
        width: 320,
        render: (_, record) => renderLines(getAddressLines(record)),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 180,
        render: (value) => value || '-',
      },
      {
        title: '操作',
        key: 'action',
        width: 210,
        fixed: 'right',
        render: (_, record) => {
          const id = normalizeText(record.id);
          const orgId = normalizeText(record.orgId);
          const oldOrgId = normalizeText(record.oldOrgId);
          return (
            <div className="agent-list-action-links">
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'paymentChannel',
                      label: '支付通道',
                    },
                    {
                      key: 'plug',
                      label: '功能应用',
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'paymentChannel') {
                      if (!oldOrgId) {
                        message.warning(
                          '当前代理商缺少 oldOrgId，无法打开支付通道',
                        );
                        return;
                      }
                      setPaymentChannelModalRecord(record);
                      return;
                    }
                    if (!orgId) {
                      message.warning('当前代理商缺少 orgId，无法打开功能应用');
                      return;
                    }
                    setPlugModalRecord(record);
                  },
                }}
              >
                <Button type="link" size="small">
                  更多 <DownOutlined />
                </Button>
              </Dropdown>
              <PermissionVisible perm={AGENT_PERMS.modify}>
                <Button
                  type="link"
                  size="small"
                  disabled={!id}
                  onClick={() => {
                    history.push(`/agent/list/${record.id}/edit`);
                  }}
                >
                  修改
                </Button>
              </PermissionVisible>
              <PermissionVisible perm={AGENT_PERMS.delete}>
                <Popconfirm
                  title="确认删除该代理商？"
                  description="删除后不可恢复，请谨慎操作。"
                  okText="删除"
                  okButtonProps={{
                    danger: true,
                    loading: !!(id && deletingIds[id]),
                  }}
                  cancelText="取消"
                  onConfirm={() => handleDeleteAgent(record)}
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    disabled={!id || !!(id && deletingIds[id])}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </PermissionVisible>
            </div>
          );
        },
      },
    ],
    [deletingIds, handleAgentStateChange, handleDeleteAgent, switchingOrgIds],
  );

  const initialLoading = loading && !listInitialized;
  const refreshing = loading && listInitialized;

  return (
    <div className="agent-list-page">
      <ExpandableFilterCard
        className="agent-list-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={[
          {
            key: 'name',
            label: '代理商名称',
            content: (
              <Input
                allowClear
                placeholder="请输入代理商名称"
                value={draftFilters.name}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
        ]}
      />

      <div className="content-card agent-list-table-card">
        <div className="agent-list-toolbar">
          <PermissionButton
            perm={AGENT_PERMS.add}
            type="primary"
            className="agent-list-primary-action-btn"
            onClick={() => {
              history.push('/agent/list/create');
            }}
          >
            新增代理商
          </PermissionButton>
        </div>
        {initialLoading ? (
          <PageSectionSkeleton rows={6} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<AgentPageRecord>
            rowKey={(record) =>
              String(record.id || record.orgId || record.orgCode)
            }
            loading={refreshing}
            columns={columns}
            dataSource={records}
            scroll={{ x: 1460 }}
            locale={{
              emptyText: <Empty description="暂无代理商数据" />,
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

      <AgentPaymentChannelModal
        open={!!paymentChannelModalRecord}
        agentId={normalizeText(paymentChannelModalRecord?.oldOrgId)}
        agentName={normalizeText(paymentChannelModalRecord?.name)}
        onCancel={() => {
          setPaymentChannelModalRecord(undefined);
        }}
      />

      <AgentPlugModal
        open={!!plugModalRecord}
        orgId={normalizeText(plugModalRecord?.orgId)}
        agentName={normalizeText(plugModalRecord?.name)}
        onCancel={() => {
          setPlugModalRecord(undefined);
        }}
      />
    </div>
  );
};

export default AgentListPage;
