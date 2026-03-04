import { PageContainer } from '@ant-design/pro-components';
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
} from 'antd';
import React from 'react';

type Channel = '全部' | '小程序' | 'App' | 'PC';
type MetricRow = {
  key: string;
  metric: string;
  value: number;
  wow: number;
  mom: number;
  status: '健康' | '预警' | '异常';
};

const statusMeta: Record<MetricRow['status'], { color: string; text: string }> =
  {
    健康: { color: 'success', text: '健康' },
    预警: { color: 'warning', text: '预警' },
    异常: { color: 'error', text: '异常' },
  };

const Page: React.FC = () => {
  const [form] = Form.useForm();

  const kpis = [
    { title: '访客数', value: 48210, suffix: 'UV' },
    { title: '支付订单', value: 2863, suffix: '单' },
    { title: '支付金额', value: 213540, prefix: '¥' },
    { title: '客单价', value: 74.6, precision: 1, prefix: '¥' },
  ];

  const metricData: MetricRow[] = [
    {
      key: '1',
      metric: '下单转化率',
      value: 6.3,
      wow: 0.4,
      mom: -0.2,
      status: '健康',
    },
    {
      key: '2',
      metric: '支付转化率',
      value: 3.8,
      wow: -0.3,
      mom: 0.1,
      status: '预警',
    },
    {
      key: '3',
      metric: '退款率',
      value: 1.2,
      wow: 0.1,
      mom: 0.2,
      status: '预警',
    },
    {
      key: '4',
      metric: '履约及时率',
      value: 97.4,
      wow: 0.6,
      mom: 0.3,
      status: '健康',
    },
    {
      key: '5',
      metric: '异常订单占比',
      value: 0.7,
      wow: 0.2,
      mom: 0.1,
      status: '异常',
    },
  ];

  const columns: TableColumnsType<MetricRow> = [
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric',
      width: 160,
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      align: 'right',
      width: 120,
      render: (v: number, record) => {
        const suffix =
          record.metric.includes('率') || record.metric.includes('占比')
            ? '%'
            : '';
        return `${v}${suffix}`;
      },
    },
    {
      title: '周同比',
      dataIndex: 'wow',
      key: 'wow',
      align: 'right',
      width: 120,
      render: (v: number) => (
        <Typography.Text type={v >= 0 ? 'success' : 'danger'}>
          {v >= 0 ? `+${v}` : `${v}`}%
        </Typography.Text>
      ),
    },
    {
      title: '月同比',
      dataIndex: 'mom',
      key: 'mom',
      align: 'right',
      width: 120,
      render: (v: number) => (
        <Typography.Text type={v >= 0 ? 'success' : 'danger'}>
          {v >= 0 ? `+${v}` : `${v}`}%
        </Typography.Text>
      ),
    },
    {
      title: '健康度',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: MetricRow['status']) => (
        <Tag color={statusMeta[s].color}>{statusMeta[s].text}</Tag>
      ),
    },
  ];

  const topProducts = [
    { name: 'A 级牛奶 250ml*24', sales: 286, amount: 16280 },
    { name: '坚果礼盒 980g', sales: 214, amount: 42860 },
    { name: '儿童酸奶 200ml*12', sales: 193, amount: 9860 },
    { name: '咖啡豆 500g', sales: 171, amount: 20520 },
    { name: '能量棒 45g*10', sales: 138, amount: 5520 },
  ];

  return (
    <PageContainer title="指标概念" ghost>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card variant="borderless" styles={{ body: { paddingBottom: 0 } }}>
          <Form
            form={form}
            layout="inline"
            initialValues={{ channel: '全部' as Channel }}
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
              <Select
                style={{ width: 200 }}
                allowClear
                placeholder="请选择"
                options={[
                  { value: '旗舰店', label: '旗舰店' },
                  { value: '浦东店', label: '浦东店' },
                  { value: '虹桥店', label: '虹桥店' },
                ]}
              />
            </Form.Item>
          </Form>
        </Card>

        <Row gutter={[16, 16]}>
          {kpis.map((item) => (
            <Col key={item.title} xs={24} sm={12} lg={6}>
              <Card variant="borderless">
                <Statistic
                  title={item.title}
                  value={item.value}
                  precision={(item as any).precision}
                  prefix={(item as any).prefix}
                  suffix={(item as any).suffix}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Row gutter={12}>
                  <Col span={12}>
                    <Typography.Text type="secondary">目标</Typography.Text>
                    <Progress
                      percent={
                        item.title === '访客数'
                          ? 63
                          : item.title === '支付订单'
                            ? 71
                            : item.title === '支付金额'
                              ? 58
                              : 66
                      }
                      size="small"
                      status="active"
                    />
                  </Col>
                  <Col span={12}>
                    <Typography.Text type="secondary">完成</Typography.Text>
                    <Progress
                      percent={
                        item.title === '访客数'
                          ? 48
                          : item.title === '支付订单'
                            ? 52
                            : item.title === '支付金额'
                              ? 44
                              : 56
                      }
                      size="small"
                      strokeColor="#1677ff"
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title="核心指标监控"
              variant="borderless"
              styles={{ body: { paddingTop: 0 } }}
            >
              <Table<MetricRow>
                rowKey="key"
                columns={columns}
                dataSource={metricData}
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card title="今日目标概览" variant="borderless">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Space
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Typography.Text>订单目标</Typography.Text>
                      <Typography.Text type="secondary">
                        2863 / 4000
                      </Typography.Text>
                    </Space>
                    <Progress percent={72} />
                  </div>
                  <div>
                    <Space
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Typography.Text>营收目标</Typography.Text>
                      <Typography.Text type="secondary">
                        ¥213,540 / ¥350,000
                      </Typography.Text>
                    </Space>
                    <Progress percent={61} status="active" />
                  </div>
                  <div>
                    <Space
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Typography.Text>履约及时率</Typography.Text>
                      <Typography.Text type="secondary">97.4%</Typography.Text>
                    </Space>
                    <Progress percent={97} strokeColor="#52c41a" />
                  </div>
                </Space>
              </Card>

              <Card title="热销商品 TOP5" variant="borderless">
                <List
                  dataSource={topProducts}
                  renderItem={(item, index) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space size={8}>
                            <Tag color={index < 3 ? 'geekblue' : 'default'}>
                              {index + 1}
                            </Tag>
                            <Typography.Text>{item.name}</Typography.Text>
                          </Space>
                        }
                        description={
                          <Typography.Text type="secondary">
                            销量 {item.sales} · 销售额 ¥{item.amount}
                          </Typography.Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>

              <Card title="告警与动态" variant="borderless">
                <Timeline
                  items={[
                    { children: '15:20 支付转化率低于阈值（3.8%）已触发预警' },
                    {
                      children:
                        '14:06 异常订单占比上升（0.7%）建议排查配送与库存',
                    },
                    { children: '11:45 新增活动落地页曝光 12,430 次' },
                    { children: '09:30 生成分析日报：渠道/门店/商品' },
                  ]}
                />
              </Card>
            </Space>
          </Col>
        </Row>
      </Space>
    </PageContainer>
  );
};

export default Page;
