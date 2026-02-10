import { PageContainer } from '@ant-design/pro-components';
import type { TableColumnsType } from 'antd';
import {
  Alert,
  Badge,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  List,
  Progress,
  Row,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import React from 'react';

const Page: React.FC = () => {
  type AlertLevel = 'P0' | 'P1' | 'P2';
  type AlertRow = {
    id: string;
    level: AlertLevel;
    title: string;
    service: string;
    status: '未确认' | '处理中' | '已恢复';
    occurredAt: string;
  };

  const serviceInfo = {
    env: 'prod',
    region: 'ap-southeast-1',
    version: 'v2.6.1',
    owner: '平台组',
    instance: '8/10',
    updatedAt: '2026-02-10 15:53',
  };

  const health = {
    cpu: 62,
    mem: 71,
    disk: 48,
    qps: 1260,
    p95: 182,
    errorRate: 0.27,
  };

  const alerts: AlertRow[] = [
    {
      id: 'AL-20260210-001',
      level: 'P0',
      title: '支付回调延迟升高（p95 > 800ms）',
      service: 'payment-callback',
      status: '处理中',
      occurredAt: '15:32',
    },
    {
      id: 'AL-20260210-002',
      level: 'P1',
      title: 'Redis 命中率下降（< 80%）',
      service: 'cache-redis',
      status: '未确认',
      occurredAt: '14:58',
    },
    {
      id: 'AL-20260210-003',
      level: 'P2',
      title: '订单服务重启次数异常（过去 30 分钟 3 次）',
      service: 'order-service',
      status: '已恢复',
      occurredAt: '13:40',
    },
  ];

  const levelTag: Record<AlertLevel, { color: string; text: string }> = {
    P0: { color: 'red', text: 'P0' },
    P1: { color: 'orange', text: 'P1' },
    P2: { color: 'gold', text: 'P2' },
  };

  const statusTag: Record<AlertRow['status'], { color: string; text: string }> =
    {
      未确认: { color: 'default', text: '未确认' },
      处理中: { color: 'processing', text: '处理中' },
      已恢复: { color: 'success', text: '已恢复' },
    };

  const alertColumns: TableColumnsType<AlertRow> = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 90,
      render: (v: AlertLevel) => (
        <Tag color={levelTag[v].color}>{levelTag[v].text}</Tag>
      ),
    },
    {
      title: '告警',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '服务',
      dataIndex: 'service',
      key: 'service',
      width: 160,
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: AlertRow['status']) => (
        <Tag color={statusTag[s].color}>{statusTag[s].text}</Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 100,
    },
  ];

  const runbook = [
    {
      title: '支付回调延迟升高',
      desc: '检查下游签名服务与网络抖动，必要时切换回调节点。',
    },
    {
      title: 'Redis 命中率下降',
      desc: '排查热点 Key 失效、缓存穿透，临时开启本地缓存兜底。',
    },
    {
      title: '订单服务重启异常',
      desc: '查看容器 OOM / readiness 失败原因，确认发布与配置变更。',
    },
  ];

  return (
    <PageContainer title="处理告警">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          message="当前存在未处理告警"
          description={
            <Space size={12} wrap>
              <span>
                <Badge status="error" /> P0 1 条
              </span>
              <span>
                <Badge status="warning" /> P1 1 条
              </span>
              <span>
                <Badge status="processing" /> 正在处理 1 条
              </span>
              <span>
                <Badge status="success" /> 已恢复 1 条
              </span>
            </Space>
          }
        />

        <Card bordered={false}>
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: '服务概览',
                children: (
                  <Space
                    direction="vertical"
                    size={16}
                    style={{ width: '100%' }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={10}>
                        <Card title="基础信息" bordered={false}>
                          <Descriptions
                            size="small"
                            column={1}
                            items={[
                              {
                                label: '环境',
                                children: (
                                  <Tag color="geekblue">{serviceInfo.env}</Tag>
                                ),
                              },
                              {
                                label: '区域',
                                children: (
                                  <Typography.Text code>
                                    {serviceInfo.region}
                                  </Typography.Text>
                                ),
                              },
                              {
                                label: '版本',
                                children: (
                                  <Typography.Text code>
                                    {serviceInfo.version}
                                  </Typography.Text>
                                ),
                              },
                              { label: '负责人', children: serviceInfo.owner },
                              {
                                label: '实例健康',
                                children: (
                                  <Space size={8}>
                                    <Progress percent={80} size="small" />
                                    <Typography.Text type="secondary">
                                      {serviceInfo.instance}
                                    </Typography.Text>
                                  </Space>
                                ),
                              },
                              {
                                label: '最近更新时间',
                                children: serviceInfo.updatedAt,
                              },
                            ]}
                          />
                        </Card>
                      </Col>

                      <Col xs={24} lg={14}>
                        <Card title="实时健康指标" bordered={false}>
                          <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                              <Typography.Text type="secondary">
                                CPU 使用率
                              </Typography.Text>
                              <Progress
                                percent={health.cpu}
                                status={
                                  health.cpu > 85 ? 'exception' : 'active'
                                }
                              />
                            </Col>
                            <Col xs={24} md={12}>
                              <Typography.Text type="secondary">
                                内存使用率
                              </Typography.Text>
                              <Progress
                                percent={health.mem}
                                status={
                                  health.mem > 85 ? 'exception' : 'active'
                                }
                              />
                            </Col>
                            <Col xs={24} md={12}>
                              <Typography.Text type="secondary">
                                磁盘使用率
                              </Typography.Text>
                              <Progress
                                percent={health.disk}
                                status={
                                  health.disk > 85 ? 'exception' : 'active'
                                }
                              />
                            </Col>
                            <Col xs={24} md={12}>
                              <Typography.Text type="secondary">
                                错误率
                              </Typography.Text>
                              <Progress
                                percent={Math.min(
                                  100,
                                  Math.round(health.errorRate * 100),
                                )}
                                strokeColor={
                                  health.errorRate > 1 ? '#ff4d4f' : '#52c41a'
                                }
                              />
                            </Col>
                          </Row>
                          <Divider style={{ margin: '12px 0' }} />
                          <Row gutter={16}>
                            <Col xs={12} md={8}>
                              <Typography.Text type="secondary">
                                QPS
                              </Typography.Text>
                              <div style={{ fontSize: 18, fontWeight: 600 }}>
                                {health.qps}
                              </div>
                            </Col>
                            <Col xs={12} md={8}>
                              <Typography.Text type="secondary">
                                p95 延迟
                              </Typography.Text>
                              <div style={{ fontSize: 18, fontWeight: 600 }}>
                                {health.p95}ms
                              </div>
                            </Col>
                            <Col xs={12} md={8}>
                              <Typography.Text type="secondary">
                                错误率
                              </Typography.Text>
                              <div style={{ fontSize: 18, fontWeight: 600 }}>
                                {health.errorRate}%
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={14}>
                        <Card
                          title="告警列表"
                          bordered={false}
                          styles={{ body: { paddingTop: 0 } }}
                        >
                          <Table<AlertRow>
                            rowKey="id"
                            columns={alertColumns}
                            dataSource={alerts}
                            pagination={false}
                            size="middle"
                          />
                        </Card>
                      </Col>
                      <Col xs={24} lg={10}>
                        <Card title="处理手册（Runbook）" bordered={false}>
                          <List
                            dataSource={runbook}
                            renderItem={(item) => (
                              <List.Item>
                                <List.Item.Meta
                                  title={
                                    <Typography.Text>
                                      {item.title}
                                    </Typography.Text>
                                  }
                                  description={
                                    <Typography.Text type="secondary">
                                      {item.desc}
                                    </Typography.Text>
                                  }
                                />
                              </List.Item>
                            )}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </Space>
                ),
              },
              {
                key: 'deploy',
                label: '发布与变更',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card title="发布进度" bordered={false}>
                        <Steps
                          direction="vertical"
                          current={2}
                          items={[
                            {
                              title: '拉取镜像',
                              description:
                                'registry.example.com/payment-callback:v2.6.1',
                            },
                            {
                              title: '灰度发布',
                              description: '10% 流量，观察 15 分钟',
                            },
                            {
                              title: '扩容实例',
                              description: '从 8 扩至 10，正在滚动更新',
                            },
                            {
                              title: '全量切换',
                              description: '全部实例健康后自动切换',
                            },
                          ]}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card title="变更记录" bordered={false}>
                        <Timeline
                          items={[
                            {
                              children:
                                '15:40 变更：调整回调重试策略（maxRetries=5）',
                            },
                            {
                              children:
                                '14:20 变更：缓存过期时间从 5min 改为 10min',
                            },
                            {
                              children:
                                '11:10 发布：payment-callback v2.6.1（修复签名校验）',
                            },
                            {
                              children: '09:00 变更：告警阈值更新（p95 800ms）',
                            },
                          ]}
                        />
                      </Card>
                    </Col>
                    <Col span={24}>
                      <Card title="排障信息" bordered={false}>
                        <Collapse
                          items={[
                            {
                              key: 'log',
                              label: '最近 5 条日志（示例）',
                              children: (
                                <Space
                                  direction="vertical"
                                  size={6}
                                  style={{ width: '100%' }}
                                >
                                  <Typography.Text code>
                                    [15:41:02] INFO callback latency p95=812ms,
                                    retry=enabled
                                  </Typography.Text>
                                  <Typography.Text code>
                                    [15:40:18] WARN downstream sign-service
                                    timeout, traceId=8f1...
                                  </Typography.Text>
                                  <Typography.Text code>
                                    [15:39:55] INFO autoscale desired=10
                                    current=9
                                  </Typography.Text>
                                  <Typography.Text code>
                                    [15:39:10] ERROR redis connection reset,
                                    pool=default
                                  </Typography.Text>
                                  <Typography.Text code>
                                    [15:38:44] INFO healthcheck ok,
                                    instance=i-03
                                  </Typography.Text>
                                </Space>
                              ),
                            },
                            {
                              key: 'tips',
                              label: '快速排查建议',
                              children: (
                                <List
                                  size="small"
                                  dataSource={[
                                    '先确认是否有发布/配置变更导致的抖动，再检查下游签名服务延迟。',
                                    '查看 Redis 命中率下降是否来自热点 Key 失效或穿透。',
                                    '优先处理 P0：必要时临时降级回调链路，保证核心支付闭环。',
                                  ]}
                                  renderItem={(t) => (
                                    <List.Item>
                                      <Typography.Text>{t}</Typography.Text>
                                    </List.Item>
                                  )}
                                />
                              ),
                            },
                          ]}
                        />
                      </Card>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default Page;
