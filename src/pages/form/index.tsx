import {
  DownOutlined,
  InfoCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { history, useAccess } from '@umijs/max';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  type MenuProps,
  message,
  Popconfirm,
  Result,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getStorePage,
  modifyOrgState,
  modifyStoreMiniApp,
  modifyStoreType,
  type StorePageRecord,
} from '@/api/store';
import { PermissionButton, PermissionVisible } from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import StoreQrCodeModal, {
  type StoreQrCodeModalPayload,
} from './components/StoreQrCodeModal';
import { STORE_PERMS } from './store-perms';
import './index.less';

type StoreItem = {
  key: string;
  storeId: string;
  orgId: string;
  storeThumb: string;
  storeName: string;
  storeClassText: string;
  isDirectStore: boolean;
  isMainStore: boolean;
  miniAppEnabled: boolean;
  storeState: boolean;
  storeAddress: string;
  storeAddressDetail: string;
  storeCode: string;
  statusText: string;
};

type StoreFilters = {
  name: string;
  storeCode: string;
  region: string;
  branch: string;
  status: string;
};

const DEFAULT_PAGE_SIZE = 10;
const INITIAL_FILTERS: StoreFilters = {
  name: '',
  storeCode: '',
  region: '',
  branch: '',
  status: '',
};

function readText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function mapStoreStateToText(state?: boolean): string {
  return state === false ? '已停用' : '已创建';
}

function mapStoreClassToText(storeClass?: number): string {
  return Number(storeClass) === 2 ? '加盟店' : '直营店';
}

function isMainStoreType(storeType?: number): boolean {
  return Number(storeType) === 0;
}

function mapStoreRecord(record: StorePageRecord): StoreItem {
  const region = [
    readText(record.storeProvince),
    readText(record.storeCity),
    readText(record.storeArea),
  ].filter(Boolean);
  const storeId =
    readText(record.id) ||
    readText(record.orgId) ||
    readText(record.orgCode) ||
    [
      readText(record.storeName),
      readText(record.storeProvince),
      readText(record.storeCity),
    ]
      .filter(Boolean)
      .join('-') ||
    '-';
  return {
    key: storeId,
    storeId,
    orgId: readText(record.orgId) || readText(record.id),
    storeThumb: readText(record.logoId) || readText(record.shopImgId),
    storeName: readText(record.storeName) || '-',
    storeClassText: mapStoreClassToText(record.storeClass),
    isDirectStore: Number(record.storeClass) !== 2,
    isMainStore: isMainStoreType(record.storeType),
    miniAppEnabled: record.wxMiniAppStatus !== false,
    storeState: record.state !== false,
    storeAddress: region.length ? region.join('/') : '-',
    storeAddressDetail: readText(record.storeDetailAddress) || '-',
    storeCode:
      readText(record.orgCode) ||
      readText(record.oldOrgId) ||
      readText(record.id) ||
      '-',
    statusText: mapStoreStateToText(record.state),
  };
}

