import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';
import {
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import './index.less';

type StaffPermissionItem = {
  key: string;
  name: string;
  checked: boolean;
};

type StaffPermissionPage = {
  key: string;
  name: string;
  permissions: StaffPermissionItem[];
};

type StaffPermissionModule = {
  key: string;
  name: string;
  pages: StaffPermissionPage[];
};

type StaffRecord = {
  id: string;
  name: string;
  staffCode: string;
  userId: string;
  orgName: string;
  storeName: string;
  roleName: string;
  roleTag: string;
  position: string;
  phone: string;
  email: string;
  healthCard: string;
  remark: string;
  entryDate: string;
  account: string;
  enabled: boolean;
  avatarColor: string;
  business: {
    maxSingleDiscount: string;
    maxOrderDiscount: string;
    dataScope: string;
    supplierScope: string;
    productScope: string;
    manageScope: string;
  };
  permissionTree: StaffPermissionModule[];
};

const STAFF_FORM_SECTIONS = [
  { key: 'basic', label: '基本信息' },
  { key: 'permission', label: '功能权限信息' },
  { key: 'account', label: '登录账号与密码' },
  { key: 'business', label: '业务权限信息' },
] as const;

type StaffFormSectionKey = (typeof STAFF_FORM_SECTIONS)[number]['key'];

const BASE_PERMISSION_TREE: StaffPermissionModule[] = [
  {
    key: 'cashier',
    name: '点单',
    pages: [
      {
        key: 'order',
        name: '点单',
        permissions: [
          { key: 'single_discount', name: '单品优惠', checked: true },
          { key: 'order_discount', name: '整单优惠', checked: true },
          { key: 'gift', name: '赠送', checked: true },
          { key: 'weight_add', name: '加量', checked: true },
          { key: 'weight_reduce', name: '减量', checked: true },
          { key: 'change_table', name: '改桌', checked: true },
          { key: 'hold_order', name: '挂单', checked: true },
          { key: 'reminder', name: '提单', checked: true },
          { key: 'cancel_order', name: '整单取消', checked: true },
          { key: 'member_login', name: '会员登录', checked: true },
          { key: 'goods_remark', name: '商品备注', checked: true },
          { key: 'order_remark', name: '整单备注', checked: true },
          { key: 'more_action', name: '更多', checked: true },
          { key: 'shift_handover', name: '交接班', checked: true },
          { key: 'reserve_money', name: '备用金', checked: true },
        ],
      },
      {
        key: 'checkout',
        name: '收银',
        permissions: [
          { key: 'cash_pay', name: '现金收款', checked: true },
          { key: 'wechat_pay', name: '微信收款', checked: true },
          { key: 'refund_order', name: '退款', checked: false },
          { key: 'invoice', name: '开票', checked: true },
        ],
      },
    ],
  },
  {
    key: 'order',
    name: '订单',
    pages: [
      {
        key: 'order_list',
        name: '订单列表',
        permissions: [
          { key: 'view_order', name: '查看订单', checked: true },
          { key: 'export_order', name: '导出订单', checked: false },
          { key: 'print_order', name: '补打小票', checked: true },
        ],
      },
    ],
  },
  {
    key: 'store',
    name: '店务',
    pages: [
      {
        key: 'inventory',
        name: '库存盘点',
        permissions: [
          { key: 'view_inventory', name: '查看库存', checked: true },
          { key: 'adjust_inventory', name: '调整库存', checked: false },
          { key: 'export_inventory', name: '导出库存', checked: false },
        ],
      },
    ],
  },
];

const MOCK_STAFFS: StaffRecord[] = [
  {
    id: 'staff-admin',
    name: 'admin',
    staffCode: 'YG0000001',
    userId: '190000000000001',
    orgName: '鑫之迈门店集团',
    storeName: '鑫之迈门店集团',
    roleName: '集团经理',
    roleTag: '集团经理',
    position: '运营负责人',
    phone: '13800000001',
    email: 'admin@xinzhimai.cn',
    healthCard: '-',
    remark: '集团默认管理员账号',
    entryDate: '2024-01-01',
    account: 'admin',
    enabled: true,
    avatarColor: '#dde9f6',
    business: {
      maxSingleDiscount: '不限',
      maxOrderDiscount: '不限',
      dataScope: '全部门店',
      supplierScope: '全部供应商',
      productScope: '全部商品',
      manageScope: '集团全部门店',
    },
    permissionTree: BASE_PERMISSION_TREE,
  },
  {
    id: 'staff-cashier-1',
    name: '鑫之迈美食门店收银员',
    staffCode: 'YG0000003',
    userId: '19534775767540813',
    orgName: '鑫之迈美食汇',
    storeName: '鑫之迈美食汇',
    roleName: '门店收银员',
    roleTag: '门店收银员',
    position: '收银员',
    phone: '13800000002',
    email: '',
    healthCard: '',
    remark: '',
    entryDate: '2025-08-08',
    account: '66',
    enabled: true,
    avatarColor: '#e9e1d6',
    business: {
      maxSingleDiscount: '9折',
      maxOrderDiscount: '9折',
      dataScope: '当前门店',
      supplierScope: '当前门店供应商',
      productScope: '当前门店商品',
      manageScope: '鑫之迈美食汇',
    },
    permissionTree: BASE_PERMISSION_TREE,
  },
  {
    id: 'staff-manager-1',
    name: '新一迈门店店长',
    staffCode: 'YG0000008',
    userId: '19534775767540818',
    orgName: '新一迈大酒店',
    storeName: '新一迈大酒店',
    roleName: '门店店长',
    roleTag: '门店店长',
    position: '店长',
    phone: '13800000003',
    email: '',
    healthCard: '',
    remark: '',
    entryDate: '2025-07-21',
    account: 'store001',
    enabled: true,
    avatarColor: '#e9e1d6',
    business: {
      maxSingleDiscount: '8折',
      maxOrderDiscount: '8折',
      dataScope: '当前门店',
      supplierScope: '当前门店供应商',
      productScope: '当前门店商品',
      manageScope: '新一迈大酒店',
    },
    permissionTree: BASE_PERMISSION_TREE,
  },
  {
    id: 'staff-cashier-2',
    name: '一诺云柜测试门店收银员',
    staffCode: 'YG0000010',
    userId: '19534775767540820',
    orgName: '一诺云柜测试',
    storeName: '一诺云柜测试',
    roleName: '门店收银员',
    roleTag: '门店收银员',
    position: '收银员',
    phone: '13800000004',
    email: '',
    healthCard: '',
    remark: '',
    entryDate: '2025-06-11',
    account: 'cashier002',
    enabled: false,
    avatarColor: '#e9e1d6',
    business: {
      maxSingleDiscount: '9.5折',
      maxOrderDiscount: '9.5折',
      dataScope: '当前门店',
      supplierScope: '当前门店供应商',
      productScope: '当前门店商品',
      manageScope: '一诺云柜测试',
    },
    permissionTree: BASE_PERMISSION_TREE,
  },
  {
    id: 'staff-duoduo',
    name: '金多多',
    staffCode: 'YG0000012',
    userId: '19534775767540822',
    orgName: '一诺云柜测试',
    storeName: '一诺云柜测试',
    roleName: '门店店长',
    roleTag: '门店店长',
    position: '店长',
    phone: '13800000005',
    email: '',
    healthCard: '',
    remark: '',
    entryDate: '2025-05-09',
    account: 'duoduo',
    enabled: true,
    avatarColor: '#e9e1d6',
    business: {
      maxSingleDiscount: '8.5折',
      maxOrderDiscount: '8.5折',
      dataScope: '当前门店',
      supplierScope: '当前门店供应商',
      productScope: '当前门店商品',
      manageScope: '一诺云柜测试',
    },
    permissionTree: BASE_PERMISSION_TREE,
  },
  {
    id: 'staff-manager-2',
    name: '一诺云轻餐测试门店收银员',
    staffCode: 'YG0000018',
    userId: '19534775767540828',
    orgName: '一诺云轻餐测试',
    storeName: '一诺云轻餐测试',
    roleName: '门店收银员',
    roleTag: '门店收银员',
    position: '收银员',
    phone: '13800000006',
    email: '',
    healthCard: '',
    remark: '',
    entryDate: '2025-04-16',
    account: 'light001',
    enabled: true,
    avatarColor: '#e9e1d6',
    business: {
      maxSingleDiscount: '9折',
      maxOrderDiscount: '9折',
      dataScope: '当前门店',
      supplierScope: '当前门店供应商',
      productScope: '当前门店商品',
      manageScope: '一诺云轻餐测试',
    },
    permissionTree: BASE_PERMISSION_TREE,
  },
  {
    id: 'staff-wangyh',
    name: 'wangyh',
    staffCode: 'YG0000020',
    userId: '19534775767540830',
    orgName: '新一迈测试集团',
    storeName: '测试角色001',
    roleName: '测试角色001',
    roleTag: '测试角色001',
    position: '导购员',
    phone: '13800000007',
    email: '',
    healthCard: '',
    remark: '',
    entryDate: '2025-03-28',
    account: 'wangyh',
    enabled: true,
    avatarColor: '#e9e1d6',
    business: {
      maxSingleDiscount: '9折',
      maxOrderDiscount: '9折',
      dataScope: '当前门店',
      supplierScope: '当前门店供应商',
      productScope: '当前门店商品',
      manageScope: '测试角色001',
    },
    permissionTree: BASE_PERMISSION_TREE,
  },
];

function getInitialPermissionKeys(staff?: StaffRecord) {
  const moduleKey = staff?.permissionTree[0]?.key || '';
  const pageKey = staff?.permissionTree[0]?.pages[0]?.key || '';
  return { moduleKey, pageKey };
}

function scrollToFormSection(key: string) {
  const target = document.getElementById(`staff-form-${key}`);
  const container = target?.closest('.staff-create-form') as HTMLElement | null;

  if (!target || !container) return;

  const targetTop =
    target.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop;

  container.scrollTo({
    top: targetTop,
    behavior: 'smooth',
  });
}

const StaffAvatar: React.FC<{ staff: StaffRecord; size?: number }> = ({
  staff,
  size = 48,
}) => (
  <Avatar
    size={size}
    icon={<UserOutlined />}
    style={{ backgroundColor: staff.avatarColor, color: '#64748b' }}
  />
);

const StoreStaffCreatePage: React.FC = () => {
  const [form] = Form.useForm();
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeFormSection, setActiveFormSection] =
    useState<StaffFormSectionKey>(STAFF_FORM_SECTIONS[0].key);

  const activeFormSectionIndex = STAFF_FORM_SECTIONS.findIndex(
    (item) => item.key === activeFormSection,
  );

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      message.success('新增员工账号成功，当前为静态示例数据');
      history.push('/permission/store-staff');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('保存失败');
    }
  };

  const handleFormScroll = (event: React.UIEvent<HTMLFormElement>) => {
    const container = event.currentTarget;
    const containerTop = container.getBoundingClientRect().top;
    const anchorLine = container.scrollTop + 72;
    let nextKey: StaffFormSectionKey = STAFF_FORM_SECTIONS[0].key;

    STAFF_FORM_SECTIONS.forEach((item) => {
      const section = document.getElementById(`staff-form-${item.key}`);
      if (!section) return;

      const sectionTop =
        section.getBoundingClientRect().top -
        containerTop +
        container.scrollTop;

      if (anchorLine >= sectionTop) {
        nextKey = item.key;
      }
    });

    setActiveFormSection((current) =>
      current === nextKey ? current : nextKey,
    );
  };

  return (
    <div className="store-staff-create-page">
      <div className="staff-create-title-bar">
        <div className="staff-create-title">新增员工账号</div>
        <Space>
          <Button onClick={() => history.push('/permission/store-staff')}>
            取消
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      </div>

      <div className="staff-create-layout">
        <aside className="staff-create-steps">
          {STAFF_FORM_SECTIONS.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={[
                item.key === activeFormSection ? 'is-active' : '',
                index < activeFormSectionIndex ? 'is-passed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setActiveFormSection(item.key);
                scrollToFormSection(item.key);
              }}
            >
              <span className="staff-create-step-dot" />
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <Form
          form={form}
          className="staff-create-form"
          layout="horizontal"
          labelCol={{ flex: '150px' }}
          wrapperCol={{ flex: '520px' }}
          onScroll={handleFormScroll}
          initialValues={{
            staffCode: 'YG0000018',
            gender: 'male',
            roleName: '门店收银员',
            state: true,
          }}
        >
          <section id="staff-form-basic" className="staff-create-card">
            <div className="staff-create-section-title">基本信息</div>
            <Form.Item
              label="员工姓名"
              name="name"
              rules={[{ required: true, message: '请输入员工姓名' }]}
            >
              <Input placeholder="请输入" maxLength={30} />
            </Form.Item>
            <Form.Item label="员工编码" name="staffCode">
              <Input disabled />
            </Form.Item>
            <Form.Item label="所属组织" required>
              <Button className="staff-dashed-btn">+ 选择组织</Button>
            </Form.Item>
            <Form.Item label="性别" name="gender">
              <Radio.Group>
                <Radio value="male">男</Radio>
                <Radio value="female">女</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="手机号" name="phone">
              <Input placeholder="请输入" maxLength={20} />
            </Form.Item>
            <button
              type="button"
              className="staff-more-toggle"
              onClick={() => setMoreOpen((value) => !value)}
            >
              {moreOpen ? '收起更多信息' : '展开更多信息'}
              <DownOutlined className={moreOpen ? 'is-open' : ''} />
            </button>
            {moreOpen ? (
              <div className="staff-more-panel">
                <Form.Item label="职位" name="position">
                  <Input placeholder="请输入职位" />
                </Form.Item>
                <Form.Item label="入职时间" name="entryDate">
                  <DatePicker />
                </Form.Item>
                <Form.Item label="邮箱" name="email">
                  <Input placeholder="请输入邮箱" />
                </Form.Item>
                <Form.Item label="健康证照片" name="healthCard">
                  <Button className="staff-dashed-btn">+ 上传照片</Button>
                </Form.Item>
                <Form.Item label="备注" name="remark">
                  <Input.TextArea rows={3} placeholder="请输入备注" />
                </Form.Item>
              </div>
            ) : null}
          </section>

          <section id="staff-form-permission" className="staff-create-card">
            <div className="staff-create-section-title">功能权限信息</div>
            <Form.Item label="关联角色" required>
              <span className="staff-select-pill">门店店长</span>
            </Form.Item>
            <a className="staff-inline-link">查看权限详情 &gt;</a>
          </section>

          <section id="staff-form-account" className="staff-create-card">
            <div className="staff-create-section-title">
              登录账号、密码
              <span>
                如果账号有商户中心、云助手的权限，登录账号和密码必须填写
              </span>
            </div>
            <Form.Item
              label="账号"
              name="account"
              rules={[{ required: true, message: '请输入账号' }]}
            >
              <Input placeholder="请输入账号" maxLength={30} />
            </Form.Item>
            <Form.Item
              label="登录密码"
              name="password"
              rules={[{ required: true, message: '请输入登录密码' }]}
            >
              <Input.Password placeholder="请输入8-20位，大小写字母、数字、英文字符" />
            </Form.Item>
          </section>

          <section id="staff-form-business" className="staff-create-card">
            <div className="staff-create-section-title">业务权限信息</div>
            <div className="staff-create-tabs">
              <button type="button" className="is-active">
                结账收银权限设置
              </button>
              <button type="button">会员营销权限设置</button>
              <button type="button">结算中心设置</button>
              <button type="button">供应链权限设置</button>
            </div>
            <Form.Item label="单笔最大免除额度" name="singleFree">
              <InputNumber
                min={0}
                addonAfter="元"
                placeholder="请输入单笔最大免除额度，未设置代表没有免除额度"
              />
            </Form.Item>
            <Form.Item label="单品最大使用折扣" name="singleDiscount">
              <InputNumber
                min={0}
                max={100}
                addonAfter="%"
                placeholder="请输入0-100的数字，100代表不打折，0代表免单"
              />
            </Form.Item>
            <Form.Item label="整单最大使用折扣" name="orderDiscount">
              <InputNumber
                min={0}
                max={100}
                addonAfter="%"
                placeholder="请输入0-100的数字，100代表不打折，0代表免单"
              />
            </Form.Item>
            <Form.Item label="手工抹零额度" name="roundingAmount">
              <InputNumber
                min={0}
                addonAfter="元"
                placeholder="请输入手工抹零额度，未设置代表没有抹零金额"
              />
            </Form.Item>
            <Form.Item label="每月免金额上限" name="monthlyFree">
              <InputNumber
                min={0}
                addonAfter="元"
                placeholder="请输入每月最大免金额，未设置代表不限制金额上限"
              />
            </Form.Item>
          </section>

          <section className="staff-create-card">
            <div className="staff-create-section-title">
              管辖范围
              <span>
                当前账号通过页面右上角列表进行快速切换；如启用了供应链仓库权限控制的功能，当前账号只能操作、查看、管辖范围内的仓库
              </span>
            </div>
            <Form.Item label="管辖范围" name="manageScope">
              <Button className="staff-dashed-btn">+ 选择组织</Button>
            </Form.Item>
            <Form.Item label="门店分组" name="storeGroup">
              <Button className="staff-dashed-btn">+ 选择门店分组</Button>
            </Form.Item>
            <Form.Item label="管辖品牌" name="brand">
              <Button className="staff-dashed-btn">+ 选择品牌</Button>
            </Form.Item>
          </section>
        </Form>
      </div>
    </div>
  );
};

