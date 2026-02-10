import { PageContainer, ProCard } from '@ant-design/pro-components';
import type { TableColumnsType } from 'antd';
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Drawer,
  List,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd';
import React from 'react';

const Page: React.FC = () => {
  type TaskStatus = '等待中' | '运行中' | '已完成' | '失败';
  type Task = {
    id: string;
    name: string;
    scope: string;
    status: TaskStatus;
    startedAt: string;
    duration: string;
  };

  type CheckLevel = '高' | '中' | '低';
  type CheckRow = {
    key: string;
    check: string;
    target: string;
    level: CheckLevel;
    result: '通过' | '告警' | '失败';
    message: string;
  };

  const [open, setOpen] = React.useState(false);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const statusMeta: Record<TaskStatus, { color: string; text: string }> = {
    等待中: { color: 'default', text: '等待中' },
    运行中: { color: 'processing', text: '运行中' },
    已完成: { color: 'success', text: '已完成' },
    失败: { color: 'error', text: '失败' },
  };

  const levelMeta: Record<CheckLevel, { color: string; text: string }> = {
    高: { color: 'red', text: '高' },
    中: { color: 'gold', text: '中' },
    低: { color: 'blue', text: '低' },
  };

  const tasks: Task[] = [
    {
      id: 'INS-20260210-01',
      name: '支付链路巡检（全量）',
      scope: 'payment-callback / sign-service / redis',
      status: '运行中',
      startedAt: '2026-02-10 15:46',
      duration: '00:06:12',
    },
    {
      id: 'INS-20260210-00',
      name: '订单链路巡检（核心接口）',
      scope: 'order-service / mysql / mq',
      status: '已完成',
      startedAt: '2026-02-10 14:10',
      duration: '00:03:28',
    },
    {
      id: 'INS-20260209-03',
      name: '缓存命中率健康检查',
      scope: 'cache-redis',
      status: '失败',
      startedAt: '2026-02-09 23:40',
      duration: '00:01:02',
    },
  ];

  const checkRows: CheckRow[] = [
    {
      key: '1',
      check: 'p95 延迟阈值',
      target: 'payment-callback',
      level: '高',
      result: '告警',
      message: 'p95=812ms > 800ms（持续 5m）',
    },
    {
      key: '2',
      check: '错误率阈值',
      target: 'payment-callback',
      level: '高',
      result: '通过',
      message: 'errorRate=0.27%',
    },
    {
      key: '3',
      check: '依赖超时',
      target: 'sign-service',
      level: '中',
      result: '告警',
      message: 'timeout spike（近 10m 发生 12 次）',
    },
    {
      key: '4',
      check: '缓存命中率',
      target: 'cache-redis',
      level: '中',
      result: '失败',
      message: 'hitRate=76%（低于 80% 阈值）',
    },
    {
      key: '5',
      check: '连接池健康',
      target: 'mysql',
      level: '低',
      result: '通过',
      message: 'pool ok',
    },
  ];

  type HistoryRow = {
    id: string;
    name: string;
    status: TaskStatus;
    startedAt: string;
    duration: string;
    abnormal: number;
    warning: number;
  };

  const history: HistoryRow[] = [
    {
      id: 'INS-20260210-01',
      name: '支付链路巡检（全量）',
      status: '运行中',
      startedAt: '2026-02-10 15:46',
      duration: '00:06:12',
      abnormal: 2,
      warning: 2,
    },
    {
      id: 'INS-20260210-00',
      name: '订单链路巡检（核心接口）',
      status: '已完成',
      startedAt: '2026-02-10 14:10',
      duration: '00:03:28',
      abnormal: 0,
      warning: 1,
    },
    {
      id: 'INS-20260209-03',
      name: '缓存命中率健康检查',
      status: '失败',
      startedAt: '2026-02-09 23:40',
      duration: '00:01:02',
      abnormal: 1,
      warning: 0,
    },
  ];

  const historyColumns: TableColumnsType<HistoryRow> = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 160,
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: TaskStatus) => (
        <Tag color={statusMeta[s].color}>{statusMeta[s].text}</Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 160,
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 110,
    },
    {
      title: '异常/告警',
      key: 'ab',
      width: 120,
      render: (_, r) => (
        <Space size={6}>
          <Tag color={r.abnormal > 0 ? 'error' : 'default'}>
            {r.abnormal} 异常
          </Tag>
          <Tag color={r.warning > 0 ? 'warning' : 'default'}>
            {r.warning} 告警
          </Tag>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'op',
      width: 90,
      render: (_, r) => (
        <Button
          type="link"
          onClick={() => {
            const found = tasks.find((t) => t.id === r.id) || null;
            setActiveTask(
              found ?? {
                id: r.id,
                name: r.name,
                scope: 'payment-callback / sign-service / redis',
                status: r.status,
                startedAt: r.startedAt,
                duration: r.duration,
              },
            );
            setOpen(true);
          }}
        >
          查看
        </Button>
      ),
    },
  ];

  const columns: TableColumnsType<CheckRow> = [
    {
      title: '检查项',
      dataIndex: 'check',
      key: 'check',
      width: 140,
    },
    {
      title: '目标',
      dataIndex: 'target',
      key: 'target',
      width: 180,
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 90,
      render: (v: CheckLevel) => (
        <Tag color={levelMeta[v].color}>{levelMeta[v].text}</Tag>
      ),
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 90,
      render: (v: CheckRow['result']) => {
        if (v === '通过') return <Tag color="success">通过</Tag>;
        if (v === '告警') return <Tag color="warning">告警</Tag>;
        return <Tag color="error">失败</Tag>;
      },
    },
    {
      title: '说明',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ];

  return (
    <PageContainer title="链路巡检">
      <ProCard gutter={[16, 16]} wrap>
        <ProCard
          bordered
          headerBordered
          title="巡检摘要"
          colSpan={{ xs: 24, lg: 24 }}
        >
          <Space size={32} wrap>
            <Statistic title="今日巡检次数" value={8} suffix="次" />
            <Statistic
              title="异常项"
              value={3}
              valueStyle={{ color: '#cf1322' }}
              suffix="项"
            />
            <Statistic
              title="告警项"
              value={5}
              valueStyle={{ color: '#d48806' }}
              suffix="项"
            />
            <Statistic title="通过率" value={92.4} precision={1} suffix="%" />
          </Space>
        </ProCard>

        <ProCard
          bordered
          headerBordered
          title="处置建议"
          colSpan={{ xs: 24, lg: 24 }}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="error"
              showIcon
              message="发现 1 项异常（建议优先处理）"
              description="cache-redis 命中率低于阈值，可能引发 DB 压力上升与接口延迟波动。"
            />
            <Steps
              size="small"
              current={1}
              items={[
                {
                  title: '确认影响面',
                  description: '检查热点 Key、穿透与失效策略',
                },
                { title: '临时止血', description: '开启本地缓存兜底/提高 TTL' },
                {
                  title: '根因定位',
                  description: '回溯近期发布、配置、容量变化',
                },
                { title: '复盘固化', description: '补充巡检项与告警阈值' },
              ]}
            />
          </Space>
        </ProCard>
      </ProCard>

      <ProCard
        split="vertical"
        bordered
        headerBordered
        title="巡检中心"
        extra={
          <Space size={8}>
            <Button type="primary">立即巡检</Button>
            <Button>导出报告</Button>
            <Button
              onClick={() => {
                setActiveTask(tasks[0]);
                setOpen(true);
              }}
            >
              查看当前任务
            </Button>
          </Space>
        }
      >
        <ProCard colSpan="360px" bodyStyle={{ padding: 0 }}>
          <List
            header={<Typography.Text strong>最近巡检任务</Typography.Text>}
            dataSource={tasks}
            renderItem={(item) => (
              <List.Item
                style={{ paddingLeft: 16, paddingRight: 16 }}
                actions={[
                  <Button
                    key="detail"
                    type="link"
                    onClick={() => {
                      setActiveTask(item);
                      setOpen(true);
                    }}
                  >
                    详情
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space size={8}>
                      <Typography.Text>{item.name}</Typography.Text>
                      <Tag color={statusMeta[item.status].color}>
                        {statusMeta[item.status].text}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Typography.Text type="secondary">
                      {item.startedAt} · {item.duration}
                    </Typography.Text>
                  }
                />
              </List.Item>
            )}
          />
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: 16 }}>
            <Typography.Text type="secondary">当前范围</Typography.Text>
            <div style={{ marginTop: 6 }}>
              <Typography.Text>{tasks[0].scope}</Typography.Text>
            </div>
          </div>
        </ProCard>

        <ProCard>
          <ProCard split="horizontal" bordered>
            <ProCard
              title="巡检结果概览"
              extra={<Tag color="processing">实时</Tag>}
            >
              <Descriptions
                size="small"
                column={2}
                items={[
                  {
                    label: '任务ID',
                    children: (
                      <Typography.Text code>INS-20260210-01</Typography.Text>
                    ),
                  },
                  { label: '执行人', children: '系统自动' },
                  { label: '检查项', children: '18 项' },
                  { label: '异常项', children: <Tag color="error">2</Tag> },
                  { label: '告警项', children: <Tag color="warning">2</Tag> },
                  { label: '通过项', children: <Tag color="success">14</Tag> },
                ]}
              />
            </ProCard>

            <ProCard title="最近执行记录" bodyStyle={{ paddingTop: 0 }}>
              <Table<HistoryRow>
                rowKey="id"
                columns={historyColumns}
                dataSource={history}
                size="middle"
                pagination={false}
              />
            </ProCard>

            <ProCard title="异常与告警明细" bodyStyle={{ paddingTop: 0 }}>
              <Table<CheckRow>
                rowKey="key"
                columns={columns}
                dataSource={checkRows}
                size="middle"
                pagination={false}
              />
            </ProCard>
          </ProCard>
        </ProCard>
      </ProCard>

      <Drawer
        title="巡检任务详情"
        open={open}
        onClose={() => setOpen(false)}
        width={520}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Descriptions
            size="small"
            column={1}
            items={[
              {
                label: '任务ID',
                children: (
                  <Typography.Text code>
                    {activeTask?.id || '-'}
                  </Typography.Text>
                ),
              },
              { label: '任务名称', children: activeTask?.name || '-' },
              { label: '范围', children: activeTask?.scope || '-' },
              {
                label: '状态',
                children: activeTask ? (
                  <Tag color={statusMeta[activeTask.status].color}>
                    {statusMeta[activeTask.status].text}
                  </Tag>
                ) : (
                  '-'
                ),
              },
              { label: '开始时间', children: activeTask?.startedAt || '-' },
              { label: '耗时', children: activeTask?.duration || '-' },
            ]}
          />

          <Divider style={{ margin: '4px 0' }} />

          <Typography.Text type="secondary">输出（示例）</Typography.Text>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            <Typography.Text code>
              [15:46:18] start inspection
              scope=payment-callback,sign-service,redis
            </Typography.Text>
            <br />
            <Typography.Text code>
              [15:49:03] warn p95 latency exceeded threshold p95=812ms
            </Typography.Text>
            <br />
            <Typography.Text code>
              [15:50:10] error redis hitRate below threshold hitRate=76%
            </Typography.Text>
            <br />
            <Typography.Text code>
              [15:52:30] finish inspection duration=00:06:12
            </Typography.Text>
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </PageContainer>
  );
};

export default Page;
