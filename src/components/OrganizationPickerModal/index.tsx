import { Button, Input, Modal, message, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AgentOrgPageQueryParams,
  type AgentOrgRecord,
  getAgentOrgPageQuery,
} from '@/api/org';
import { getErrorMessage } from '@/utils/apiMessage';
import './index.less';

type OrganizationPickerModalProps = {
  open: boolean;
  onCancel: () => void;
  onSelect: (record: AgentOrgRecord) => void;
  selectedOrg?: AgentOrgRecord | null;
};

const DEFAULT_PAGE_SIZE = 10;

function getOrgPhone(record?: AgentOrgRecord | null) {
  return String(
    record?.contactPhone || record?.mobile || record?.phone || '',
  ).trim();
}

function buildOrgQueryParams(
  current: number,
  pageSize: number,
  keyword: string,
): AgentOrgPageQueryParams {
  const trimmedKeyword = keyword.trim();
  const params: AgentOrgPageQueryParams = {
    current,
    pageSize,
  };

  if (!trimmedKeyword) {
    return params;
  }

  if (/^[A-Za-z0-9_-]+$/.test(trimmedKeyword)) {
    params.orgCode = trimmedKeyword;
  } else {
    params.orgName = trimmedKeyword;
  }

  return params;
}

const columns: ColumnsType<AgentOrgRecord> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    render: (value: string) => String(value || '-'),
  },
  {
    title: '机构名称',
    dataIndex: 'orgName',
    width: 240,
    render: (value: string) => String(value || '-'),
  },
  {
    title: '联系电话',
    dataIndex: 'contactPhone',
    width: 180,
    render: (_, record) => getOrgPhone(record) || '-',
  },
];

const basePagination: TablePaginationConfig = {
  current: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
};

const OrganizationPickerModal: React.FC<OrganizationPickerModalProps> = ({
  open,
  onCancel,
  onSelect,
  selectedOrg,
}) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AgentOrgRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({
    keyword: '',
  });
  const [pagination, setPagination] =
    useState<TablePaginationConfig>(basePagination);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pendingSelection, setPendingSelection] =
    useState<AgentOrgRecord | null>(null);

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);

  useEffect(() => {
    if (!open) return;

    setKeyword('');
    setFilters({
      keyword: '',
    });
    setPagination(basePagination);
    if (selectedOrg?.id) {
      setSelectedRowKeys([selectedOrg.id]);
      setPendingSelection(selectedOrg);
    } else {
      setSelectedRowKeys([]);
      setPendingSelection(null);
    }
  }, [open, selectedOrg]);

  const loadOrganizations = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    try {
      const res = await getAgentOrgPageQuery(
        buildOrgQueryParams(current, pageSize, filters.keyword),
        {
          skipErrorHandler: true,
        },
      );
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setTotal(Number(res?.total || 0));
    } catch (error) {
      message.error(getErrorMessage(error, '获取机构列表失败'));
    } finally {
      setLoading(false);
    }
  }, [current, filters.keyword, open, pageSize]);

  useEffect(() => {
    if (!open) return;
    void loadOrganizations();
  }, [loadOrganizations, open]);

  const rowSelection = useMemo(
    () => ({
      type: 'radio' as const,
      selectedRowKeys,
      onChange: (
        nextSelectedRowKeys: React.Key[],
        selectedRows: AgentOrgRecord[],
      ) => {
        setSelectedRowKeys(nextSelectedRowKeys);
        setPendingSelection(selectedRows[0] || null);
      },
    }),
    [selectedRowKeys],
  );

  const handleSearch = () => {
    setFilters({
      keyword,
    });
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleReset = () => {
    setKeyword('');
    setFilters({
      keyword: '',
    });
    setPagination(basePagination);
  };

  const handleOk = () => {
    if (!pendingSelection) {
      message.warning('请选择机构');
      return;
    }

    onSelect(pendingSelection);
  };

  return (
    <Modal
      title="选择机构"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={1080}
      okText="确定"
      cancelText="取消"
      className="organization-picker-modal"
      destroyOnClose
    >
      <div className="organization-picker-filter-bar">
        <div className="organization-picker-filter-item organization-picker-filter-item-keyword">
          <span className="filter-item-label">关键字:</span>
          <Input
            placeholder="请输入机构名称/编号查询"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
            }}
            onPressEnter={handleSearch}
          />
        </div>
        <Button type="primary" onClick={handleSearch}>
          查询
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={records}
        columns={columns}
        rowSelection={rowSelection}
        pagination={{
          ...pagination,
          total,
          onChange: (nextCurrent, nextPageSize) => {
            setPagination((prev) => ({
              ...prev,
              current: nextCurrent,
              pageSize: nextPageSize,
            }));
          },
        }}
        locale={{
          emptyText: '暂无机构数据',
        }}
        onRow={(record) => ({
          onClick: () => {
            setSelectedRowKeys([record.id]);
            setPendingSelection(record);
          },
        })}
      />
    </Modal>
  );
};

export type { OrganizationPickerModalProps };
export default OrganizationPickerModal;