const StoreStaffListPage: React.FC = () => {
  const [staffs, setStaffs] = useState<StaffRecord[]>(MOCK_STAFFS);
  const [selectedStaffId, setSelectedStaffId] = useState(MOCK_STAFFS[1].id);
  const [staffKeyword, setStaffKeyword] = useState('');
  const [staffStatus, setStaffStatus] = useState<string>();
  const [permissionExpanded, setPermissionExpanded] = useState(false);
  const [activePermissionScene, setActivePermissionScene] = useState('light');
  const initialKeys = getInitialPermissionKeys(MOCK_STAFFS[1]);
  const [activeModuleKey, setActiveModuleKey] = useState(initialKeys.moduleKey);
  const [activePageKey, setActivePageKey] = useState(initialKeys.pageKey);

  const selectedStaff = useMemo(
    () => staffs.find((item) => item.id === selectedStaffId) || staffs[0],
    [selectedStaffId, staffs],
  );

  const filteredStaffs = useMemo(() => {
    const keyword = staffKeyword.trim().toLowerCase();
    return staffs.filter((staff) => {
      if (staffStatus === 'enabled' && !staff.enabled) return false;
      if (staffStatus === 'disabled' && staff.enabled) return false;
      if (!keyword) return true;
      return [staff.name, staff.orgName, staff.roleName, staff.staffCode].some(
        (value) =>
          String(value || '')
            .toLowerCase()
            .includes(keyword),
      );
    });
  }, [staffKeyword, staffStatus, staffs]);

  const activeModule =
    selectedStaff?.permissionTree.find(
      (item) => item.key === activeModuleKey,
    ) || selectedStaff?.permissionTree[0];
  const activePage =
    activeModule?.pages.find((item) => item.key === activePageKey) ||
    activeModule?.pages[0];

  const handleSelectStaff = (staff: StaffRecord) => {
    setSelectedStaffId(staff.id);
    setPermissionExpanded(false);
    const nextKeys = getInitialPermissionKeys(staff);
    setActiveModuleKey(nextKeys.moduleKey);
    setActivePageKey(nextKeys.pageKey);
  };

  const handleToggleStaffState = (staffId: string, checked: boolean) => {
    setStaffs((prev) =>
      prev.map((item) =>
        item.id === staffId ? { ...item, enabled: checked } : item,
      ),
    );
    message.success(checked ? '员工已启用' : '员工已禁用');
  };

  const handleDeleteStaff = (staffId: string) => {
    setStaffs((prev) => {
      const next = prev.filter((item) => item.id !== staffId);
      if (staffId === selectedStaffId) {
        setSelectedStaffId(next[0]?.id || '');
      }
      return next;
    });
    message.success('员工已删除，当前为静态示例数据');
  };

  if (!selectedStaff) {
    return (
      <div className="store-staff-page">
        <Empty description="暂无员工数据" />
      </div>
    );
  }

  return (
    <div className="store-staff-page">
      <div className="staff-filter-card">
        <div className="staff-filter-fields">
          <div className="staff-filter-field">
            <span>员工信息</span>
            <Input
              allowClear
              placeholder="姓名 / 组织 / 角色 / 编码"
              value={staffKeyword}
              onChange={(event) => setStaffKeyword(event.target.value)}
            />
          </div>
          <div className="staff-filter-field">
            <span>状态</span>
            <Select
              allowClear
              placeholder="全部状态"
              value={staffStatus}
              options={[
                { label: '启用', value: 'enabled' },
                { label: '禁用', value: 'disabled' },
              ]}
              onChange={(value) => setStaffStatus(value)}
            />
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="store-staff-create-btn"
          onClick={() => history.push('/permission/store-staff/create')}
        >
          新增员工
        </Button>
      </div>

      <div className="store-staff-layout">
        <aside className="staff-list-card">
          <div className="staff-list-head">
            <button type="button" className="staff-list-tab">
              全部({filteredStaffs.length})
            </button>
          </div>
          <div className="staff-list">
            {filteredStaffs.length === 0 ? (
              <Empty className="staff-list-empty" description="暂无员工数据" />
            ) : null}
            {filteredStaffs.map((staff) => {
              const active = staff.id === selectedStaff.id;
              return (
                <div
                  key={staff.id}
                  className={[
                    'staff-list-item',
                    active ? 'is-active' : '',
                    staff.enabled ? '' : 'is-disabled',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleSelectStaff(staff)}
                >
                  <span className="staff-avatar-wrap">
                    <StaffAvatar staff={staff} />
                    {!staff.enabled ? (
                      <span className="staff-disabled-badge">禁用</span>
                    ) : null}
                  </span>
                  <span className="staff-list-main">
                    <span className="staff-list-name-row">
                      <span className="staff-list-name">{staff.name}</span>
                      {active ? (
                        <Switch
                          size="small"
                          checked={staff.enabled}
                          onClick={(_checked, event) => event.stopPropagation()}
                          onChange={(checked) =>
                            handleToggleStaffState(staff.id, checked)
                          }
                        />
                      ) : null}
                    </span>
                    <span className="staff-list-meta">
                      <span>{staff.orgName}</span>
                      <span>{staff.roleName}</span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="staff-detail-card">
          <div className="staff-detail-head">
            <div className="staff-detail-title">
              <span className="staff-avatar-wrap is-detail">
                <StaffAvatar staff={selectedStaff} size={58} />
                {!selectedStaff.enabled ? (
                  <span className="staff-disabled-badge">禁用</span>
                ) : null}
              </span>
              <div>
                <div className="staff-detail-name">
                  {selectedStaff.name}
                  <span>({selectedStaff.storeName})</span>
                </div>
                <Tag color="blue">{selectedStaff.roleTag}</Tag>
              </div>
            </div>
            <Space className="staff-detail-actions">
              <Button
                icon={<EditOutlined />}
                onClick={() => message.info('编辑接口暂未接入')}
              />
              <Popconfirm
                title="确认删除该员工？"
                onConfirm={() => handleDeleteStaff(selectedStaff.id)}
              >
                <Button icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </div>

          <section className="staff-detail-section">
            <div className="staff-section-title">基本信息</div>
            <div className="staff-info-grid">
              <div>
                <span>员工编码:</span>
                <strong>{selectedStaff.staffCode}</strong>
              </div>
              <div>
                <span>员工ID:</span>
                <strong>{selectedStaff.userId}</strong>
              </div>
              <div>
                <span>所属组织:</span>
                <strong>{selectedStaff.orgName}</strong>
              </div>
              <div>
                <span>员工卡号:</span>
                <strong>-</strong>
              </div>
              <div>
                <span>手机号:</span>
                <strong>{selectedStaff.phone || '-'}</strong>
              </div>
              <div>
                <span>职位:</span>
                <strong>{selectedStaff.position || '-'}</strong>
              </div>
              <div>
                <span>入职时间:</span>
                <strong>{selectedStaff.entryDate || '-'}</strong>
              </div>
              <div>
                <span>邮箱:</span>
                <strong>{selectedStaff.email || '-'}</strong>
              </div>
              <div>
                <span>健康证照片:</span>
                <strong>{selectedStaff.healthCard || '-'}</strong>
              </div>
              <div>
                <span>备注:</span>
                <strong>{selectedStaff.remark || '-'}</strong>
              </div>
            </div>
          </section>

          <section className="staff-detail-section staff-account-section">
            <div className="staff-section-title">
              登录账号密码
              <span>
                如果账号有商户中心、云助手的权限，登录账号和密码必须填写
              </span>
            </div>
            <Button
              type="link"
              onClick={() => message.info('重置账号密码接口暂未接入')}
            >
              重置账号&密码
            </Button>
            <div className="staff-info-grid is-compact">
              <div>
                <span>账号:</span>
                <strong>{selectedStaff.account}</strong>
              </div>
              <div>
                <span>密码:</span>
                <strong>******</strong>
              </div>
            </div>
          </section>

          <section className="staff-detail-section">
            <div className="staff-section-title">功能权限</div>
            <div className="staff-role-line">
              <span>关联角色:</span>
              <span className="staff-select-pill">
                {selectedStaff.roleName}
              </span>
            </div>
            <button
              type="button"
              className="staff-permission-toggle"
              onClick={() => setPermissionExpanded((value) => !value)}
            >
              查看权限详情
              <DownOutlined className={permissionExpanded ? 'is-open' : ''} />
            </button>

            {permissionExpanded ? (
              <div className="staff-permission-detail">
                <div className="staff-permission-roles">
                  <button
                    type="button"
                    className={
                      activePermissionScene === 'light' ? 'is-active' : ''
                    }
                    onClick={() => setActivePermissionScene('light')}
                  >
                    轻餐pos
                  </button>
                  <button
                    type="button"
                    className={
                      activePermissionScene === 'dinner' ? 'is-active' : ''
                    }
                    onClick={() => setActivePermissionScene('dinner')}
                  >
                    正餐
                  </button>
                </div>
                <div className="staff-permission-panel">
                  <div className="staff-permission-tags">
                    <Tag color="blue">
                      <Checkbox checked disabled>
                        门店视角
                      </Checkbox>
                    </Tag>
                  </div>
                  <div className="staff-permission-matrix">
                    <div className="staff-permission-column">
                      <div className="staff-permission-column-title">模块</div>
                      <div className="staff-permission-column-body">
                        {selectedStaff.permissionTree.map((moduleItem) => (
                          <button
                            key={moduleItem.key}
                            type="button"
                            className={
                              moduleItem.key === activeModule?.key
                                ? 'is-active'
                                : ''
                            }
                            onClick={() => {
                              setActiveModuleKey(moduleItem.key);
                              setActivePageKey(moduleItem.pages[0]?.key || '');
                            }}
                          >
                            <Checkbox checked disabled />
                            <span>{moduleItem.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="staff-permission-column is-page">
                      <div className="staff-permission-column-title">页面</div>
                      <div className="staff-permission-column-body">
                        {activeModule?.pages.map((page) => (
                          <button
                            key={page.key}
                            type="button"
                            className={
                              page.key === activePage?.key ? 'is-active' : ''
                            }
                            onClick={() => setActivePageKey(page.key)}
                          >
                            <Checkbox checked disabled />
                            <span>{page.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="staff-permission-column is-actions">
                      <div className="staff-permission-column-title">权限</div>
                      <div className="staff-permission-action-list">
                        {activePage?.permissions.map((permission) => (
                          <Checkbox
                            key={permission.key}
                            checked={permission.checked}
                            disabled
                          >
                            {permission.name}
                          </Checkbox>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="staff-detail-section">
            <div className="staff-section-title">业务权限</div>
            <div className="staff-info-grid">
              <div>
                <span>单笔最大免除额度:</span>
                <strong>-</strong>
              </div>
              <div>
                <span>单品最大使用折扣:</span>
                <strong>{selectedStaff.business.maxSingleDiscount}</strong>
              </div>
              <div>
                <span>整单最大使用折扣:</span>
                <strong>{selectedStaff.business.maxOrderDiscount}</strong>
              </div>
              <div>
                <span>会员数据范围:</span>
                <strong>{selectedStaff.business.dataScope}</strong>
              </div>
              <div>
                <span>供应商数据范围:</span>
                <strong>{selectedStaff.business.supplierScope}</strong>
              </div>
              <div>
                <span>品项数据范围:</span>
                <strong>{selectedStaff.business.productScope}</strong>
              </div>
            </div>
          </section>

          <section className="staff-detail-section">
            <div className="staff-section-title">管辖范围</div>
            <div className="staff-info-grid is-compact">
              <div>
                <span>管辖范围:</span>
                <strong>{selectedStaff.business.manageScope}</strong>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const StoreStaffPage: React.FC = () => {
  const location = useLocation();
  const isCreatePage = location.pathname.endsWith('/create');

  useEffect(() => {
    document.documentElement.classList.add('pc-store-staff-fixed-page');
    document.body.classList.add('pc-store-staff-fixed-page');
    return () => {
      document.documentElement.classList.remove('pc-store-staff-fixed-page');
      document.body.classList.remove('pc-store-staff-fixed-page');
    };
  }, []);

  return isCreatePage ? <StoreStaffCreatePage /> : <StoreStaffListPage />;
};

export default StoreStaffPage;
