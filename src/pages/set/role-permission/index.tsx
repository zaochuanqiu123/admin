import { InfoCircleFilled, PlusOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import {
  Alert,
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
  type RoleTerminalParams,
  saveRole,
  searchRole,
  updateRoleState,
} from '@/api/context';
import { PageSectionSkeleton } from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import './index.less';

type RoleItem = {
  id: string;
  roleCode?: string;
  roleName?: string;
  roleType?: number;
  state?: number;
  createTime?: string;
  permIds?: string[];
  isChangeable?: boolean;
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
const ROLE_TREE_GROUP_KEY_PREFIX = '__roleTreeGroup__';

type RolePermissionMeta = {
  key: string;
  permCode: string;
  terminalCode?: string;
  terminalName?: string;
  businessCode?: string;
  businessName?: string;
  businessVersionId?: string;
};

function getRoleTreeChildren(node: any): any[] {
  return (
    (Array.isArray(node?.children) && node.children) ||
    (Array.isArray(node?.childList) && node.childList) ||
    (Array.isArray(node?.child) && node.child) ||
    []
  );
}

function getRoleTreeTitle(node: any, index: number): string {
  const rawTitle =
    node?.terminalName ??
    node?.businessName ??
    node?.permName ??
    node?.name ??
    node?.title ??
    node?.menuName ??
    node?.text ??
    node?.label;
  const title = String(rawTitle ?? '').trim();
  return title || `未命名权限${index + 1}`;
}

function getRoleTreePermissionKey(node: any, index: number): string {
  const rawKey =
    node?.id ??
    node?.permId ??
    node?.menuId ??
    node?.targetId ??
    node?.pathUrl ??
    node?.permCode ??
    `${node?.name || node?.permName || 'node'}-${index}`;
  return String(rawKey);
}

function getRoleTreePermCode(node: any): string {
  const rawCode =
    node?.permCode ??
    node?.permissionCode ??
    node?.code ??
    node?.id ??
    node?.permId ??
    node?.menuId;
  if (rawCode === undefined || rawCode === null || rawCode === '') return '';
  return String(rawCode);
}

function getRoleGroupKey(
  type: 'terminal' | 'business',
  rawKey: unknown,
  index: number,
  parentKey?: string,
): string {
  const value = String(rawKey ?? index).trim() || String(index);
  return [ROLE_TREE_GROUP_KEY_PREFIX, type, parentKey, value]
    .filter(Boolean)
    .join(':');
}

function toRolePermissionNodes(
  nodes: any[],
  metaMap: Map<string, RolePermissionMeta>,
  context: Omit<RolePermissionMeta, 'key' | 'permCode'>,
): RoleTreeNode[] {
  return (nodes || []).map((node, index) => {
    const key = getRoleTreePermissionKey(node, index);
    const permCode = getRoleTreePermCode(node);
    const children = toRolePermissionNodes(
      getRoleTreeChildren(node),
      metaMap,
      context,
    );

    if (permCode) {
      metaMap.set(key, {
        ...context,
        key,
        permCode,
      });
    }

    return {
      key,
      title: getRoleTreeTitle(node, index),
      children: children.length > 0 ? children : undefined,
    };
  });
}

function toOrgRoleTreeData(nodes: any[]): {
  treeData: RoleTreeNode[];
  permissionMetaMap: Map<string, RolePermissionMeta>;
} {
  const permissionMetaMap = new Map<string, RolePermissionMeta>();
  const treeData = (nodes || []).map((terminalNode, terminalIndex) => {
    const terminalKey = getRoleGroupKey(
      'terminal',
      terminalNode?.terminalCode ?? terminalNode?.terminalName,
      terminalIndex,
    );
    const terminalName = String(terminalNode?.terminalName ?? '').trim();
    const terminalCode = String(terminalNode?.terminalCode ?? '').trim();
    const terminalChildren = getRoleTreeChildren(terminalNode);
    const children = terminalChildren.map((businessNode, businessIndex) => {
      const businessKey = getRoleGroupKey(
        'business',
        businessNode?.businessCode ?? businessNode?.businessName,
        businessIndex,
        terminalKey,
      );
      const businessName = String(businessNode?.businessName ?? '').trim();
      const businessCode = String(businessNode?.businessCode ?? '').trim();
      const businessVersionId = String(
        businessNode?.businessVersionId ?? '',
      ).trim();
      const permissionChildren = toRolePermissionNodes(
        getRoleTreeChildren(businessNode),
        permissionMetaMap,
        {
          terminalName,
          terminalCode,
          businessName,
          businessCode,
          businessVersionId,
        },
      );

      return {
        key: businessKey,
        title: getRoleTreeTitle(businessNode, businessIndex),
        children:
          permissionChildren.length > 0 ? permissionChildren : undefined,
      };
    });

    return {
      key: terminalKey,
      title: getRoleTreeTitle(terminalNode, terminalIndex),
      children: children.length > 0 ? children : undefined,
    };
  });

  return {
    treeData,
    permissionMetaMap,
  };
}

function extractOrgRoleTreeNodes(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.menuTree)) return res.menuTree;
  if (Array.isArray(res?.data?.menuTree)) return res.data.menuTree;
  return [];
}

