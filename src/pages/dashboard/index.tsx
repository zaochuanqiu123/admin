import { InfoCircleOutlined } from '@ant-design/icons';
import { Area, Column, Pie } from '@ant-design/plots';
import { DatePicker, Select } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import allDrawback from '@/assets/allDrawback.png';
import allDrawbackActive from '@/assets/allDrawback1.png';
import orderPrice from '@/assets/orderPrice.png';
import orderPriceActive from '@/assets/orderPrice1.png';
import plugTop0 from '@/assets/plug-top0.png';
import plugTop1 from '@/assets/plug-top1.png';
import plugTop2 from '@/assets/plug-top2.png';
import top0 from '@/assets/top0.png';
import top1 from '@/assets/top1.png';
import top2 from '@/assets/top2.png';
import vipPay from '@/assets/vipPay.png';
import vipPayActive from '@/assets/vipPay1.png';
import './index.less';

type StatItem = {
  key: string;
  label: string;
  value: string;
  active?: boolean;
  icon?: string;
  iconActive?: string;
};

type RankItem = {
  key: string;
  name: string;
  status: string;
};

type TrendPoint = {
  date: string;
  value: number;
};

type PiePoint = {
  type: string;
  value: number;
};

type BarPoint = {
  type: string;
  value: number;
};

const overviewStats: StatItem[] = [
  {
    key: 'turnover',
    label: '营业额(元)',
    value: '100',
    icon: orderPrice,
    iconActive: orderPriceActive,
  },
  {
    key: 'orderAmount',
    label: '订单总金额(元)',
    value: '100',
    active: true,
    icon: orderPrice,
    iconActive: orderPriceActive,
  },
  {
    key: 'paidMemberAmount',
    label: '会员余额支付(元)',
    value: '0',
    icon: vipPay,
    iconActive: vipPayActive,
  },
  {
    key: 'refundAmount',
    label: '退款总金额(元)',
    value: '0',
    icon: allDrawback,
    iconActive: allDrawbackActive,
  },
];

const initialActiveOverviewKey =
  overviewStats.find((item) => item.active)?.key ?? overviewStats[0]?.key ?? '';

const shopStats: StatItem[] = [
  { key: 'goodsTotal', label: '在售商品种数', value: '12' },
  { key: 'paidGoods', label: '付款商品数', value: '0' },
  { key: 'tradeCount', label: '交易笔数', value: '0' },
  { key: 'buyerCount', label: '交易人数', value: '0' },
  { key: 'unitPrice', label: '客单价', value: '0' },
  { key: 'refundMoney', label: '退款金额', value: '0' },
  { key: 'visitCount', label: '商品访问人数', value: '0' },
  { key: 'tradeRate', label: '访问交易转化率', value: '0%' },
];

const rankingApps: RankItem[] = [
  { key: 'pos', name: '桌台', status: '0商家在用' },
  { key: 'order', name: '挂账', status: '0商家在用' },
  { key: 'event', name: '油站活动', status: '0商家在用' },
  { key: 'parking', name: '智慧停车场', status: '0商家在用' },
  { key: 'card', name: '消费卡', status: '0商家在用' },
  { key: 'voucher', name: '智慧分账', status: '0商家在用' },
  { key: 'supply', name: '云供应链', status: '0商家在用' },
  { key: 'screen', name: '数据大屏', status: '0商家在用' },
];

const topShops = [
  { rank: 1, name: '锋华科技旗舰店', value: '100.00' },
  { rank: 2, name: '中环科技旗舰店', value: '0' },
  { rank: 3, name: '小毛的店铺', value: '0' },
  { rank: 4, name: '123213', value: '0' },
  { rank: 5, name: '34', value: '0' },
];

const memberTop = [
  { rank: 1, name: '测试6', value: '0' },
  { rank: 2, name: '测试5', value: '0' },
  { rank: 3, name: '测试3', value: '0' },
  { rank: 4, name: '测试2', value: '0' },
  { rank: 5, name: '测试', value: '0' },
];

const topRankBadges = [top0, top1, top2];
const appRankBadges = [plugTop0, plugTop1, plugTop2];

const overviewTrendData: TrendPoint[] = [
  { date: '02/19', value: 0 },
  { date: '02/20', value: 0 },
  { date: '02/21', value: 0 },
  { date: '02/22', value: 0 },
  { date: '02/23', value: 0 },
  { date: '02/24', value: 7375 },
  { date: '02/25', value: 0 },
];

const goodsTrendData: TrendPoint[] = [
  { date: '02/19', value: 0 },
  { date: '02/20', value: 0 },
  { date: '02/21', value: 0 },
  { date: '02/22', value: 0 },
  { date: '02/23', value: 0 },
  { date: '02/24', value: 2 },
  { date: '02/25', value: 0 },
];

