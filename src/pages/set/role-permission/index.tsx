import { InfoCircleFilled, PlusOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Table,
  Tree,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteRole,
  editRole,
  getOrgMenuTree,
  getRoleDetail,
  getRolePageList,
  type RolePageListParams,
  saveRole,
  searchRole,
  updateRoleState,
} from '@/api/context';
import { extractPermContextNodes } from '@/utils/menu';
import './index.less';

type RoleItem = {
  id: string;
  roleCode?: string;
  roleName?: string;
  roleType?: number;
  state?: number;
  createTime?: string;
  permIds?: string[];
};

type RoleTreeNode = {
  key: string;
  title: string;
  children?: RoleTreeNode[];
};

type CreateRoleFormValues = {
  roleName: string;
  roleType: number;
  state: number;
};

const DEFAULT_PAGE_SIZE = 10;

function toRoleTreeNodes(nodes: any[]): RoleTreeNode[] {
  return (nodes || [])
    .map((node: any, index: number): RoleTreeNode | null => {
      const rawKey =
        node?.id ??
        node?.permId ??
        node?.menuId ??
        node?.targetId ??
        node?.pathUrl ??
        `${node?.name || node?.permName || 'node'}-${index}`;
      const key = String(rawKey);
      const title = String(
        node?.permName ??
          node?.name ??
          node?.title ??
          node?.menuName ??
          node?.text ??
          node?.label ??
          '未命名权限',
      );
      const childSource =
        (Array.isArray(node?.children) && node.children) ||
        (Array.isArray(node?.childList) && node.childList) ||
        (Array.isArray(node?.child) && node.child) ||
        [];
      const children = toRoleTreeNodes(childSource);

      return {
        key,
        title,
        children: children.length > 0 ? children : undefined,
      };
    })
    .filter((item): item is RoleTreeNode => item !== null);
}