function buildRoleTerminalList(
  checkedKeys: React.Key[],
  permissionMetaMap: Map<string, RolePermissionMeta>,
): RoleTerminalParams[] {
  const terminalMap = new Map<
    string,
    {
      terminalName?: string;
      terminalCode?: string;
      businessMap: Map<
        string,
        {
          businessCode?: string;
          businessName?: string;
          businessVersionId?: string;
          perms: Set<string>;
        }
      >;
    }
  >();

  checkedKeys.forEach((key) => {
    const meta = permissionMetaMap.get(String(key));
    if (!meta?.permCode) return;

    const terminalKey = meta.terminalCode || meta.terminalName || 'terminal';
    const businessKey = meta.businessCode || meta.businessName || 'business';
    const terminalItem = terminalMap.get(terminalKey) || {
      terminalName: meta.terminalName,
      terminalCode: meta.terminalCode,
      businessMap: new Map(),
    };
    const businessItem = terminalItem.businessMap.get(businessKey) || {
      businessCode: meta.businessCode,
      businessName: meta.businessName,
      businessVersionId: meta.businessVersionId,
      perms: new Set<string>(),
    };

    businessItem.perms.add(meta.permCode);
    terminalItem.businessMap.set(businessKey, businessItem);
    terminalMap.set(terminalKey, terminalItem);
  });

  return Array.from(terminalMap.values()).map((terminal) => ({
    terminalName: terminal.terminalName,
    terminalCode: terminal.terminalCode,
    terminalBusinessList: Array.from(terminal.businessMap.values()).map(
      (business) => ({
        businessCode: business.businessCode,
        businessName: business.businessName,
        businessVersionId: business.businessVersionId,
        perms: Array.from(business.perms),
      }),
    ),
  }));
}