const memberGenderData: PiePoint[] = [
  { type: '未知', value: 86 },
  { type: '男', value: 12 },
  { type: '女', value: 2 },
];

const memberLevelData: PiePoint[] = [
  { type: '普通会员', value: 76 },
  { type: '银卡会员', value: 15 },
  { type: '金卡会员', value: 7 },
  { type: '黑金会员', value: 2 },
];

const memberAgeData: BarPoint[] = [
  { type: '0~6', value: 1 },
  { type: '7~12', value: 3 },
  { type: '13~18', value: 8 },
  { type: '19~28', value: 36 },
  { type: '29~35', value: 29 },
  { type: '36~45', value: 15 },
  { type: '46~55', value: 6 },
  { type: '56~', value: 2 },
];

const mallVisitorData: PiePoint[] = [
  { type: '新访问用户', value: 1048 },
  { type: '老访问用户', value: 735 },
];

const mallTraderData: PiePoint[] = [
  { type: '新交易用户', value: 486 },
  { type: '老交易用户', value: 912 },
];

type DashboardAreaChartProps = {
  data: TrendPoint[];
  max: number;
  tickCount: number;
};

const DashboardAreaChart: React.FC<DashboardAreaChartProps> = ({
  data,
  max,
  tickCount,
}) => {
  const config: any = {
    data,
    xField: 'date',
    yField: 'value',
    shapeField: 'smooth',
    legend: false,
    point: false,
    padding: [12, 14, 28, 46],
    axis: {
      x: {
        title: false,
        tick: false,
        line: true,
        lineStroke: '#dce4f1',
        labelFill: '#7f899f',
        labelFontSize: 12,
        grid: true,
        gridLineDash: [4, 4],
        gridStroke: '#e8edf7',
      },
      y: {
        title: false,
        tick: false,
        line: false,
        grid: false,
        labelFill: '#7f899f',
        labelFontSize: 12,
        labelFormatter: (value: string) => Number(value || 0).toLocaleString(),
      },
    },
    scale: {
      x: { range: [0, 1] },
      y: { domain: [0, max], tickCount, nice: false },
    },
    style: {
      stroke: '#1d76ff',
      lineWidth: 2,
      fill: 'linear-gradient(-90deg, rgba(77, 143, 255, 0.7) 0%, rgba(77, 143, 255, 0.06) 100%)',
    },
    tooltip: {
      title: 'date',
      items: [{ channel: 'y', valueFormatter: (value: number) => `${value}` }],
    },
  };

  return (
    <div className="dashboard-chart">
      <Area {...config} />
    </div>
  );
};

type DashboardDonutChartProps = {
  data: PiePoint[];
  colors: string[];
  radius?: number;
  innerRadius?: number;
};

const DashboardDonutChart: React.FC<DashboardDonutChartProps> = ({
  data,
  colors,
  radius = 0.7,
  innerRadius = 0.5,
}) => {
  const config: any = {
    data,
    angleField: 'value',
    colorField: 'type',
    color: colors,
    legend: {
      color: {
        position: 'bottom',
        itemMarker: 'circle',
        itemSpacing: 20,
        layout: {
          justifyContent: 'center',
        },
      },
    },
    label: false,
    annotations: [],
    tooltip: {
      title: false,
      items: [{ channel: 'y', valueFormatter: (value: number) => `${value}` }],
    },
    innerRadius,
    radius,
    style: {
      stroke: '#fff',
      lineWidth: 2,
    },
    height: 220,
    padding: [8, 0, 0, 0],
  };
  return (
    <div className="dashboard-mini-chart">
      <Pie {...config} />
    </div>
  );
};

const DashboardBarChart: React.FC<{ data: BarPoint[] }> = ({ data }) => {
  const config: any = {
    data,
    xField: 'type',
    yField: 'value',
    legend: false,
    axis: {
      x: {
        title: false,
        labelFill: '#7f899f',
        labelFontSize: 12,
        line: true,
        lineStroke: '#dce4f1',
      },
      y: {
        title: false,
        labelFill: '#7f899f',
        labelFontSize: 12,
        grid: true,
        gridLineDash: [4, 4],
        gridStroke: '#e8edf7',
      },
    },
    style: {
      fill: '#5b79d1',
      radiusTopLeft: 6,
      radiusTopRight: 6,
      maxWidth: 26,
    },
    height: 220,
    padding: [12, 12, 26, 36],
  };

  return (
    <div className="dashboard-mini-chart">
      <Column {...config} />
    </div>
  );
};

const DashboardIndexPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(),
    dayjs(),
  ]);
  const [activeOverviewKey, setActiveOverviewKey] = useState<string>(
    initialActiveOverviewKey,
  );
  const [memberDistKey, setMemberDistKey] = useState<
    'gender' | 'level' | 'age'
  >('gender');
  const [mallVisitKey, setMallVisitKey] = useState<'visit' | 'trade'>('visit');

  const memberPieData =
    memberDistKey === 'gender' ? memberGenderData : memberLevelData;
  const mallData = mallVisitKey === 'visit' ? mallVisitorData : mallTraderData;

  return (
    <div className="dashboard-index-page">
      <div className="dashboard-index-layout">
        <div className="dashboard-index-main">
          <section className="dashboard-local-card dashboard-local-card--gradient">
            <div className="dashboard-card-head">
              <div>
                <div className="dashboard-card-title">
                  数据概览 <InfoCircleOutlined />
                </div>
                <div className="dashboard-card-subtitle">02-25 ~ 02-25</div>
              </div>
              <div className="dashboard-card-tools">
                <Select
                  defaultValue="all"
                  options={[{ value: 'all', label: '全部门店' }]}
                />
                <DatePicker.RangePicker
                  value={dateRange}
                  allowClear={false}
                  onChange={(value) => {
                    if (value?.[0] && value?.[1]) {
                      setDateRange([value[0], value[1]]);
                    }
                  }}
                />
              </div>
            </div>

            <div className="dashboard-stat-grid">
              {overviewStats.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={`dashboard-stat-item ${
                    item.key === activeOverviewKey ? 'is-active' : ''
                  }`}
                  onClick={() => setActiveOverviewKey(item.key)}
                >
                  <div className="dashboard-stat-main">
                    <img
                      className="dashboard-overview-icon"
                      src={
                        item.key === activeOverviewKey
                          ? item.iconActive || item.icon
                          : item.icon
                      }
                      alt=""
                    />
                    <div className="dashboard-stat-text">
                      <div className="dashboard-stat-label">{item.label}</div>
                      <div className="dashboard-stat-value">{item.value}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <DashboardAreaChart
              data={overviewTrendData}
              max={8000}
              tickCount={9}
            />
          </section>

          <section className="dashboard-local-card">
            <div className="dashboard-card-head">
              <div>
                <div className="dashboard-card-title">
                  门店商品数据 <InfoCircleOutlined />
                </div>
                <div className="dashboard-card-subtitle">02-25 ~ 02-25</div>
              </div>
              <div className="dashboard-chip-row">
                <button type="button">线下门店商品数据</button>
                <button type="button">线上商城商品数据</button>
              </div>
            </div>

            <div className="dashboard-metrics-grid">
              {shopStats.map((item) => (
                <div key={item.key} className="dashboard-metric-item">
                  <div className="dashboard-metric-label">{item.label}</div>
                  <div className="dashboard-metric-value">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="dashboard-chip-row">
              <button type="button">付款商品数</button>
              <button type="button">交易笔数</button>
              <button type="button">交易人数</button>
              <button type="button">客单价</button>
              <button type="button">商品访问人数</button>
            </div>

            <DashboardAreaChart data={goodsTrendData} max={2} tickCount={3} />
          </section>

          <div className="dashboard-grid-row dashboard-grid-row-3">
            <section className="dashboard-local-card">
              <div className="dashboard-card-head">
                <div>
                  <div className="dashboard-card-title">门店营业额TOP</div>
                  <div className="dashboard-card-subtitle">02-25 ~ 02-25</div>
                </div>
              </div>

              <div className="dashboard-chip-row">
                <button type="button">交易金额</button>
                <button type="button">交易笔数</button>
              </div>

              <table className="dashboard-list-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>门店名称</th>
                    <th>交易金额</th>
                  </tr>
                </thead>
                <tbody>
                  {topShops.map((item) => (
                    <tr key={item.rank}>
                      <td>
                        {item.rank <= 3 ? (
                          <img
                            className="dashboard-table-rank-icon"
                            src={topRankBadges[item.rank - 1]}
                            alt=""
                          />
                        ) : (
                          item.rank
                        )}
                      </td>
                      <td>{item.name}</td>
                      <td>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="dashboard-local-card">
              <div className="dashboard-card-head">
                <div>
                  <div className="dashboard-card-title">商品成交榜TOP</div>
                  <div className="dashboard-card-subtitle">02-25 ~ 02-25</div>
                </div>
              </div>

              <div className="dashboard-chip-row">
                <button type="button">成交金额</button>
                <button type="button">成交件数</button>
              </div>

              <div className="dashboard-empty-image">图片占位</div>
            </section>

            <section className="dashboard-local-card">
              <div className="dashboard-card-head">
                <div>
                  <div className="dashboard-card-title">会员榜TOP</div>
                  <div className="dashboard-card-subtitle">02-25 ~ 02-25</div>
                </div>
              </div>

              <div className="dashboard-chip-row">
                <button type="button">会员注册</button>
                <button type="button">会员消费</button>
              </div>

              <table className="dashboard-list-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>门店名称</th>
                    <th>会员数量</th>
                  </tr>
                </thead>
                <tbody>
                  {memberTop.map((item) => (
                    <tr key={item.rank}>
                      <td>
                        {item.rank <= 3 ? (
                          <img
                            className="dashboard-table-rank-icon"
                            src={topRankBadges[item.rank - 1]}
                            alt=""
                          />
                        ) : (
                          item.rank
                        )}
                      </td>
                      <td>{item.name}</td>
                      <td>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <div className="dashboard-grid-row dashboard-grid-row-2">
            <section className="dashboard-local-card">
              <div className="dashboard-card-head">
                <div>
                  <div className="dashboard-card-title">会员分布</div>
                  <div className="dashboard-card-subtitle">02-25 ~ 02-25</div>
                </div>
              </div>
              <div className="dashboard-chip-row">
                <button
                  type="button"
                  className={memberDistKey === 'gender' ? 'is-active' : ''}
                  onClick={() => setMemberDistKey('gender')}
                >
                  性别分布
                </button>
                <button
                  type="button"
                  className={memberDistKey === 'level' ? 'is-active' : ''}
                  onClick={() => setMemberDistKey('level')}
                >
                  等级分布
                </button>
                <button
                  type="button"
                  className={memberDistKey === 'age' ? 'is-active' : ''}
                  onClick={() => setMemberDistKey('age')}
                >
                  年龄列表
                </button>
              </div>
              {memberDistKey === 'age' ? (
                <DashboardBarChart data={memberAgeData} />
              ) : (
                <DashboardDonutChart
                  data={memberPieData}
                  colors={
                    memberDistKey === 'gender'
                      ? ['#5b79d1', '#84c66c', '#e8ba4a']
                      : ['#5b79d1', '#84c66c', '#e8ba4a', '#e56666']
                  }
                />
              )}
            </section>

            <section className="dashboard-local-card">
              <div className="dashboard-card-head">
                <div>
                  <div className="dashboard-card-title">商城访问人数</div>
                  <div className="dashboard-card-subtitle">02-25 ~ 02-25</div>
                </div>
              </div>
              <div className="dashboard-chip-row">
                <button
                  type="button"
                  className={mallVisitKey === 'visit' ? 'is-active' : ''}
                  onClick={() => setMallVisitKey('visit')}
                >
                  访客人数
                </button>
                <button
                  type="button"
                  className={mallVisitKey === 'trade' ? 'is-active' : ''}
                  onClick={() => setMallVisitKey('trade')}
                >
                  交易人数
                </button>
              </div>
              <DashboardDonutChart
                data={mallData}
                colors={['#5470c6', '#91cc75']}
                innerRadius={0.5}
                radius={0.7}
              />
            </section>
          </div>
        </div>

        <aside className="dashboard-index-side">
          <section className="dashboard-local-card dashboard-local-card--gradient">
            <div className="dashboard-card-head">
              <div className="dashboard-card-title">
                挚伴科技（上海）有限公司
              </div>
            </div>

            <div className="dashboard-org-actions">
              <button type="button" className="dashboard-btn-lifetime">
                终身
              </button>
              <button type="button" className="dashboard-btn-shop">
                <span className="dashboard-btn-shop-icon">♬</span>
                私域商城
              </button>
            </div>

            <div className="dashboard-org-top">
              <div className="dashboard-org-line">
                <span>到期时间</span>
                <span>2124-09-11</span>
              </div>
              <div className="dashboard-org-line">
                <span>剩余天数</span>
                <span>35993</span>
              </div>
            </div>

            <div className="dashboard-org-divider" />

            <div className="dashboard-org-block">
              <div className="dashboard-org-block-head">
                <span>门店数量</span>
                <button type="button">管理</button>
              </div>
              <div className="dashboard-org-block-value">10 / 10</div>
            </div>

            <div className="dashboard-org-divider" />

            <div className="dashboard-org-block">
              <div className="dashboard-org-block-head">
                <span>插件数量</span>
                <button type="button">详情</button>
              </div>
              <div className="dashboard-org-block-value">40 / 41</div>
            </div>
          </section>

          <section className="dashboard-local-card">
            <div className="dashboard-card-head">
              <div className="dashboard-card-title">应用排行</div>
            </div>
            <ul className="dashboard-rank-list">
              {rankingApps.map((item, index) => (
                <li key={item.key}>
                  <span className="dashboard-rank-badge">
                    <img
                      className="dashboard-rank-badge-img"
                      src={appRankBadges[index] || plugTop2}
                      alt=""
                    />
                  </span>
                  <span className="dashboard-rank-meta">
                    <span className="dashboard-rank-name">{item.name}</span>
                    <span className="dashboard-rank-status">{item.status}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DashboardIndexPage;
