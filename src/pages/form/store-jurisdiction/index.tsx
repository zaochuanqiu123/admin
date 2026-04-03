import { DownOutlined, ReloadOutlined } from '@ant-design/icons';
import { history, useAccess, useLocation } from '@umijs/max';
import { Alert, Button, Result, Switch, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { STORE_PERMS } from '../store-perms';
import './index.less';

type PermissionViewItem = {
  key: string;
  name: string;
  checked: boolean;
  group: 'goods' | 'other' | 'extra';
};

const IMPORTANT_TIPS = [
  '商家账号直接进入门店后台时，默认按已开启权限使用对应功能。',
  '关闭某项功能后，门店账号登录门店后台将无法使用被限制的功能。',
  '直营门店建议重点关注添加商品、编辑商品、数据导出、删除商品等高风险能力的权限配置。',
  '查看进价等能力关闭后，和进价相关的部分商品、库存、利润数据展示也会受到影响。',
] as const;

const GROUP_META = {
  goods: {
    title: '商品管理',
    desc: '控制门店操作商品相关功能',
  },
  other: {
    title: '其他',
    desc: '控制门店其他操作相关功能',
  },
  extra: {
    title: '更多权限',
    desc: '预留给后续接口返回的其他门店能力项',
  },
} as const;

const MOCK_PERMISSIONS: PermissionViewItem[] = [
  { key: 'addgoods', name: '添加商品', checked: true, group: 'goods' },
  { key: 'edit_goods', name: '编辑商品', checked: true, group: 'goods' },
  {
    key: 'edit_goods_batch',
    name: '批量修改商品',
    checked: true,
    group: 'goods',
  },
  {
    key: 'edit_goods_class_batch',
    name: '批量修改商品分类',
    checked: true,
    group: 'goods',
  },
  {
    key: 'delete_goods_batch',
    name: '批量删除商品',
    checked: true,
    group: 'goods',
  },
  { key: 'store_show_profit', name: '查看进价', checked: true, group: 'goods' },
  { key: 'delete_comment', name: '删除评价', checked: true, group: 'goods' },
  {
    key: 'manage_goods_class',
    name: '管理商品分类',
    checked: true,
    group: 'goods',
  },
  {
    key: 'manage_goods_label',
    name: '管理商品标签',
    checked: true,
    group: 'goods',
  },
  { key: 'synchro_goods', name: '门店同步商品', checked: true, group: 'goods' },
  {
    key: 'merchant_img_use',
    name: '能否使用商户图片',
    checked: true,
    group: 'goods',
  },
  { key: 'cost_price', name: '成本价同步', checked: true, group: 'goods' },
  { key: 'data_export', name: '数据导出', checked: true, group: 'goods' },
  {
    key: 'check_inventory',
    name: '审核盘点数据',
    checked: true,
    group: 'other',
  },
  {
    key: 'purchase_manage',
    name: '是否开启采购管理',
    checked: true,
    group: 'other',
  },
  {
    key: 'edit_purchase_price',
    name: '是否可以编辑调拨价',
    checked: true,
    group: 'other',
  },
  {
    key: 'allocation_check',
    name: '门店之间调拨审核',
    checked: true,
    group: 'other',
  },
  { key: 'capital_manage', name: '资金管理', checked: true, group: 'other' },
  { key: 'add_buyer', name: '是否可添加导购员', checked: true, group: 'other' },
  {
    key: 'set_distribution',
    name: '是否可设置配送费',
    checked: true,
    group: 'other',
  },
  {
    key: 'set_store_info',
    name: '是否可设置门店信息',
    checked: true,
    group: 'other',
  },
  { key: 'home_diy', name: '首页DIY', checked: true, group: 'other' },
  {
    key: 'show_all_vip',
    name: '是否显示所有会员',
    checked: true,
    group: 'other',
  },
  {
    key: 'normal_coupon',
    name: '是否可操作普通优惠券',
    checked: true,
    group: 'other',
  },
  {
    key: 'vip_coupon',
    name: '是否可操作会员优惠券',
    checked: true,
    group: 'other',
  },
  {
    key: 'set_promotion_goods',
    name: '是否可设置促销商品',
    checked: true,
    group: 'other',
  },
];

function readText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

const StoreJurisdictionPage: React.FC = () => {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const location = useLocation();
  const canViewPage = !!access?.hasButtonPerm?.(STORE_PERMS.page);
  const [tipsExpanded, setTipsExpanded] = useState(true);

  const storeNameFromQuery = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return readText(searchParams.get('storeName'));
  }, [location.search]);

  const groupedPermissions = useMemo(
    () => ({
      goods: MOCK_PERMISSIONS.filter((item) => item.group === 'goods'),
      other: MOCK_PERMISSIONS.filter((item) => item.group === 'other'),
      extra: MOCK_PERMISSIONS.filter((item) => item.group === 'extra'),
    }),
    [],
  );

  if (!canViewPage) {
    return (
      <div className="store-jurisdiction-page">
        <div className="jurisdiction-content-card">
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
    <div className="store-jurisdiction-page">
      <div className="jurisdiction-title-card">
        <div>
          <div className="jurisdiction-page-title">门店 DIY 权限</div>
          <div className="jurisdiction-page-subtitle">
            {readText(storeNameFromQuery) || '门店权限配置查看'}
          </div>
        </div>
        <div className="jurisdiction-title-actions">
          <Button
            shape="round"
            onClick={() => {
              history.push('/form/store-manage');
            }}
          >
            返回门店管理
          </Button>
          <Button
            type="primary"
            shape="round"
            icon={<ReloadOutlined />}
            onClick={() => {
              history.replace(location.pathname + location.search);
            }}
          >
            刷新
          </Button>
        </div>
      </div>

      <div className="jurisdiction-content-card">
        <section className="jurisdiction-tips-collapse">
          <button
            type="button"
            className="jurisdiction-tips-toggle"
            onClick={() => {
              setTipsExpanded((value) => !value);
            }}
          >
            <span>重要提示</span>
            <DownOutlined
              className={
                'jurisdiction-tips-toggle-icon' +
                (tipsExpanded ? ' jurisdiction-tips-toggle-icon-open' : '')
              }
            />
          </button>
          {tipsExpanded ? (
            <div className="jurisdiction-tips-panel">
              <ol className="jurisdiction-tips-list">
                {IMPORTANT_TIPS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>

        <Alert
          className="jurisdiction-dev-alert"
          type="info"
          showIcon
          message="接口暂未接入"
          description="当前页面先保留布局和视觉样式，权限内容为静态示例，后续接口确定后再切换为真实数据。"
        />

        <div className="jurisdiction-section-list">
          {(['goods', 'other', 'extra'] as const).map((groupKey) => {
            const items = groupedPermissions[groupKey];
            if (items.length === 0) return null;
            return (
              <section className="jurisdiction-section" key={groupKey}>
                <div className="jurisdiction-section-head">
                  <div className="jurisdiction-section-bar" />
                  <div>
                    <div className="jurisdiction-section-title">
                      {GROUP_META[groupKey].title}
                    </div>
                    <div className="jurisdiction-section-desc">
                      {GROUP_META[groupKey].desc}
                    </div>
                  </div>
                </div>
                <div className="jurisdiction-grid">
                  {items.map((item) => (
                    <div className="jurisdiction-card" key={item.key}>
                      <div className="jurisdiction-card-name">{item.name}</div>
                      <div className="jurisdiction-card-foot">
                        <Switch
                          checked={item.checked}
                          checkedChildren="开启"
                          unCheckedChildren="关闭"
                          disabled
                        />
                        <Typography.Text className="jurisdiction-card-key">
                          {item.key}
                        </Typography.Text>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StoreJurisdictionPage;
