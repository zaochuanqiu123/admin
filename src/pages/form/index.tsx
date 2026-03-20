import {
  DownOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useRef, useState } from 'react';
import storeCodeBg from '@/assets/allDrawback2.png';
import './index.less';

type StoreItem = {
  key: string;
  storeName: string;
  storeAddress: string;
  storeAddressDetail: string;
  storeCode: string;
  remark: string;
  industry: string;
  contactPhone: string;
  statusText: string;
};

const initialStores: StoreItem[] = [
  {
    key: '123123',
    storeName: '123123',
    storeAddress: '北京/北京市/东城区',
    storeAddressDetail: '西溪银泰城3号门',
    storeCode: '123123123123',
    remark: '123123123123',
    industry: '中式正餐',
    contactPhone: '157****0172',
    statusText: '已创建',
  },
  {
    key: '2323',
    storeName: '2323',
    storeAddress: '北京/北京市/东城区',
    storeAddressDetail: 'asdasdad',
    storeCode: 'asdads',
    remark: 'asd',
    industry: '中式西餐',
    contactPhone: '157****0172',
    statusText: '已创建',
  },
];

const StorePage: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [codeModalStore, setCodeModalStore] = useState<StoreItem | null>(null);
  const [isScrollAtRightEnd, setIsScrollAtRightEnd] = useState(false);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const stores = initialStores;
  const hasSelectedStores = selectedRowKeys.length > 0;

  const columns = useMemo<ColumnsType<StoreItem>>(
    () => [
      {
        title: '门店名称',
        dataIndex: 'storeName',
        width: 180,
      },
      {
        title: '地址',
        dataIndex: 'storeAddress',
        width: 280,
        render: (_value, record) => (
          <div className="store-address-cell u-flex-center">
            <QrcodeOutlined
              className="store-qr-trigger"
              onClick={() => setCodeModalStore(record)}
            />
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
        title: '备注',
        dataIndex: 'remark',
        width: 220,
      },
      {
        title: '经营行业',
        dataIndex: 'industry',
        width: 150,
      },
      {
        title: '联系方式',
        dataIndex: 'contactPhone',
        width: 150,
      },
      {
        title: (
          <span className="status-column-title u-inline-flex-center">
            门店信息状态 <InfoCircleOutlined />
          </span>
        ),
        dataIndex: 'statusText',
        width: 170,
        render: (value) => (
          <span className="status-created u-inline-flex-center">
            <span className="status-dot" />
            {value}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        fixed: isScrollAtRightEnd ? undefined : 'right',
        render: () => (
          <div className="action-links-inline u-flex-center">
            <a>详情</a>
            <a>编辑</a>
            <a>
              更多 <DownOutlined />
            </a>
          </div>
        ),
      },
    ],
    [isScrollAtRightEnd],
  );

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
            <div className="overview-value">{stores.length}</div>
            <div className="overview-actions u-flex-center">
              <Button
                shape="round"
                className="overview-ghost-btn"
                onClick={() => history.push('/form/store-manage/qr-template')}
              >
                门店收款码
              </Button>
              <Dropdown
                trigger={['hover']}
                placement="bottomLeft"
                menu={{
                  items: [
                    { key: 'create-single-store', label: '创建单个门店' },
                    { key: 'create-batch-store', label: '批量创建门店' },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'create-single-store') {
                      history.push('/form/store-manage/create-single');
                    }
                  },
                }}
              >
                <Button
                  type="primary"
                  shape="round"
                  className="overview-primary-btn"
                >
                  添加门店 <DownOutlined />
                </Button>
              </Dropdown>
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
              onClick={() => history.push('/form/store-manage/qr-code')}
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
            <Input placeholder="支持模糊搜索: 如: 海底捞" />
          </div>
          <div className="field u-flex-center">
            <span className="field-label">门店编号</span>
            <Input placeholder="请输入精准编号" />
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
                options={[
                  { label: '所有地区', value: 'all' },
                  { label: '上海市', value: 'sh' },
                  { label: '郑州市', value: 'zz' },
                ]}
              />
            </Space.Compact>
          </div>
          <div className="field u-flex-center">
            <span className="field-label">所属分公司</span>
            <Select
              allowClear
              options={[{ label: '华东分公司', value: 'east' }]}
              placeholder="请选择分公司"
            />
          </div>
          <div className="field u-flex-center">
            <span className="field-label">门店信息状态</span>
            <Select
              allowClear
              options={[
                { label: '待完善', value: 'todo' },
                { label: '完善', value: 'done' },
              ]}
              placeholder="请选择门店信息状态"
            />
          </div>
          <div className="field actions u-flex-center">
            <Button type="primary">查询</Button>
            <Button>重置</Button>
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
            rowKey="key"
            columns={columns}
            dataSource={stores}
            pagination={false}
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

      <Modal
        open={!!codeModalStore}
        title="门店码"
        footer={null}
        width={520}
        centered
        onCancel={() => setCodeModalStore(null)}
        className="store-code-modal"
      >
        {codeModalStore ? (
          <div className="store-code-modal-body u-flex-col u-items-center">
            <div className="store-code-card">
              <img src={storeCodeBg} alt="门店码背景" />
            </div>
            <div className="store-code-name">{codeModalStore.storeName}</div>
            <div className="store-code-no">
              门店编号：{codeModalStore.storeCode}
            </div>
            <Button type="primary" className="store-code-download-btn">
              下载门店码
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default StorePage;