const StorePage: React.FC = () => {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const canViewStorePage = !!access?.hasButtonPerm?.(STORE_PERMS.page);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [qrModalPayload, setQrModalPayload] =
    useState<StoreQrCodeModalPayload | null>(null);
  const [isScrollAtRightEnd, setIsScrollAtRightEnd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [switchingOrgIds, setSwitchingOrgIds] = useState<
    Record<string, boolean>
  >({});
  const [switchingMainStoreIds, setSwitchingMainStoreIds] = useState<
    Record<string, boolean>
  >({});
  const [switchingMiniAppIds, setSwitchingMiniAppIds] = useState<
    Record<string, boolean>
  >({});
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<StoreFilters>(INITIAL_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<StoreFilters>(INITIAL_FILTERS);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const hasSelectedStores = selectedRowKeys.length > 0;

  const handleOpenQrModal = useCallback(
    (scene: 'store' | 'merchant', record: StoreItem) => {
      setQrModalPayload({
        scene,
        storeName: record.storeName,
        storeCode: record.storeCode,
        sid: record.storeId,
        mid: record.orgId,
      });
    },
    [],
  );

  const handleStoreStateChange = useCallback(
    async (checked: boolean, record: StoreItem) => {
      const orgId = String(record.orgId || '').trim();
      if (!orgId) {
        message.warning('缺少组织 ID，无法修改状态');
        return;
      }
      setSwitchingOrgIds((prev) => ({
        ...prev,
        [orgId]: true,
      }));
      try {
        const res = await modifyOrgState(orgId, { skipErrorHandler: true });
        setStores((prev) =>
          prev.map((item) =>
            item.orgId === orgId
              ? {
                  ...item,
                  storeState: checked,
                  statusText: mapStoreStateToText(checked),
                }
              : item,
          ),
        );
        message.success(
          getApiMessage(res, checked ? '门店已启用' : '门店已停用'),
        );
      } catch (error) {
        message.error(getErrorMessage(error, '修改门店状态失败'));
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

  const handleMainStoreChange = useCallback(
    async (checked: boolean, record: StoreItem) => {
      const storeId = String(record.storeId || '').trim();
      if (!storeId || storeId === '-') {
        message.warning('缺少门店 ID，无法设置主店');
        return;
      }
      setSwitchingMainStoreIds((prev) => ({
        ...prev,
        [storeId]: true,
      }));
      try {
        const res = await modifyStoreType(storeId, { skipErrorHandler: true });
        setStores((prev) =>
          prev.map((item) => {
            if (checked) {
              return {
                ...item,
                isMainStore: item.storeId === storeId,
              };
            }
            if (item.storeId !== storeId) {
              return item;
            }
            return {
              ...item,
              isMainStore: false,
            };
          }),
        );
        message.success(
          getApiMessage(res, checked ? '已设置为主店' : '已取消主店'),
        );
      } catch (error) {
        message.error(getErrorMessage(error, '设置主店失败'));
      } finally {
        setSwitchingMainStoreIds((prev) => {
          const next = { ...prev };
          delete next[storeId];
          return next;
        });
      }
    },
    [],
  );

  const handleMiniAppChange = useCallback(
    async (checked: boolean, record: StoreItem) => {
      const storeId = String(record.storeId || '').trim();
      if (!storeId || storeId === '-') {
        message.warning('缺少门店 ID，无法设置私域商城');
        return;
      }
      setSwitchingMiniAppIds((prev) => ({
        ...prev,
        [storeId]: true,
      }));
      try {
        const res = await modifyStoreMiniApp(storeId, {
          skipErrorHandler: true,
        });
        setStores((prev) =>
          prev.map((item) =>
            item.storeId === storeId
              ? {
                  ...item,
                  miniAppEnabled: checked,
                }
              : item,
          ),
        );
        message.success(
          getApiMessage(res, checked ? '私域商城已开启' : '私域商城已关闭'),
        );
      } catch (error) {
        message.error(getErrorMessage(error, '设置私域商城失败'));
      } finally {
        setSwitchingMiniAppIds((prev) => {
          const next = { ...prev };
          delete next[storeId];
          return next;
        });
      }
    },
    [],
  );

  const columns = useMemo<ColumnsType<StoreItem>>(
    () => [
      {
        title: '门店信息',
        key: 'storeInfo',
        width: 260,
        render: (_, record) => (
          <div className="store-info-cell">
            <div className="store-info-thumb-wrap">
              {record.storeThumb ? (
                <img
                  src={record.storeThumb}
                  alt={record.storeName}
                  className="store-info-thumb"
                />
              ) : (
                <div className="store-info-thumb store-info-thumb-fallback">
                  {record.storeName.slice(0, 1) || '店'}
                </div>
              )}
            </div>
            <div className="store-info-content">
              <div className="store-info-name-row">
                <span className="store-info-name">{record.storeName}</span>
              </div>
              <div className="store-info-tags">
                <Tag color="blue">{record.storeClassText}</Tag>
                {record.isDirectStore && record.isMainStore ? (
                  <Tag color="green">主店</Tag>
                ) : null}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: '地址',
        dataIndex: 'storeAddress',
        width: 280,
        render: (_value, record) => (
          <div className="store-address-cell">
            <div className="address-text">
              <div>{record.storeAddress}</div>
              <div className="address-detail">{record.storeAddressDetail}</div>
            </div>
          </div>
        ),
      },
      {
        title: '门店编号',
        dataIndex: 'storeCode',
        width: 220,
      },
      {
        title: (
          <span className="status-column-title u-inline-flex-center">
            门店状态 <InfoCircleOutlined />
          </span>
        ),
        dataIndex: 'storeState',
        width: 170,
        render: (value, record) => (
          <div className="store-status-switch">
            <Switch
              checked={!!value}
              size="small"
              loading={!!switchingOrgIds[record.orgId]}
              disabled={!record.orgId}
              onChange={(checked) => {
                void handleStoreStateChange(checked, record);
              }}
            />
            <span>{mapStoreStateToText(!!value)}</span>
          </div>
        ),
      },
      {
        title: '设置主店',
        dataIndex: 'isMainStore',
        width: 170,
        render: (value, record) => (
          <div className="store-status-switch">
            <PermissionVisible
              perm={STORE_PERMS.setMainStore}
              fallback={<Switch checked={!!value} size="small" disabled />}
            >
              <Switch
                checked={!!value}
                size="small"
                loading={!!switchingMainStoreIds[record.storeId]}
                disabled={!record.storeId || record.storeId === '-'}
                onChange={(checked) => {
                  void handleMainStoreChange(checked, record);
                }}
              />
            </PermissionVisible>
            <span>{value ? '主店' : '分店'}</span>
          </div>
        ),
      },
      {
        title: '私域商城',
        dataIndex: 'miniAppEnabled',
        width: 180,
        render: (value, record) => (
          <div className="store-status-switch">
            <PermissionVisible
              perm={STORE_PERMS.updateMiniApp}
              fallback={<Switch checked={!!value} size="small" disabled />}
            >
              <Switch
                checked={!!value}
                size="small"
                loading={!!switchingMiniAppIds[record.storeId]}
                disabled={!record.storeId || record.storeId === '-'}
                onChange={(checked) => {
                  void handleMiniAppChange(checked, record);
                }}
              />
            </PermissionVisible>
            <span>{value ? '已开启' : '已关闭'}</span>
          </div>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        fixed: isScrollAtRightEnd ? undefined : 'right',
        render: (_, record) => {
          const moreItems: MenuProps['items'] = [
            {
              key: 'storeQr',
              label: '门店二维码',
            },
            {
              key: 'merchantQr',
              label: '商户二维码',
            },
            {
              key: 'jurisdiction',
              label: 'DIY权限',
            },
          ];

          return (
            <div className="action-links-inline u-flex-center">
              <PermissionVisible perm={STORE_PERMS.edit}>
                <Button
                  type="link"
                  size="small"
                  disabled={!record.storeId || record.storeId === '-'}
                  onClick={() => {
                    history.push(`/form/store-manage/${record.storeId}/edit`);
                  }}
                >
                  编辑
                </Button>
              </PermissionVisible>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: moreItems,
                  onClick: ({ key }) => {
                    if (key === 'storeQr') {
                      handleOpenQrModal('store', record);
                      return;
                    }
                    if (key === 'merchantQr') {
                      handleOpenQrModal('merchant', record);
                      return;
                    }
                    if (key === 'jurisdiction') {
                      history.push(
                        `/form/store-manage/${record.storeId}/jurisdiction?storeName=${encodeURIComponent(record.storeName)}`,
                      );
                    }
                  },
                }}
              >
                <a
                  onClick={(event) => {
                    event.preventDefault();
                  }}
                >
                  更多 <DownOutlined />
                </a>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [
      handleOpenQrModal,
      handleMiniAppChange,
      handleMainStoreChange,
      handleStoreStateChange,
      isScrollAtRightEnd,
      switchingMiniAppIds,
      switchingMainStoreIds,
      switchingOrgIds,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    const loadStores = async () => {
      setLoading(true);
      try {
        const res = await getStorePage(
          {
            current: pagination.current,
            pageSize: pagination.pageSize,
            ...(filters.name ? { name: filters.name } : {}),
          },
          {
            skipErrorHandler: true,
          },
        );

        if (cancelled) return;

        const records = Array.isArray(res?.records) ? res.records : [];
        setStores(records.map(mapStoreRecord));
        setSwitchingOrgIds({});
        setSwitchingMainStoreIds({});
        setSwitchingMiniAppIds({});
        setTotal(Number(res?.total || 0));
        setSelectedRowKeys([]);
      } catch (error) {
        if (cancelled) return;
        setStores([]);
        setSwitchingOrgIds({});
        setSwitchingMainStoreIds({});
        setSwitchingMiniAppIds({});
        setTotal(0);
        message.error(getErrorMessage(error, '获取门店分页列表失败'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStores();

    return () => {
      cancelled = true;
    };
  }, [filters.name, pagination.current, pagination.pageSize]);

  useEffect(() => {
    const wrapper = tableWrapRef.current;
    if (!wrapper) return () => {};

    const scrollContainer =
      wrapper.querySelector<HTMLElement>('.ant-table-content') ||
      wrapper.querySelector<HTMLElement>('.ant-table-body');
    if (!scrollContainer) return () => {};

    const updateScrollEnd = () => {
      const { scrollLeft, clientWidth, scrollWidth } = scrollContainer;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
      setIsScrollAtRightEnd((prev) => (prev === atEnd ? prev : atEnd));
    };

    updateScrollEnd();
    scrollContainer.addEventListener('scroll', updateScrollEnd, {
      passive: true,
    });
    window.addEventListener('resize', updateScrollEnd);

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollEnd);
      window.removeEventListener('resize', updateScrollEnd);
    };
  }, [stores.length]);

  const handleFilterChange = (
    key: keyof StoreFilters,
    value?: string | null,
  ) => {
    setDraftFilters((prev) => ({
      ...prev,
      [key]: value || '',
    }));
  };

  const handleSearch = () => {
    setFilters(draftFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleReset = () => {
    setDraftFilters(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
    setPagination({
      current: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    setSelectedRowKeys([]);
  };

  if (!canViewStorePage) {
    return (
      <div className="store-page">
        <div className="content-card">
          <Result
            status="403"
            title="暂无权限"
            subTitle="当前账号没有门店管理页面权限"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="store-page">
      <div className="store-title-card u-flex-between">
        <div className="title">门店管理</div>
        <a className="tips-link">门店管理说明</a>
      </div>

      <div className="overview-grid">
        <div className="overview-card u-flex-col u-justify-between">
          <div className="overview-title u-flex-center">已添加门店</div>
          <div className="overview-main-row u-flex-between">
            <div className="overview-value">{total}</div>
            <div className="overview-actions u-flex-center">
              <Button shape="round" className="overview-ghost-btn">
                门店收款码
              </Button>
              <PermissionButton
                perm={STORE_PERMS.add}
                type="primary"
                shape="round"
                className="overview-primary-btn"
                onClick={() => {
                  history.push('/form/store-manage/create-single');
                }}
              >
                添加门店
              </PermissionButton>
            </div>
          </div>
        </div>
        <div className="overview-card middle u-flex-col u-justify-between">
          <div className="overview-title u-flex-center">
            二维码绑定管理{' '}
            <span className="new-badge u-inline-flex-middle">NEW</span>
          </div>
          <div className="overview-middle-row u-flex u-justify-between">
            <div className="overview-desc">
              绑定后点击跳转你的小
              <br />
              程序，提升交易转化
            </div>
            <Button
              type="primary"
              shape="round"
              className="overview-primary-btn"
            >
              管理绑定
            </Button>
          </div>
        </div>
        <div className="overview-card u-flex-col u-justify-between">
          <div className="overview-title u-flex-center">已关联店员</div>
          <div className="overview-main-row u-flex-between">
            <div className="overview-value">0</div>
            <Button
              type="primary"
              shape="round"
              className="overview-primary-btn"
              onClick={() => {
                history.push('/permission/store-staff');
              }}
            >
              管理店员
            </Button>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="filter-grid">
          <div className="field u-flex-center">
            <span className="field-label">门店名称</span>
            <Input
              placeholder="支持模糊搜索: 如: 海底捞"
              value={draftFilters.name}
              onChange={(event) => {
                handleFilterChange('name', event.target.value);
              }}
              onPressEnter={handleSearch}
            />
          </div>
          <div className="field u-flex-center">
            <span className="field-label">门店编号</span>
            <Input
              placeholder="请输入精准编号"
              value={draftFilters.storeCode}
              onChange={(event) => {
                handleFilterChange('storeCode', event.target.value);
              }}
            />
          </div>
          <div className="field u-flex-center">
            <span className="field-label">所属地区</span>
            <Space.Compact block>
              <Select
                defaultValue="省"
                options={[{ label: '省', value: '省' }]}
                style={{ width: 90 }}
              />
              <Select
                placeholder="所有地区"
                value={draftFilters.region || undefined}
                options={[
                  { label: '所有地区', value: 'all' },
                  { label: '上海市', value: 'sh' },
                  { label: '郑州市', value: 'zz' },
                ]}
                onChange={(value) => {
                  handleFilterChange('region', value);
                }}
                allowClear
              />
            </Space.Compact>
          </div>
          <div className="field u-flex-center">
            <span className="field-label">所属分公司</span>
            <Select
              allowClear
              value={draftFilters.branch || undefined}
              options={[{ label: '华东分公司', value: 'east' }]}
              placeholder="请选择分公司"
              onChange={(value) => {
                handleFilterChange('branch', value);
              }}
            />
          </div>
          <div className="field u-flex-center">
            <span className="field-label">门店信息状态</span>
            <Select
              allowClear
              value={draftFilters.status || undefined}
              options={[
                { label: '待完善', value: 'todo' },
                { label: '完善', value: 'done' },
              ]}
              placeholder="请选择门店信息状态"
              onChange={(value) => {
                handleFilterChange('status', value);
              }}
            />
          </div>
          <div className="field actions u-flex-center">
            <Button type="primary" onClick={handleSearch}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </div>
        </div>

        <div className="toolbar u-flex-col">
          <Space>
            <Button type="primary" shape="round">
              批量更新门店
            </Button>
            <Button shape="round">批量删除门店</Button>
            <Button shape="round">设置结算方式</Button>
          </Space>
          <a className="record-link">
            查看操作记录 <RightOutlined />
          </a>
        </div>

        <div className="batch-bar">
          <Space size={14}>
            <Checkbox
              checked={
                stores.length > 0 && selectedRowKeys.length === stores.length
              }
              indeterminate={
                selectedRowKeys.length > 0 &&
                selectedRowKeys.length < stores.length
              }
              onChange={(event) => {
                setSelectedRowKeys(
                  event.target.checked ? stores.map((item) => item.key) : [],
                );
              }}
            >
              选择全部
            </Checkbox>
            <span className="selected-count">
              已选{' '}
              <span className="selected-count-number">
                {selectedRowKeys.length}
              </span>{' '}
              项
            </span>
            <Popconfirm
              title={`你确定要暂停已选择的${selectedRowKeys.length}家门店吗?`}
              okText="确认"
              cancelText="取消"
              disabled={!hasSelectedStores}
            >
              <Button disabled={!hasSelectedStores} shape="round">
                暂停营业
              </Button>
            </Popconfirm>
            <Button disabled={!hasSelectedStores} shape="round">
              导出门店
            </Button>
            <Popconfirm
              title={`你确定要删除已选择的${selectedRowKeys.length}家门店吗?`}
              okText="确认"
              cancelText="取消"
              disabled={!hasSelectedStores}
            >
              <Button disabled={!hasSelectedStores} shape="round">
                删除门店
              </Button>
            </Popconfirm>
          </Space>
        </div>

        <div ref={tableWrapRef}>
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            loading={loading}
            rowKey="key"
            columns={columns}
            dataSource={stores}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 条`,
              onChange: (current, pageSize) => {
                setPagination({
                  current,
                  pageSize,
                });
              },
            }}
            locale={{
              emptyText: '暂无门店数据',
            }}
            scroll={{ x: 'max-content' }}
            sticky
          />
        </div>

        <Typography.Paragraph className="page-note">
          注: 1.
          门店信息状态是指当前门店的名称、地址(含经纬度)信息的准确性，如“待优化”，则说明信息需要完善，请编辑修改；
          <br />
          2.
          门店信息状态不影响交易支付场景的使用(如分门店收单、账单查询)，但会影响到营销推广、投放场景的使用(如附近发券)；
        </Typography.Paragraph>
      </div>

      <StoreQrCodeModal
        open={!!qrModalPayload}
        payload={qrModalPayload}
        onCancel={() => setQrModalPayload(null)}
      />
    </div>
  );
};

export default StorePage;
