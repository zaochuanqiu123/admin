import { DownOutlined, UserOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Switch,
  Table,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buyMerchantStore,
  getMerchantPage,
  type MerchantPageRecord,
} from '@/api/merchant';
import { modifyOrgState } from '@/api/store';
import {
  ExpandableFilterCard,
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { MERCHANT_PERMS } from '../merchant-perms';
import MerchantAppModal from './components/MerchantAppModal';
import MerchantBusinessModal from './components/MerchantBusinessModal';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;

type MerchantFilters = {
  name: string;
};

type MerchantListLine = {
  key: string;
  text: string;
  secondary?: boolean;
};

type StoreCountFormValues = {
  buyNum?: number;
};

function normalizeText(value?: string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function getMerchantStateText(state?: boolean) {
  return state ? '启用' : '停用';
}

function getSourceTypeText(value?: number) {
  if (value === 1) return '后台添加';
  if (value === 2) return '网站注册';
  if (value === undefined || value === null) return '-';
  return String(value);
}

function getAddressLines(record: MerchantPageRecord) {
  const region = [
    normalizeText(record.merchantProvince),
    normalizeText(record.merchantCity),
    normalizeText(record.merchantArea),
  ]
    .filter(Boolean)
    .join(' ');

  const detailAddress = normalizeText(record.merchantDetailAddress);
  const lines: MerchantListLine[] = [];

  if (region) {
    lines.push({
      key: 'region',
      text: region,
    });
  }

  if (detailAddress) {
    lines.push({
      key: 'detailAddress',
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

function renderLines(lines: MerchantListLine[]) {
  return (
    <div className="merchant-list-lines">
      {lines.map((item) => (
        <div
          key={item.key}
          className={item.secondary ? 'merchant-list-sub-text' : undefined}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}

function renderMerchantNameCell(record: MerchantPageRecord) {
  return (
    <div className="merchant-list-name-cell">
      <Avatar
        size={44}
        shape="square"
        src={normalizeText(record.logoUrl) || undefined}
        icon={<UserOutlined />}
        className="merchant-list-avatar"
      />
      {renderLines([
        {
          key: 'merchantName',
          text: normalizeText(record.merchantName) || '-',
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

const MerchantListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<MerchantPageRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [draftFilters, setDraftFilters] = useState<MerchantFilters>({
    name: '',
  });
  const [filters, setFilters] = useState<MerchantFilters>({
    name: '',
  });
  const [appModalRecord, setAppModalRecord] = useState<MerchantPageRecord>();
  const [businessModalRecord, setBusinessModalRecord] =
    useState<MerchantPageRecord>();
  const [storeCountModalRecord, setStoreCountModalRecord] =
    useState<MerchantPageRecord>();
  const [switchingOrgIds, setSwitchingOrgIds] = useState<
    Record<string, boolean>
  >({});
  const [storeCountSubmitting, setStoreCountSubmitting] = useState(false);
  const [storeCountForm] = Form.useForm<StoreCountFormValues>();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);

  const loadMerchantPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);
    try {
      const res = await getMerchantPage(
        {
          current,
          pageSize,
          name: filters.name.trim(),
        },
        {
          skipErrorHandler: true,
        },
      );
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load merchant page failed:', error);
      setListError(getErrorMessage(error, '获取商户列表失败'));
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [current, filters.name, pageSize]);

  useEffect(() => {
    void loadMerchantPage();
  }, [loadMerchantPage]);

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

  const handleCloseStoreCountModal = useCallback(() => {
    if (storeCountSubmitting) return;
    setStoreCountModalRecord(undefined);
    storeCountForm.resetFields();
  }, [storeCountForm, storeCountSubmitting]);

  const handleSubmitStoreCount = useCallback(async () => {
    const merchantOrgId = normalizeText(storeCountModalRecord?.orgId);
    if (!merchantOrgId) {
      message.error('当前商户缺少组织信息，无法购买门店数量');
      return;
    }

    try {
      const values = await storeCountForm.validateFields();
      setStoreCountSubmitting(true);
      const res = await buyMerchantStore(
        {
          merchantOrgId,
          buyNum: Number(values.buyNum || 0),
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(getApiMessage(res, '购买门店数量成功'));
      setStoreCountModalRecord(undefined);
      storeCountForm.resetFields();
      await loadMerchantPage();
    } catch (error) {
      if ((error as any)?.errorFields) return;
      console.error('buy merchant store count failed:', error);
      message.error(getErrorMessage(error, '购买门店数量失败'));
    } finally {
      setStoreCountSubmitting(false);
    }
  }, [loadMerchantPage, storeCountForm, storeCountModalRecord?.orgId]);

  const handleMerchantStateChange = useCallback(
    async (checked: boolean, record: MerchantPageRecord) => {
      const orgId = normalizeText(record.orgId);
      if (!orgId) {
        message.warning('当前商户缺少组织信息，无法修改状态');
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
          getApiMessage(res, checked ? '商户已启用' : '商户已停用'),
        );
      } catch (error) {
        console.error('modify merchant state failed:', error);
        message.error(getErrorMessage(error, '修改商户状态失败'));
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

  const columns = useMemo<ColumnsType<MerchantPageRecord>>(
    () => [
      {
        title: '商户名称',
        dataIndex: 'merchantName',
        width: 280,
        render: (_, record) => renderMerchantNameCell(record),
      },
      {
        title: '联系人',
        dataIndex: 'contactsName',
        width: 140,
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
            <div className="merchant-list-state-switch">
              <Switch
                checked={!!value}
                size="small"
                loading={!!(orgId && switchingOrgIds[orgId])}
                disabled={!orgId}
                onChange={(checked) => {
                  void handleMerchantStateChange(checked, record);
                }}
              />
              <span>{getMerchantStateText(!!value)}</span>
            </div>
          );
        },
      },
      {
        title: '来源渠道',
        dataIndex: 'sourceType',
        width: 130,
        render: (value) => getSourceTypeText(value),
      },
      {
        title: '门店信息',
        key: 'storeInfo',
        width: 180,
        render: (_, record) =>
          renderLines([
            {
              key: 'storeNum',
              text: `门店数：${Number(record.storeNum || 0)}`,
            },
            {
              key: 'remainingStoresToCreate',
              text: `待创建：${Number(record.remainingStoresToCreate || 0)}`,
              secondary: true,
            },
          ]),
      },
      {
        title: '商户地址',
        key: 'merchantAddress',
        width: 320,
        render: (_, record) => renderLines(getAddressLines(record)),
      },
      {
        title: '启用时间',
        dataIndex: 'beginTime',
        width: 180,
        render: (value) => value || '-',
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
        width: 180,
        fixed: 'right',
        render: (_, record) => (
          <div className="merchant-list-action-links">
            <Dropdown
              trigger={['click']}
              disabled={!normalizeText(record.orgId)}
              menu={{
                items: [
                  {
                    key: 'app',
                    label: '应用管理',
                  },
                  {
                    key: 'business',
                    label: '业态管理',
                  },
                  {
                    key: 'storeCount',
                    label: '购买门店',
                  },
                ],
                onClick: ({ key }) => {
                  if (key === 'app') {
                    setAppModalRecord(record);
                    return;
                  }
                  if (key === 'business') {
                    setBusinessModalRecord(record);
                    return;
                  }
                  setStoreCountModalRecord(record);
                },
              }}
            >
              <Button
                type="link"
                size="small"
                disabled={!normalizeText(record.orgId)}
              >
                管理 <DownOutlined />
              </Button>
            </Dropdown>
            <PermissionVisible perm={MERCHANT_PERMS.modify}>
              <Button
                type="link"
                size="small"
                disabled={!normalizeText(record.id)}
                onClick={() => {
                  history.push(`/merchant/list/${record.id}/edit`);
                }}
              >
                修改
              </Button>
            </PermissionVisible>
          </div>
        ),
      },
    ],
    [handleMerchantStateChange, switchingOrgIds],
  );

  const initialLoading = loading && !listInitialized;
  const refreshing = loading && listInitialized;

  return (
    <div className="merchant-list-page">
      <ExpandableFilterCard
        className="merchant-list-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={[
          {
            key: 'name',
            label: '商户名称',
            content: (
              <Input
                allowClear
                placeholder="请输入商户名称"
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

      <div className="content-card merchant-list-table-card">
        <div className="merchant-list-toolbar">
          <PermissionButton
            perm={MERCHANT_PERMS.add}
            type="primary"
            className="merchant-list-primary-action-btn"
            onClick={() => {
              history.push('/merchant/list/create');
            }}
          >
            新增商户
          </PermissionButton>
        </div>
        {initialLoading ? (
          <PageSectionSkeleton rows={6} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<MerchantPageRecord>
            rowKey={(record) =>
              String(record.id || record.orgId || record.orgCode)
            }
            loading={refreshing}
            columns={columns}
            dataSource={records}
            scroll={{ x: 1600 }}
            locale={{
              emptyText: <Empty description="暂无商户数据" />,
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

      <MerchantAppModal
        open={!!appModalRecord}
        orgId={normalizeText(appModalRecord?.orgId)}
        merchantName={normalizeText(appModalRecord?.merchantName)}
        onCancel={() => {
          setAppModalRecord(undefined);
        }}
      />

      <MerchantBusinessModal
        open={!!businessModalRecord}
        orgId={normalizeText(businessModalRecord?.orgId)}
        merchantName={normalizeText(businessModalRecord?.merchantName)}
        onCancel={() => {
          setBusinessModalRecord(undefined);
        }}
      />

      <Modal
        title="购买门店数量"
        open={!!storeCountModalRecord}
        confirmLoading={storeCountSubmitting}
        onOk={() => {
          void handleSubmitStoreCount();
        }}
        onCancel={handleCloseStoreCountModal}
        destroyOnClose
      >
        <Form<StoreCountFormValues>
          form={storeCountForm}
          layout="horizontal"
          colon={false}
          className="merchant-store-count-form"
        >
          <Form.Item
            label="门店数量"
            name="buyNum"
            rules={[
              {
                required: true,
                message: '请输入正确的门店数量',
              },
              {
                type: 'number',
                min: 1,
                message: '请输入正确的门店数量',
              },
            ]}
            extra="此处控制商户总可以添加的最大门店数量"
          >
            <InputNumber
              min={1}
              precision={0}
              controls={false}
              placeholder="请输入门店数量"
              className="merchant-store-count-input"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MerchantListPage;