function extractCheckedPermissionKeys(
  detail: any,
  metaMap: Map<string, RolePermissionMeta>,
) {
  const detailData = detail?.data ?? detail;
  if (Array.isArray(detailData?.permIds)) {
    const permIdSet = new Set(
      detailData.permIds.map((item: any) => String(item)),
    );
    return Array.from(metaMap.values())
      .filter((meta) => permIdSet.has(meta.key) || permIdSet.has(meta.permCode))
      .map((meta) => meta.key);
  }

  const perms = new Set<string>();
  const roleTerminalList = Array.isArray(detailData?.roleTerminalList)
    ? detailData.roleTerminalList
    : [];
  roleTerminalList.forEach((terminal: any) => {
    const businessList = Array.isArray(terminal?.terminalBusinessList)
      ? terminal.terminalBusinessList
      : [];
    businessList.forEach((business: any) => {
      if (Array.isArray(business?.perms)) {
        business.perms.forEach((perm: any) => {
          perms.add(String(perm));
        });
      }
    });
  });

  return Array.from(metaMap.values())
    .filter((meta) => perms.has(meta.permCode))
    .map((meta) => meta.key);
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
  const [permissionMetaMap, setPermissionMetaMap] = useState<
    Map<string, RolePermissionMeta>
  >(new Map());
  const [checkedPermIds, setCheckedPermIds] = useState<React.Key[]>([]);
  const [switchLoadingId, setSwitchLoadingId] = useState<string>();
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
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
  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  const loadRoles = useCallback(async () => {
    if (!currentOrgCode) {
      setRoles([]);
      setServerTotal(0);
      setListError(undefined);
      return;
    }

    setLoading(true);
    setListError(undefined);
    try {
      const searchValue = searchKeyword.trim();
      if (searchMode && searchValue) {
        const list = await searchRole(currentOrgCode, searchValue, {
          skipErrorHandler: true,
        });
        setRoles(Array.isArray(list) ? list : []);
        setServerTotal(Array.isArray(list) ? list.length : 0);
        return;
      }

      const pageRes = await getRolePageList(
        {
          current,
          pageSize,
          roleName: searchValue || undefined,
        } as RolePageListParams,
        {
          skipErrorHandler: true,
        },
      );
      setRoles(Array.isArray(pageRes?.records) ? pageRes.records : []);
      setServerTotal(Number(pageRes?.total || 0));
    } catch (error) {
      console.error('load roles failed:', error);
      const nextError = getErrorMessage(error, '获取角色列表失败，请稍后重试');
      setListError(nextError);
      message.error(nextError);
      return;
    } finally {
      setLoading(false);
      setListInitialized(true);
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
      if (record?.isChangeable === false) {
        message.warning('该角色不支持修改状态');
        return;
      }
      if (!record?.id) {
        message.warning('缺少角色ID，无法更新状态');
        return;
      }

      const nextState = checked ? 1 : 0;
      setSwitchLoadingId(String(record.id));
      try {
        const res = await updateRoleState(
          {
            id: String(record.id),
            state: nextState,
          },
          {
            skipErrorHandler: true,
          },
        );
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
        message.error(
          getErrorMessage(
            error,
            nextState === 1 ? '启用角色失败' : '禁用角色失败',
          ),
        );
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
            disabled={record.isChangeable === false}
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
        render: (_, record) => {
          const actionDisabled = record.isChangeable === false;

          return (
            <div className="role-permission-action-links">
              {actionDisabled ? (
                <span className="is-disabled">编辑</span>
              ) : (
                <a
                  onClick={() => {
                    void handleOpenEdit(record);
                  }}
                >
                  编辑
                </a>
              )}
              {actionDisabled ? (
                <span className="is-disabled is-danger-disabled">删除</span>
              ) : (
                <Popconfirm
                  title="确认删除该角色？"
                  onConfirm={() => {
                    void handleDeleteRole(record);
                  }}
                >
                  <a className="is-danger">删除</a>
                </Popconfirm>
              )}
            </div>
          );
        },
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
    setPermissionMetaMap(new Map());
    setPermTreeLoading(true);
    try {
      const res = await getOrgMenuTree(currentOrgCode, {
        skipErrorHandler: true,
      });
      const { treeData, permissionMetaMap: nextMetaMap } = toOrgRoleTreeData(
        extractOrgRoleTreeNodes(res),
      );
      setPermTreeData(treeData);
      setPermissionMetaMap(nextMetaMap);
    } catch (error) {
      console.error('getOrgMenuTree failed:', error);
      setPermTreeData([]);
      setPermissionMetaMap(new Map());
      message.error(getErrorMessage(error, '获取权限树失败'));
    } finally {
      setPermTreeLoading(false);
    }
  };

  const handleOpenEdit = async (record: RoleItem) => {
    if (record?.isChangeable === false) {
      message.warning('该角色不支持编辑');
      return;
    }
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
        getRoleDetail(String(record.id), {
          skipErrorHandler: true,
        }),
        getOrgMenuTree(currentOrgCode, {
          skipErrorHandler: true,
        }),
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
      const { treeData, permissionMetaMap: nextMetaMap } = toOrgRoleTreeData(
        extractOrgRoleTreeNodes(treeRes),
      );
      setPermTreeData(treeData);
      setPermissionMetaMap(nextMetaMap);
      setCheckedPermIds(extractCheckedPermissionKeys(detail, nextMetaMap));
    } catch (error) {
      console.error('open edit role failed:', error);
      setPermTreeData([]);
      setPermissionMetaMap(new Map());
      setCreateOpen(false);
      setEditingRole(null);
      message.error(getErrorMessage(error, '打开编辑角色失败'));
    } finally {
      setPermTreeLoading(false);
      setCreateLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const values = await form.validateFields();
      setCreateLoading(true);
      const roleTerminalList =
        Number(values.roleType) === 2
          ? buildRoleTerminalList(checkedPermIds, permissionMetaMap)
          : [];
      const res = editingRole?.id
        ? await editRole(
            {
              id: editingRole.id,
              roleName: values.roleName,
              roleType: values.roleType,
              state: values.state,
              roleTerminalList,
            },
            {
              skipErrorHandler: true,
            },
          )
        : await saveRole(
            {
              roleName: values.roleName,
              roleType: values.roleType,
              state: values.state,
              roleTerminalList,
            },
            {
              skipErrorHandler: true,
            },
          );
      message.success(
        getApiMessage(res, editingRole?.id ? '编辑角色成功' : '新增角色成功'),
      );
      setCreateOpen(false);
      setEditingRole(null);
      await loadRoles();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('saveRole failed:', error);
      message.error(
        getErrorMessage(
          error,
          editingRole?.id ? '编辑角色失败' : '新增角色失败',
        ),
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteRole = async (record: RoleItem) => {
    if (record?.isChangeable === false) {
      message.warning('该角色不支持删除');
      return;
    }
    if (!record?.id) {
      message.warning('缺少角色ID，无法删除');
      return;
    }

    try {
      const res = await deleteRole(String(record.id), {
        skipErrorHandler: true,
      });
      message.success(getApiMessage(res, '删除角色成功'));
      await loadRoles();
    } catch (error) {
      console.error('deleteRole failed:', error);
      message.error(getErrorMessage(error, '删除角色失败'));
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
        <div className="role-permission-section-title">角色列表</div>
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

        {initialListLoading ? (
          <PageSectionSkeleton rows={7} />
        ) : listError && roles.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<RoleItem>
            rowKey="id"
            loading={refreshingList}
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
        )}
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
          setPermissionMetaMap(new Map());
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