function getApiMessage(res: any, fallback: string): string {
  const value = res?.message ?? res?.msg ?? res?.data;
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

const RolePermissionPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [permTreeLoading, setPermTreeLoading] = useState(false);
  const [permTreeData, setPermTreeData] = useState<RoleTreeNode[]>([]);
  const [checkedPermIds, setCheckedPermIds] = useState<React.Key[]>([]);
  const [switchLoadingId, setSwitchLoadingId] = useState<string>();
  const [form] = Form.useForm<CreateRoleFormValues>();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });
  const [serverTotal, setServerTotal] = useState(0);

  const currentOrgCode = initialState?.currentOrgCode;
  const current = pagination.current || 1;
  const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;
  const currentRoleType = Form.useWatch('roleType', form);

  const loadRoles = useCallback(async () => {
    if (!currentOrgCode) {
      setRoles([]);
      setServerTotal(0);
      return;
    }

    setLoading(true);
    try {
      const searchValue = searchKeyword.trim();
      if (searchMode && searchValue) {
        const list = await searchRole(currentOrgCode, searchValue);
        setRoles(Array.isArray(list) ? list : []);
        setServerTotal(Array.isArray(list) ? list.length : 0);
        return;
      }

      const pageRes = await getRolePageList({
        current,
        pageSize,
        roleName: searchValue || undefined,
      } as RolePageListParams);
      setRoles(Array.isArray(pageRes?.records) ? pageRes.records : []);
      setServerTotal(Number(pageRes?.total || 0));
    } catch (error) {
      console.error('load roles failed:', error);
      setRoles([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [current, currentOrgCode, pageSize, searchKeyword, searchMode]);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      await loadRoles();
      if (disposed) return;
    })();

    return () => {
      disposed = true;
    };
  }, [loadRoles]);

  const handleToggleRoleState = useCallback(
    async (record: RoleItem, checked: boolean) => {
      if (!record?.id) {
        message.warning('缺少角色ID，无法更新状态');
        return;
      }

      const nextState = checked ? 1 : 0;
      setSwitchLoadingId(String(record.id));
      try {
        const res = await updateRoleState({
          id: String(record.id),
          state: nextState,
        });
        setRoles((prev) =>
          prev.map((item) =>
            String(item.id) === String(record.id)
              ? {
                  ...item,
                  state: nextState,
                }
              : item,
          ),
        );
        message.success(
          getApiMessage(res, nextState === 1 ? '启用成功' : '禁用成功'),
        );
      } catch (error) {
        console.error('updateRoleState failed:', error);
      } finally {
        setSwitchLoadingId(undefined);
      }
    },
    [],
  );

  const columns = useMemo<ColumnsType<RoleItem>>(
    () => [
      {
        title: '角色名称',
        dataIndex: 'roleName',
        ellipsis: true,
      },
      {
        title: '状态',
        dataIndex: 'state',
        width: 120,
        render: (_, record) => (
          <Switch
            checked={Number(record.state) === 1}
            loading={switchLoadingId === String(record.id)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            onChange={(checked) => {
              void handleToggleRoleState(record, checked);
            }}
          />
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        ellipsis: true,
      },
      {
        title: '操作',
        key: 'action',
        width: 140,
        render: (_, record) => (
          <div className="role-permission-action-links">
            <a
              onClick={() => {
                void handleOpenEdit(record);
              }}
            >
              编辑
            </a>
            <Popconfirm
              title="确认删除该角色？"
              onConfirm={() => {
                void handleDeleteRole(record);
              }}
            >
              <a className="is-danger">删除</a>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [handleToggleRoleState, switchLoadingId],
  );

  const pagedRoles = searchMode
    ? roles.slice((current - 1) * pageSize, current * pageSize)
    : roles;

  const handleSearch = () => {
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
    setSearchKeyword(keyword.trim());
    setSearchMode(true);
  };

  const handleResetSearch = () => {
    setKeyword('');
    setSearchKeyword('');
    setSearchMode(false);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleOpenCreate = async () => {
    if (!currentOrgCode) {
      message.warning('暂无机构编码，无法新增角色');
      return;
    }

    setEditingRole(null);
    setCreateOpen(true);
    form.setFieldsValue({
      roleName: '',
      roleType: 2,
      state: 1,
    });
    setCheckedPermIds([]);
    setPermTreeLoading(true);
    try {
      const res = await getOrgMenuTree(currentOrgCode);
      const treeSource = extractPermContextNodes(res);
      setPermTreeData(toRoleTreeNodes(treeSource));
    } catch (error) {
      console.error('getOrgMenuTree failed:', error);
      setPermTreeData([]);
    } finally {
      setPermTreeLoading(false);
    }
  };

  const handleOpenEdit = async (record: RoleItem) => {
    if (!currentOrgCode) {
      message.warning('暂无机构编码，无法编辑角色');
      return;
    }
    if (!record?.id) {
      message.warning('缺少角色ID，无法编辑');
      return;
    }

    setCreateLoading(true);
    setCreateOpen(true);
    setPermTreeLoading(true);
    try {
      const [detailRes, treeRes] = await Promise.all([
        getRoleDetail(String(record.id)),
        getOrgMenuTree(currentOrgCode),
      ]);
      const detail = detailRes?.data ?? detailRes;
      setEditingRole({
        ...record,
        ...detail,
      });
      form.setFieldsValue({
        roleName: detail?.roleName || '',
        roleType: Number(detail?.roleType ?? 2),
        state: Number(detail?.state ?? 1),
      });
      setCheckedPermIds(
        Array.isArray(detail?.permIds)
          ? detail.permIds.map((item: any) => String(item))
          : [],
      );
      const treeSource = extractPermContextNodes(treeRes);
      setPermTreeData(toRoleTreeNodes(treeSource));
    } catch (error) {
      console.error('open edit role failed:', error);
      setPermTreeData([]);
      setCreateOpen(false);
      setEditingRole(null);
    } finally {
      setPermTreeLoading(false);
      setCreateLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const values = await form.validateFields();
      setCreateLoading(true);
      const permIds =
        Number(values.roleType) === 2
          ? checkedPermIds.map((item) => String(item))
          : [];
      const res = editingRole?.id
        ? await editRole({
            id: editingRole.id,
            roleName: values.roleName,
            roleType: values.roleType,
            state: values.state,
            permIds,
          })
        : await saveRole({
            roleName: values.roleName,
            roleType: values.roleType,
            state: values.state,
            permIds,
          });
      message.success(
        getApiMessage(res, editingRole?.id ? '编辑角色成功' : '新增角色成功'),
      );
      setCreateOpen(false);
      setEditingRole(null);
      await loadRoles();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('saveRole failed:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteRole = async (record: RoleItem) => {
    if (!record?.id) {
      message.warning('缺少角色ID，无法删除');
      return;
    }

    try {
      const res = await deleteRole(String(record.id));
      message.success(getApiMessage(res, '删除角色成功'));
      await loadRoles();
    } catch (error) {
      console.error('deleteRole failed:', error);
    }
  };

  return (
    <div className="role-permission-page">
      <div className="role-permission-info-banner">
        <InfoCircleFilled className="role-permission-info-icon" />
        <span>
          新增角色后，请按实际业务勾选对应菜单权限，保存成功后该角色即可在当前机构下生效。
        </span>
      </div>

      <div className="role-permission-content-card">
        <div className="role-permission-section-title">角色权限</div>
        <div className="role-permission-toolbar">
          <div className="role-permission-toolbar-left">
            <span className="field-label">角色名称</span>
            <Input
              value={keyword}
              allowClear
              placeholder="请输入角色名称"
              className="role-permission-search-input"
              onChange={(event) => {
                setKeyword(event.target.value);
              }}
              onPressEnter={handleSearch}
            />
            <Button onClick={handleSearch}>搜索</Button>
            <Button onClick={handleResetSearch}>重置</Button>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="role-permission-create-btn"
            onClick={handleOpenCreate}
          >
            新增角色
          </Button>
        </div>

        <Table<RoleItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={pagedRoles}
          locale={{
            emptyText: currentOrgCode ? (
              <Empty description="暂无角色数据" />
            ) : (
              '暂无机构编码'
            ),
          }}
          pagination={{
            ...pagination,
            total: searchMode ? roles.length : serverTotal,
            onChange: (nextCurrent, nextPageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: nextCurrent,
                pageSize: nextPageSize,
              }));
            },
          }}
        />
      </div>

      <Modal
        title={editingRole?.id ? '编辑角色' : '新增角色'}
        open={createOpen}
        width={760}
        confirmLoading={createLoading}
        destroyOnClose
        onCancel={() => {
          setCreateOpen(false);
          setEditingRole(null);
        }}
        onOk={handleCreateRole}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            roleType: 2,
            state: 1,
          }}
        >
          <div className="role-create-form-grid">
            <Form.Item
              label="角色名称"
              name="roleName"
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input placeholder="请输入角色名称" maxLength={30} />
            </Form.Item>
            <Form.Item
              label="角色类型"
              name="roleType"
              rules={[{ required: true, message: '请选择角色类型' }]}
            >
              <Select
                options={[
                  { label: '管理员角色', value: 1 },
                  { label: '普通角色', value: 2 },
                ]}
              />
            </Form.Item>
          </div>

          <div className="role-create-form-grid">
            <Form.Item
              label="状态"
              name="state"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select
                options={[
                  { label: '启用', value: 1 },
                  { label: '禁用', value: 0 },
                ]}
              />
            </Form.Item>
          </div>

          {Number(currentRoleType) === 2 && (
            <Form.Item label="权限配置">
              <div className="role-permission-tree-panel">
                <Spin spinning={permTreeLoading}>
                  <div className="role-permission-tree-scroll">
                    <Tree
                      checkable
                      defaultExpandAll
                      selectable={false}
                      treeData={permTreeData}
                      checkedKeys={checkedPermIds}
                      onCheck={(checked) => {
                        setCheckedPermIds(
                          Array.isArray(checked) ? checked : checked.checked,
                        );
                      }}
                    />
                  </div>
                </Spin>
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default RolePermissionPage;
