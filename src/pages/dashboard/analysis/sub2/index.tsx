import { PageContainer } from '@ant-design/pro-components'; // 1. 引入页面容器
import type { TableColumnsType } from 'antd';
import {
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  List,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd'; // 2. 引入卡片组件
import React from 'react';

const Page: React.FC = () => {
  type Channel = '全部' | '小程序' | 'App' | 'PC';
  type Store = '全部' | '旗舰店' | '浦东店' | '虹桥店';
  type TicketStatus = '待处理' | '处理中' | '已解决';

  type TicketRow = {
    id: string;
    topic: string;
    store: Store;
    channel: Exclude<Channel, '全部'>;
    priority: '高' | '中' | '低';
    status: TicketStatus;
    updatedAt: string;
  };

  const [form] = Form.useForm();

  const kpis = [
    { title: '客诉工单', value: 36, suffix: '条' },
    { title: '平均响应', value: 12.5, precision: 1, suffix: '分钟' },
    { title: '解决率', value: 92.3, precision: 1, suffix: '%' },
    { title: '升级工单', value: 4, suffix: '条' },
  ];

  const statusTag: Record<TicketStatus, { color: string; text: string }> = {
    待处理: { color: 'default', text: '待处理' },
    处理中: { color: 'processing', text: '处理中' },
    已解决: { color: 'success', text: '已解决' },
  };
  const priorityTag: Record<
    TicketRow['priority'],
    { color: string; text: string }
  > = {
    高: { color: 'red', text: '高' },
    中: { color: 'gold', text: '中' },
    低: { color: 'blue', text: '低' },
  };

  const tickets: TicketRow[] = [
    {
      id: 'CS-20260210-001',
      topic: '配送延迟，用户催单',
      store: '浦东店',
      channel: '小程序',
      priority: '高',
      status: '处理中',
      updatedAt: '2026-02-10 15:18',
    },
    {
      id: 'CS-20260210-002',
      topic: '漏发赠品，申请补寄',
      store: '旗舰店',
      channel: 'App',
      priority: '中',
      status: '待处理',
      updatedAt: '2026-02-10 14:47',
    },
    {
      id: 'CS-20260210-003',
      topic: '商品破损，需退款重发',
      store: '虹桥店',
      channel: 'PC',
      priority: '高',
      status: '处理中',
      updatedAt: '2026-02-10 13:22',
    },
    {
      id: 'CS-20260210-004',
      topic: '发票信息填写错误',
      store: '旗舰店',
      channel: '小程序',
      priority: '低',
      status: '已解决',
      updatedAt: '2026-02-10 12:05',
    },
    {
      id: 'CS-20260210-005',
      topic: '地址修改后仍送错',
      store: '浦东店',
      channel: 'App',
      priority: '中',
      status: '待处理',
      updatedAt: '2026-02-10 10:41',
    },
  ];

  const columns: TableColumnsType<TicketRow> = [
    { title: '工单号', dataIndex: 'id', key: 'id', width: 150, ellipsis: true },
    { title: '问题', dataIndex: 'topic', key: 'topic', ellipsis: true },
    {
      title: '门店',
      dataIndex: 'store',
      key: 'store',
      width: 100,
      render: (v: Store) => <Tag color="geekblue">{v}</Tag>,
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 100,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (p: TicketRow['priority']) => (
        <Tag color={priorityTag[p].color}>{priorityTag[p].text}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: TicketStatus) => (
        <Tag color={statusTag[s].color}>{statusTag[s].text}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 150 },
  ];

  const topReasons = [
    { title: '配送延迟', value: 14, percent: 39 },
    { title: '漏发/错发', value: 9, percent: 25 },
    { title: '商品破损', value: 6, percent: 17 },
    { title: '发票/售后咨询', value: 4, percent: 11 },
    { title: '其他', value: 3, percent: 8 },
  ];

  return (
    // 3. 使用 PageContainer 包裹，它会自动处理面包屑、标题和灰色背景区域
    <PageContainer title="工单查询">
      {/* 4. 使用 Card 包裹内容，这会提供白色的背景和阴影 */}
      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Form
            form={form}
            layout="inline"
            initialValues={{
              channel: '全部' as Channel,
              store: '全部' as Store,
            }}
          >
            <Form.Item label="时间范围" name="range">
              <DatePicker.RangePicker style={{ width: 280 }} />
            </Form.Item>
            <Form.Item label="渠道" name="channel">
              <Select<Channel>
                style={{ width: 140 }}
                options={[
                  { value: '全部', label: '全部' },
                  { value: '小程序', label: '小程序' },
                  { value: 'App', label: 'App' },
                  { value: 'PC', label: 'PC' },
                ]}
              />
            </Form.Item>
            <Form.Item label="门店" name="store">
              <Select<Store>
                style={{ width: 160 }}
                options={[
                  { value: '全部', label: '全部' },
                  { value: '旗舰店', label: '旗舰店' },
                  { value: '浦东店', label: '浦东店' },
                  { value: '虹桥店', label: '虹桥店' },
                ]}
              />
            </Form.Item>
          </Form>

          <Row gutter={[16, 16]}>
            {kpis.map((item) => (
              <Col key={item.title} xs={24} sm={12} lg={6}>
                <Card variant="borderless">
                  <Statistic
                    title={item.title}
                    value={item.value}
                    precision={(item as any).precision}
                    suffix={(item as any).suffix}
                  />
                  <Divider style={{ margin: '12px 0' }} />
                  <Typography.Text type="secondary">当日进度</Typography.Text>
                  <Progress
                    percent={
                      item.title === '客诉工单'
                        ? 64
                        : item.title === '平均响应'
                          ? 72
                          : item.title === '解决率'
                            ? 92
                            : 40
                    }
                    size="small"
                    status="active"
                  />
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card
                title="工单明细"
                variant="borderless"
                styles={{ body: { paddingTop: 0 } }}
              >
                <Table<TicketRow>
                  rowKey="id"
                  columns={columns}
                  dataSource={tickets}
                  pagination={{ pageSize: 5, hideOnSinglePage: true }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card title="问题原因分布" variant="borderless">
                  <List
                    dataSource={topReasons}
                    renderItem={(item) => (
                      <List.Item>
                        <Space
                          direction="vertical"
                          size={6}
                          style={{ width: '100%' }}
                        >
                          <Space
                            style={{
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Typography.Text>{item.title}</Typography.Text>
                            <Typography.Text type="secondary">
                              {item.value} · {item.percent}%
                            </Typography.Text>
                          </Space>
                          <Progress percent={item.percent} size="small" />
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>

                <Card title="处理动态" variant="borderless">
                  <Timeline
                    items={[
                      {
                        children:
                          '15:32 已指派工单 CS-20260210-002 给售后专员（旗舰店）',
                      },
                      {
                        children:
                          '14:58 工单 CS-20260210-001 更新：已联系骑手加急配送',
                      },
                      {
                        children:
                          '13:40 工单 CS-20260210-004 已完结：发票信息已修正并重发',
                      },
                      {
                        children:
                          '09:20 今日工单自动分流规则已生效（按门店/渠道）',
                      },
                    ]}
                  />
                </Card>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>
    </PageContainer>
  );
};

export default Page;
