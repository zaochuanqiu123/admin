import { InfoCircleOutlined } from '@ant-design/icons';
import { Area, Pie } from '@ant-design/plots';
import { useModel } from '@umijs/max';
import { DatePicker, Empty, message, Select } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import {
  getAppletMallTransactUser,
  getAppletMallVisitUser,
  getGoodsAnalysis,
  getGoodsRanking,
  getIncomeCensus,
  getPendingOrderTotal,
  getStoreRanking,
  getSuperPlugRanking,
  getVipConsumeRanking,
  getVipPortrait,
} from '@/api/dashboard';
import allDrawback from '@/assets/allDrawback.png';
import allDrawbackActive from '@/assets/allDrawback1.png';
import orderPrice from '@/assets/orderPrice.png';
import orderPriceActive from '@/assets/orderPrice1.png';
import plugTop0 from '@/assets/plug-top0.png';
import plugTop1 from '@/assets/plug-top1.png';
import plugTop2 from '@/assets/plug-top2.png';
import suifudaCard from '@/assets/suifuda.jpg';
import top0 from '@/assets/top0.png';
import top1 from '@/assets/top1.png';
import top2 from '@/assets/top2.png';
import vipPay from '@/assets/vipPay.png';
import vipPayActive from '@/assets/vipPay1.png';
import {
  getCurrentIdentityItem,
  getIdentityItemsFromStorage,
} from '@/utils/identity';
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
  icon?: string;
};

type GoodsRankItem = {
  rank: number;
  name: string;
  value: string;
  image?: string;
};

type MemberRankItem = {
  rank: number;
  name: string;
  value: string;
};

type TrendPoint = {
  date: string;
  value: number;
};

type PiePoint = {
  type: string;
  value: number;
  ratio?: string;
};

const merchantOverviewStatMeta: Omit<StatItem, 'value'>[] = [
  {
    key: 'turnover',
    label: '营业额(元)',
    active: true,
    icon: orderPrice,
    iconActive: orderPriceActive,
  },
  {
    key: 'orderAmount',
    label: '订单总金额(元)',
    icon: orderPrice,
    iconActive: orderPriceActive,
  },
  {
    key: 'paidMemberAmount',
    label: '会员余额支付(元)',
    icon: vipPay,
    iconActive: vipPayActive,
  },
  {
    key: 'refundAmount',
    label: '退款总金额(元)',
    icon: allDrawback,
    iconActive: allDrawbackActive,
  },
];

const storeOverviewStatMeta: Omit<StatItem, 'value'>[] = [
  merchantOverviewStatMeta[0],
  merchantOverviewStatMeta[1],
  merchantOverviewStatMeta[3],
];

const initialActiveOverviewKey =
  merchantOverviewStatMeta.find((item) => item.active)?.key ??
  merchantOverviewStatMeta[0]?.key ??
  '';

const emptyOverviewData = {
  turnover: '0.00',
  orderAmount: '0.00',
  paidMemberAmount: '0.00',
  refundAmount: '0.00',
};

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

const goodsTrendMetricMeta = [
  { key: 'paidGoods', label: '付款商品数' },
  { key: 'tradeCount', label: '交易笔数' },
  { key: 'buyerCount', label: '交易人数' },
  { key: 'unitPrice', label: '客单价' },
  { key: 'visitCount', label: '商品访问人数' },
] as const;

const offlineGoodsStatKeys = [
  'goodsTotal',
  'paidGoods',
  'tradeCount',
  'buyerCount',
  'unitPrice',
  'refundMoney',
] as const;

const onlineGoodsStatKeys = [
  ...offlineGoodsStatKeys,
  'visitCount',
  'tradeRate',
] as const;

const emptyGoodsStats = {
  goodsTotal: '0',
  paidGoods: '0',
  tradeCount: '0',
  buyerCount: '0',
  unitPrice: '0.00',
  refundMoney: '0.00',
  visitCount: '0',
  tradeRate: '0%',
};

const emptyRankingApps: RankItem[] = [];
const emptyPendingOrderTotal = {
  treatSendOrderCount: '0',
  treatReceivedOrderCount: '0',
  completedOrderCount: '0',
  goodsWarningCount: '0',
  goodsExcessCount: '0',
  goodsSellOutCount: '0',
};

const emptyTopStoreRanking: Array<{
  rank: number;
  name: string;
  value: string;
}> = [];

const emptyGoodsRanking: GoodsRankItem[] = [];
const emptyMemberRanking: MemberRankItem[] = [];

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

const emptyOverviewTrendMap = {
  turnover: overviewTrendData.map((item) => ({ ...item, value: 0 })),
  orderAmount: overviewTrendData.map((item) => ({ ...item, value: 0 })),
  paidMemberAmount: overviewTrendData.map((item) => ({ ...item, value: 0 })),
  refundAmount: overviewTrendData.map((item) => ({ ...item, value: 0 })),
};

const goodsTrendData: TrendPoint[] = [
  { date: '02/19', value: 0 },
  { date: '02/20', value: 0 },
  { date: '02/21', value: 0 },
  { date: '02/22', value: 0 },
  { date: '02/23', value: 0 },
  { date: '02/24', value: 2 },
  { date: '02/25', value: 0 },
];

const emptyGoodsTrendMap = {
  paidGoods: goodsTrendData.map((item) => ({ ...item, value: 0 })),
  tradeCount: goodsTrendData.map((item) => ({ ...item, value: 0 })),
  buyerCount: goodsTrendData.map((item) => ({ ...item, value: 0 })),
  unitPrice: goodsTrendData.map((item) => ({ ...item, value: 0 })),
  visitCount: goodsTrendData.map((item) => ({ ...item, value: 0 })),
};

const emptyMemberPortraitData = {
  gender: [] as PiePoint[],
  level: [] as PiePoint[],
  age: [] as PiePoint[],
};

const emptyMallUserData = {
  visit: [] as PiePoint[],
  trade: [] as PiePoint[],
};

function toNumber(value: string | number | undefined) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: string | number | undefined) {
  return toNumber(value).toFixed(2);
}

function formatCount(value: string | number | undefined) {
  return toNumber(value).toLocaleString();
}

function formatRate(value: string | number | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return '0%';
  return raw.endsWith('%') ? raw : `${raw}%`;
}

function mapPieData<T>(
  list: T[] | undefined,
  getType: (item: T) => string,
  getValue: (item: T) => string | number | undefined,
) {
  if (!Array.isArray(list) || list.length === 0) {
    return [] as PiePoint[];
  }

  const mapped = list.map((item) => ({
    type: getType(item),
    value: toNumber(getValue(item)),
  }));
  const total = mapped.reduce((sum, item) => sum + item.value, 0);

  return mapped.map((item) => ({
    ...item,
    ratio: total > 0 ? `${((item.value / total) * 100).toFixed(2)}%` : '0.00%',
  }));
}

function mapTrendData(
  list:
    | Array<{
        time?: string;
        amount?: string | number;
        value?: string | number;
      }>
    | undefined,
) {
  if (!Array.isArray(list) || list.length === 0) {
    return overviewTrendData.map((item) => ({ ...item, value: 0 }));
  }
  return list.map((item) => ({
    date: String(item?.time || '').trim() || '-',
    value: toNumber(item?.amount ?? item?.value),
  }));
}

type DashboardAreaChartProps = {
  data: TrendPoint[];
  max: number;
  tickCount: number;
  tooltipLabel?: string;
};

const DashboardAreaChart: React.FC<DashboardAreaChartProps> = ({
  data,
  max,
  tickCount,
  tooltipLabel = '数值',
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
      items: [
        {
          channel: 'y',
          name: tooltipLabel,
          valueFormatter: (value: number) => formatCount(value),
        },
      ],
      render: (event: any, { title, items }: any) => {
        const currentItem = items?.[0];
        if (!currentItem) return '';
        return `
          <div class="dashboard-chart-tooltip">
            <div class="dashboard-chart-tooltip-title">${title || '-'}</div>
            <div class="dashboard-chart-tooltip-row">
              <span class="dashboard-chart-tooltip-name">
                <span class="dashboard-chart-tooltip-dot"></span>
                ${currentItem.name || tooltipLabel}
              </span>
              <span class="dashboard-chart-tooltip-value">${currentItem.value ?? '0'}</span>
            </div>
          </div>
        `;
      },
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
    legend: false,
    label: false,
    annotations: [],
    tooltip: {
      title: (datum: PiePoint) => datum?.type || '-',
      items: [
        {
          field: 'value',
          name: '数量',
          valueFormatter: (value: number) => formatCount(value),
        },
        {
          field: 'ratio',
          name: '占比',
        },
      ],
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
      <div className="dashboard-mini-chart-plot">
        <Pie {...config} />
      </div>
      <div className="dashboard-donut-legend">
        {data.map((item, index) => (
          <div
            key={`${item.type}-${index}`}
            className="dashboard-donut-legend-item"
          >
            <span
              className="dashboard-donut-legend-dot"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="dashboard-donut-legend-text">{item.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardIndexPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(),
    dayjs(),
  ]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewValues, setOverviewValues] = useState(emptyOverviewData);
  const [overviewTrendMap, setOverviewTrendMap] = useState(
    emptyOverviewTrendMap,
  );
  const [activeOverviewKey, setActiveOverviewKey] = useState<string>(
    initialActiveOverviewKey,
  );
  const [goodsLoading, setGoodsLoading] = useState(false);
  const [goodsValues, setGoodsValues] = useState(emptyGoodsStats);
  const [goodsTrendMap, setGoodsTrendMap] = useState(emptyGoodsTrendMap);
  const [goodsType, setGoodsType] = useState<'1' | '2'>('2');
  const [activeGoodsTrendKey, setActiveGoodsTrendKey] =
    useState<(typeof goodsTrendMetricMeta)[number]['key']>('visitCount');
  const [topStoreSearchType, setTopStoreSearchType] = useState<'1' | '2'>('1');
  const [topStoreRanking, setTopStoreRanking] = useState(emptyTopStoreRanking);
  const [goodsRankingSearchType, setGoodsRankingSearchType] = useState<
    '1' | '2'
  >('1');
  const [goodsRanking, setGoodsRanking] =
    useState<GoodsRankItem[]>(emptyGoodsRanking);
  const [memberRankingType, setMemberRankingType] = useState<
    'register' | 'consume'
  >('consume');
  const [memberRanking, setMemberRanking] =
    useState<MemberRankItem[]>(emptyMemberRanking);
  const [memberPortraitData, setMemberPortraitData] = useState(
    emptyMemberPortraitData,
  );
  const [mallUserData, setMallUserData] = useState(emptyMallUserData);
  const [rankingApps, setRankingApps] = useState<RankItem[]>(emptyRankingApps);
  const [pendingOrderTotal, setPendingOrderTotal] = useState(
    emptyPendingOrderTotal,
  );
  const [memberDistKey, setMemberDistKey] = useState<
    'gender' | 'level' | 'age'
  >('gender');
  const [mallVisitKey, setMallVisitKey] = useState<'visit' | 'trade'>('visit');

  const currentIdentity = useMemo(
    () =>
      getCurrentIdentityItem(
        initialState?.currentOrgCode,
        getIdentityItemsFromStorage(),
      ),
    [initialState?.currentOrgCode],
  );
  const isMerchantView = useMemo(() => {
    const levelName = String(
      currentIdentity?.levelName || currentIdentity?.groupLabel || '',
    ).trim();
    if (!levelName) return true;
    return levelName.includes('商户') || levelName.includes('公司');
  }, [currentIdentity?.groupLabel, currentIdentity?.levelName]);
  const overviewStatMeta = isMerchantView
    ? merchantOverviewStatMeta
    : storeOverviewStatMeta;
  const pendingItems = useMemo(
    () => [
      {
        key: 'treatSendOrderCount',
        label: '待发货',
        value: pendingOrderTotal.treatSendOrderCount,
      },
      {
        key: 'treatReceivedOrderCount',
        label: '待收货',
        value: pendingOrderTotal.treatReceivedOrderCount,
      },
      {
        key: 'completedOrderCount',
        label: '已完成',
        value: pendingOrderTotal.completedOrderCount,
      },
      {
        key: 'goodsWarningCount',
        label: '商品预警',
        value: pendingOrderTotal.goodsWarningCount,
      },
      {
        key: 'goodsExcessCount',
        label: '商品超量',
        value: pendingOrderTotal.goodsExcessCount,
      },
      {
        key: 'goodsSellOutCount',
        label: '商品售罄',
        value: pendingOrderTotal.goodsSellOutCount,
      },
    ],
    [pendingOrderTotal],
  );
  const memberPieData = memberPortraitData[memberDistKey];
  const mallData = mallUserData[mallVisitKey];
  const overviewSubtitle = `${dateRange[0].format('MM-DD')} ~ ${dateRange[1].format('MM-DD')}`;
  const overviewStats = useMemo(
    () =>
      overviewStatMeta.map((item) => ({
        ...item,
        value: overviewValues[item.key as keyof typeof overviewValues],
      })),
    [overviewStatMeta, overviewValues],
  );
  const goodsStats = useMemo(
    () =>
      shopStats.map((item) => ({
        ...item,
        value: goodsValues[item.key as keyof typeof goodsValues],
      })),
    [goodsValues],
  );
  const visibleGoodsStats = goodsStats.filter((item) =>
    goodsType === '1'
      ? true
      : item.key !== 'visitCount' && item.key !== 'tradeRate',
  );
  const visibleGoodsTrendMetricMeta = goodsTrendMetricMeta.filter(
    (item) => goodsType === '1' || item.key !== 'visitCount',
  );
  const currentOverviewTrendData =
    overviewTrendMap[activeOverviewKey as keyof typeof overviewTrendMap] ||
    emptyOverviewTrendMap.turnover;
  const activeOverviewLabel =
    overviewStats.find((item) => item.key === activeOverviewKey)?.label ||
    '数值';
  const currentOverviewTrendMax = Math.max(
    100,
    ...currentOverviewTrendData.map((item) => item.value),
  );
  const currentGoodsTrendData =
    goodsTrendMap[activeGoodsTrendKey as keyof typeof goodsTrendMap] ||
    emptyGoodsTrendMap.visitCount;
  const activeGoodsTrendLabel =
    visibleGoodsTrendMetricMeta.find((item) => item.key === activeGoodsTrendKey)
      ?.label || '数值';
  const currentGoodsTrendMax = Math.max(
    2,
    ...currentGoodsTrendData.map((item) => item.value),
  );
  const topStoreValueLabel =
    topStoreSearchType === '1' ? '交易金额' : '交易笔数';
  const goodsRankingValueLabel =
    goodsRankingSearchType === '1' ? '金额' : '件数';
  const memberRankingValueLabel =
    memberRankingType === 'consume' ? '消费金额' : '会员数量';

  useEffect(() => {
    if (overviewStatMeta.some((item) => item.key === activeOverviewKey)) {
      return;
    }
    setActiveOverviewKey(overviewStatMeta[0]?.key || '');
  }, [activeOverviewKey, overviewStatMeta]);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setOverviewLoading(true);
      try {
        const data = await getIncomeCensus({
          startTime: String(dateRange[0].startOf('day').unix()),
          endTime: String(dateRange[1].endOf('day').unix()),
          scene: isMerchantView ? 'merchant' : 'store',
        });
        if (cancelled) return;

        setOverviewValues({
          turnover: formatMoney(data.turnover_money_total),
          orderAmount: formatMoney(data.order_money_total),
          paidMemberAmount: formatMoney(data.member_pay_money_total),
          refundAmount: formatMoney(data.refund_money_total),
        });
        setOverviewTrendMap({
          turnover: mapTrendData(data.turnover_money_total_trend),
          orderAmount: mapTrendData(data.order_money_total_trend),
          paidMemberAmount: mapTrendData(data.member_pay_money_total_trend),
          refundAmount: mapTrendData(data.refund_money_total_trend),
        });
      } catch (error: any) {
        if (cancelled) return;
        setOverviewValues(emptyOverviewData);
        setOverviewTrendMap(emptyOverviewTrendMap);
        message.error(error?.message || '获取数据概览失败');
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      cancelled = true;
    };
  }, [dateRange, isMerchantView]);

  useEffect(() => {
    let cancelled = false;

    async function loadGoodsAnalysis() {
      setGoodsLoading(true);
      try {
        const data = await getGoodsAnalysis({
          startTime: String(dateRange[0].startOf('day').unix()),
          endTime: String(dateRange[1].endOf('day').unix()),
          type: goodsType,
          scene: isMerchantView ? 'merchant' : 'store',
        });
        if (cancelled) return;

        setGoodsValues({
          goodsTotal: String(data.sales_goods_species_count ?? 0),
          paidGoods: String(data.payment_sales_goods_species_count ?? 0),
          tradeCount: String(data.sales_order_count ?? 0),
          buyerCount: String(data.transaction_people_count ?? 0),
          unitPrice: formatMoney(data.customer_consume_average_amount),
          refundMoney: formatMoney(data.refund_amount),
          visitCount: String(data.visit_goods_people_count ?? 0),
          tradeRate: formatRate(data.shop_visit_goods_transact_rate),
        });
        setGoodsTrendMap({
          paidGoods: mapTrendData(data.payment_sales_goods_species_count_trend),
          tradeCount: mapTrendData(data.sales_order_count_trend),
          buyerCount: mapTrendData(data.transaction_people_count_trend),
          unitPrice: mapTrendData(data.customer_consume_average_amount_trend),
          visitCount: mapTrendData(data.visit_goods_people_count_trend),
        });
      } catch (error: any) {
        if (cancelled) return;
        setGoodsValues(emptyGoodsStats);
        setGoodsTrendMap(emptyGoodsTrendMap);
        message.error(error?.message || '获取门店商品数据失败');
      } finally {
        if (!cancelled) {
          setGoodsLoading(false);
        }
      }
    }

    loadGoodsAnalysis();

    return () => {
      cancelled = true;
    };
  }, [dateRange, goodsType, isMerchantView]);

  useEffect(() => {
    let cancelled = false;

    async function loadPendingOrderTotal() {
      if (isMerchantView) {
        setPendingOrderTotal(emptyPendingOrderTotal);
        return;
      }

      try {
        const data = await getPendingOrderTotal();
        if (cancelled) return;

        setPendingOrderTotal({
          treatSendOrderCount: formatCount(data.treat_send_order_count),
          treatReceivedOrderCount: formatCount(data.treat_received_order_count),
          completedOrderCount: formatCount(data.completed_order_count),
          goodsWarningCount: formatCount(data.goods_warning_count),
          goodsExcessCount: formatCount(data.goods_excess_count),
          goodsSellOutCount: formatCount(data.goods_sell_out_count),
        });
      } catch (error: any) {
        if (cancelled) return;
        setPendingOrderTotal(emptyPendingOrderTotal);
        message.error(error?.message || '获取待办事项失败');
      }
    }

    loadPendingOrderTotal();

    return () => {
      cancelled = true;
    };
  }, [isMerchantView]);

  useEffect(() => {
    if (goodsType === '2' && activeGoodsTrendKey === 'visitCount') {
      setActiveGoodsTrendKey('paidGoods');
    }
  }, [goodsType, activeGoodsTrendKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadTopStoreRanking() {
      if (!isMerchantView) {
        setTopStoreRanking(emptyTopStoreRanking);
        return;
      }

      try {
        const data = await getStoreRanking({
          startTime: String(dateRange[0].startOf('day').unix()),
          endTime: String(dateRange[1].endOf('day').unix()),
          searchType: topStoreSearchType,
        });
        if (cancelled) return;
        setTopStoreRanking(
          data.map((item, index) => ({
            rank: Number(item.rank || index + 1),
            name: String(item.store_name || '').trim() || `门店${index + 1}`,
            value: String(item.value ?? '0'),
          })),
        );
      } catch (error: any) {
        if (cancelled) return;
        setTopStoreRanking(emptyTopStoreRanking);
        message.error(error?.message || '获取门店排行失败');
      }
    }

    loadTopStoreRanking();

    return () => {
      cancelled = true;
    };
  }, [dateRange, topStoreSearchType, isMerchantView]);

  useEffect(() => {
    let cancelled = false;

    async function loadGoodsRanking() {
      try {
        const data = await getGoodsRanking({
          startTime: String(dateRange[0].startOf('day').unix()),
          endTime: String(dateRange[1].endOf('day').unix()),
          searchType: goodsRankingSearchType,
          scene: isMerchantView ? 'merchant' : 'store',
        });
        if (cancelled) return;
        setGoodsRanking(
          data.map((item, index) => ({
            rank: Number(item.rank || index + 1),
            name: String(item.goods_name || '').trim() || `商品${index + 1}`,
            value: String(item.value ?? '0'),
            image: String(item.goods_image || '').trim(),
          })),
        );
      } catch (error: any) {
        if (cancelled) return;
        setGoodsRanking(emptyGoodsRanking);
        message.error(error?.message || '获取商品排行失败');
      }
    }

    loadGoodsRanking();

    return () => {
      cancelled = true;
    };
  }, [dateRange, goodsRankingSearchType, isMerchantView]);

  useEffect(() => {
    let cancelled = false;

    async function loadRankingApps() {
      if (!isMerchantView) {
        setRankingApps(emptyRankingApps);
        return;
      }

      try {
        const data = await getSuperPlugRanking();
        if (cancelled) return;
        setRankingApps(
          data.map((item, index) => ({
            key: item.id || String(index),
            name: String(item.plug_name || '').trim() || `应用 ${index + 1}`,
            status:
              String(item.information || '').trim() ||
              String(item.identification || '').trim() ||
              '-',
            icon: String(item.icon_url || '').trim(),
          })),
        );
      } catch (error: any) {
        if (cancelled) return;
        setRankingApps(emptyRankingApps);
        message.error(error?.message || '获取应用排行失败');
      }
    }

    loadRankingApps();

    return () => {
      cancelled = true;
    };
  }, [isMerchantView]);

  useEffect(() => {
    let cancelled = false;

    async function loadMemberRanking() {
      if (!isMerchantView) {
        setMemberRanking(emptyMemberRanking);
        return;
      }

      if (memberRankingType !== 'consume') {
        setMemberRanking(emptyMemberRanking);
        return;
      }

      try {
        const data = await getVipConsumeRanking({
          startTime: String(dateRange[0].startOf('day').unix()),
          endTime: String(dateRange[1].endOf('day').unix()),
        });
        if (cancelled) return;
        setMemberRanking(
          data.map((item, index) => ({
            rank: Number(item.rank || index + 1),
            name: String(item.vip_name || '').trim() || `会员${index + 1}`,
            value: formatMoney(item.trade_amount),
          })),
        );
      } catch (error: any) {
        if (cancelled) return;
        setMemberRanking(emptyMemberRanking);
        message.error(error?.message || '获取会员消费排行失败');
      }
    }

    loadMemberRanking();

    return () => {
      cancelled = true;
    };
  }, [dateRange, memberRankingType, isMerchantView]);

  useEffect(() => {
    let cancelled = false;

    async function loadMemberPortrait() {
      if (!isMerchantView) {
        setMemberPortraitData(emptyMemberPortraitData);
        return;
      }

      try {
        const data = await getVipPortrait();
        if (cancelled) return;

        setMemberPortraitData({
          gender: mapPieData(
            data.vip_sex_people_count_list,
            (item) => String(item.type_name || '').trim() || '未知',
            (item) => item.vip_count,
          ),
          level: mapPieData(
            data.vip_grade_people_count_list,
            (item) => String(item.grade_name || '').trim() || '未知等级',
            (item) => item.people_count,
          ),
          age: mapPieData(
            data.vip_age_people_count_list,
            (item) =>
              String(item.age_range || '').trim() ||
              String(item.age_group || '').trim() ||
              '未知年龄',
            (item) => item.vip_count,
          ),
        });
      } catch (error: any) {
        if (cancelled) return;
        setMemberPortraitData(emptyMemberPortraitData);
        message.error(error?.message || '获取会员画像失败');
      }
    }

    loadMemberPortrait();

    return () => {
      cancelled = true;
    };
  }, [isMerchantView]);

  useEffect(() => {
    let cancelled = false;

    async function loadMallUserData() {
      if (!isMerchantView) {
        setMallUserData(emptyMallUserData);
        return;
      }

      try {
        const [visitData, tradeData] = await Promise.all([
          getAppletMallVisitUser({
            startTime: String(dateRange[0].startOf('day').unix()),
            endTime: String(dateRange[1].endOf('day').unix()),
          }),
          getAppletMallTransactUser({
            startTime: String(dateRange[0].startOf('day').unix()),
            endTime: String(dateRange[1].endOf('day').unix()),
          }),
        ]);
        if (cancelled) return;

        setMallUserData({
          visit: mapPieData(
            visitData,
            (item) => String(item.type_name || '').trim() || '未知',
            (item) => item.count,
          ),
          trade: mapPieData(
            tradeData,
            (item) => String(item.type_name || '').trim() || '未知',
            (item) => item.count,
          ),
        });
      } catch (error: any) {
        if (cancelled) return;
        setMallUserData(emptyMallUserData);
        message.error(error?.message || '获取商城访问人数失败');
      }
    }

    loadMallUserData();

    return () => {
      cancelled = true;
    };
  }, [dateRange, isMerchantView]);

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
                <div className="dashboard-card-subtitle">
                  {overviewLoading ? '数据加载中...' : overviewSubtitle}
                </div>
              </div>
              <div className="dashboard-card-tools">
                {isMerchantView ? (
                  <Select
                    className="dashboard-card-tools__store-select"
                    defaultValue="all"
                    options={[{ value: 'all', label: '全部门店' }]}
                    variant="borderless"
                  />
                ) : null}
                <DatePicker.RangePicker
                  className="dashboard-card-tools__date-range"
                  value={dateRange}
                  allowClear={false}
                  suffixIcon={null}
                  separator={
                    <span className="dashboard-card-tools__range-arrow">~</span>
                  }
                  variant="borderless"
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
                  <div className="dashboard-stat-main u-flex-center">
                    <img
                      className="dashboard-overview-icon"
                      src={
                        item.key === activeOverviewKey
                          ? item.iconActive || item.icon
                          : item.icon
                      }
                      alt=""
                    />
                    <div className="dashboard-stat-text u-flex-col">
                      <div className="dashboard-stat-label">{item.label}</div>
                      <div className="dashboard-stat-value">{item.value}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <DashboardAreaChart
              data={currentOverviewTrendData}
              max={currentOverviewTrendMax}
              tickCount={6}
              tooltipLabel={activeOverviewLabel}
            />
          </section>

          <section className="dashboard-local-card">
            <div className="dashboard-card-head">
              <div>
                <div className="dashboard-card-title">
                  门店商品数据 <InfoCircleOutlined />
                </div>
                <div className="dashboard-card-subtitle">
                  {goodsLoading ? '数据加载中...' : overviewSubtitle}
                </div>
              </div>
              <div className="dashboard-chip-row u-flex u-flex-wrap">
                <button
                  type="button"
                  className={goodsType === '2' ? 'is-active' : ''}
                  onClick={() => setGoodsType('2')}
                >
                  线下门店商品数据
                </button>
                <button
                  type="button"
                  className={goodsType === '1' ? 'is-active' : ''}
                  onClick={() => setGoodsType('1')}
                >
                  线上商城商品数据
                </button>
              </div>
            </div>

            <div
              className={`dashboard-metrics-grid dashboard-metrics-grid--${visibleGoodsStats.length}`}
            >
              {visibleGoodsStats.map((item) => (
                <div key={item.key} className="dashboard-metric-item">
                  <div className="dashboard-metric-label">{item.label}</div>
                  <div className="dashboard-metric-value">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="dashboard-chip-row u-flex u-flex-wrap">
              {visibleGoodsTrendMetricMeta.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={
                    activeGoodsTrendKey === item.key ? 'is-active' : ''
                  }
                  onClick={() => setActiveGoodsTrendKey(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <DashboardAreaChart
              data={currentGoodsTrendData}
              max={currentGoodsTrendMax}
              tickCount={4}
              tooltipLabel={activeGoodsTrendLabel}
            />
          </section>

          {isMerchantView ? (
            <>
              <div className="dashboard-grid-row dashboard-grid-row-3">
                <section className="dashboard-local-card dashboard-ranking-card">
                  <div className="dashboard-card-head">
                    <div>
                      <div className="dashboard-card-title">门店营业额TOP</div>
                      <div className="dashboard-card-subtitle">
                        02-25 ~ 02-25
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-chip-row u-flex u-flex-wrap">
                    <button
                      type="button"
                      className={topStoreSearchType === '1' ? 'is-active' : ''}
                      onClick={() => setTopStoreSearchType('1')}
                    >
                      交易金额
                    </button>
                    <button
                      type="button"
                      className={topStoreSearchType === '2' ? 'is-active' : ''}
                      onClick={() => setTopStoreSearchType('2')}
                    >
                      交易笔数
                    </button>
                  </div>

                  <div className="dashboard-ranking-scroll">
                    <table className="dashboard-list-table">
                      {topStoreRanking.length > 0 ? (
                        <>
                          <thead>
                            <tr>
                              <th>排名</th>
                              <th>门店名称</th>
                              <th>{topStoreValueLabel}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topStoreRanking.map((item) => (
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
                        </>
                      ) : null}
                    </table>
                    {topStoreRanking.length === 0 ? (
                      <div className="dashboard-empty-block">
                        <Empty description="暂无排行数据" />
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="dashboard-local-card dashboard-ranking-card">
                  <div className="dashboard-card-head">
                    <div>
                      <div className="dashboard-card-title">商品成交榜TOP</div>
                      <div className="dashboard-card-subtitle">
                        {overviewSubtitle}
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-chip-row u-flex u-flex-wrap">
                    <button
                      type="button"
                      className={
                        goodsRankingSearchType === '1' ? 'is-active' : ''
                      }
                      onClick={() => setGoodsRankingSearchType('1')}
                    >
                      金额
                    </button>
                    <button
                      type="button"
                      className={
                        goodsRankingSearchType === '2' ? 'is-active' : ''
                      }
                      onClick={() => setGoodsRankingSearchType('2')}
                    >
                      件数
                    </button>
                  </div>

                  <div className="dashboard-ranking-scroll">
                    <table className="dashboard-list-table">
                      {goodsRanking.length > 0 ? (
                        <>
                          <thead>
                            <tr>
                              <th>排名</th>
                              <th>商品名称</th>
                              <th>{goodsRankingValueLabel}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {goodsRanking.map((item) => (
                              <tr key={`${item.rank}-${item.name}`}>
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
                                <td>
                                  <div className="dashboard-goods-rank-cell">
                                    {item.image ? (
                                      <img
                                        className="dashboard-goods-rank-image"
                                        src={item.image}
                                        alt={item.name}
                                      />
                                    ) : null}
                                    <span className="dashboard-goods-rank-name">
                                      {item.name}
                                    </span>
                                  </div>
                                </td>
                                <td>{item.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      ) : null}
                    </table>
                    {goodsRanking.length === 0 ? (
                      <div className="dashboard-empty-block">
                        <Empty description="暂无排行数据" />
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="dashboard-local-card dashboard-ranking-card">
                  <div className="dashboard-card-head">
                    <div>
                      <div className="dashboard-card-title">会员榜TOP</div>
                      <div className="dashboard-card-subtitle">
                        {overviewSubtitle}
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-chip-row u-flex u-flex-wrap">
                    <button
                      type="button"
                      className={
                        memberRankingType === 'register' ? 'is-active' : ''
                      }
                      onClick={() => setMemberRankingType('register')}
                    >
                      会员注册
                    </button>
                    <button
                      type="button"
                      className={
                        memberRankingType === 'consume' ? 'is-active' : ''
                      }
                      onClick={() => setMemberRankingType('consume')}
                    >
                      会员消费
                    </button>
                  </div>

                  <div className="dashboard-ranking-scroll">
                    <table className="dashboard-list-table">
                      {memberRanking.length > 0 ? (
                        <>
                          <thead>
                            <tr>
                              <th>排名</th>
                              <th>会员名称</th>
                              <th>{memberRankingValueLabel}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberRanking.map((item) => (
                              <tr key={`${item.rank}-${item.name}`}>
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
                                <td>
                                  <div className="dashboard-goods-rank-cell">
                                    <span className="dashboard-goods-rank-name">
                                      {item.name}
                                    </span>
                                  </div>
                                </td>
                                <td>{item.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      ) : null}
                    </table>
                    {memberRanking.length === 0 ? (
                      <div className="dashboard-empty-block">
                        <Empty description="暂无排行数据" />
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              <div className="dashboard-grid-row dashboard-grid-row-2">
                <section className="dashboard-local-card dashboard-member-portrait-card">
                  <div className="dashboard-card-head">
                    <div>
                      <div className="dashboard-card-title">会员分布</div>
                      <div className="dashboard-card-subtitle">会员画像</div>
                    </div>
                  </div>
                  <div className="dashboard-chip-row u-flex u-flex-wrap">
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
                  {memberPieData.length > 0 ? (
                    <DashboardDonutChart
                      data={memberPieData}
                      colors={
                        memberDistKey === 'gender'
                          ? ['#5b79d1', '#84c66c', '#e8ba4a']
                          : memberDistKey === 'level'
                            ? [
                                '#5b79d1',
                                '#84c66c',
                                '#e8ba4a',
                                '#e56666',
                                '#6f8ef6',
                                '#60cfc7',
                              ]
                            : [
                                '#5b79d1',
                                '#84c66c',
                                '#e8ba4a',
                                '#e56666',
                                '#6f8ef6',
                                '#60cfc7',
                                '#a56ef5',
                                '#ff9f43',
                              ]
                      }
                    />
                  ) : (
                    <div className="dashboard-empty-block">
                      <Empty description="暂无画像数据" />
                    </div>
                  )}
                </section>

                <section className="dashboard-local-card">
                  <div className="dashboard-card-head">
                    <div>
                      <div className="dashboard-card-title">商城访问人数</div>
                      <div className="dashboard-card-subtitle">
                        {overviewSubtitle}
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-chip-row u-flex u-flex-wrap">
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
                  {mallData.length > 0 ? (
                    <DashboardDonutChart
                      data={mallData}
                      colors={['#5470c6', '#91cc75', '#f6bd16', '#5ad8a6']}
                      innerRadius={0.5}
                      radius={0.7}
                    />
                  ) : (
                    <div className="dashboard-empty-block">
                      <Empty description="暂无人数数据" />
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </div>

        <aside className="dashboard-index-side">
          {isMerchantView ? (
            <>
              <section className="dashboard-local-card dashboard-org-image-card">
                <img
                  className="dashboard-org-image"
                  src={suifudaCard}
                  alt="随付达服务卡片"
                />
              </section>

              <section className="dashboard-local-card dashboard-org-card-bottom">
                <div className="dashboard-org-block">
                  <div className="dashboard-org-block-head u-flex-between">
                    <span>门店数量</span>
                    <button type="button">管理</button>
                  </div>
                  <div className="dashboard-org-block-value">10 / 10</div>
                </div>

                <div className="dashboard-org-divider" />

                <div className="dashboard-org-block">
                  <div className="dashboard-org-block-head u-flex-between">
                    <span>插件数量</span>
                    <button type="button">详情</button>
                  </div>
                  <div className="dashboard-org-block-value">40 / 41</div>
                </div>
              </section>
            </>
          ) : (
            <section className="dashboard-local-card dashboard-pending-card">
              <div className="dashboard-card-head">
                <div className="dashboard-card-title">待办事项</div>
              </div>
              <div className="dashboard-pending-grid">
                {pendingItems.map((item) => (
                  <div key={item.key} className="dashboard-pending-item">
                    <div className="dashboard-pending-value">{item.value}</div>
                    <div className="dashboard-pending-label">{item.label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isMerchantView ? (
            <section className="dashboard-local-card">
              <div className="dashboard-card-head">
                <div className="dashboard-card-title">应用排行</div>
              </div>
              {rankingApps.length > 0 ? (
                <ul className="dashboard-rank-list u-flex-col">
                  {rankingApps.map((item, index) => (
                    <li key={item.key} className="u-flex-center">
                      <span className="dashboard-rank-badge u-inline-flex-middle">
                        {index < 3 ? (
                          <img
                            className="dashboard-rank-badge-img"
                            src={appRankBadges[index]}
                            alt={item.name}
                          />
                        ) : item.icon ? (
                          <img
                            className="dashboard-rank-badge-img"
                            src={item.icon}
                            alt={item.name}
                          />
                        ) : (
                          <span className="dashboard-rank-badge-fallback">
                            {index + 1}
                          </span>
                        )}
                      </span>
                      <span className="dashboard-rank-meta u-flex-col">
                        <span className="dashboard-rank-name">{item.name}</span>
                        <span className="dashboard-rank-status">
                          {item.status}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dashboard-empty-block">
                  <Empty description="暂无排行数据" />
                </div>
              )}
            </section>
          ) : (
            <section className="dashboard-local-card dashboard-ranking-card">
              <div className="dashboard-card-head">
                <div>
                  <div className="dashboard-card-title">商品成交榜</div>
                  <div className="dashboard-card-subtitle">
                    {overviewSubtitle}
                  </div>
                </div>
              </div>

              <div className="dashboard-chip-row u-flex u-flex-wrap">
                <button
                  type="button"
                  className={goodsRankingSearchType === '1' ? 'is-active' : ''}
                  onClick={() => setGoodsRankingSearchType('1')}
                >
                  金额
                </button>
                <button
                  type="button"
                  className={goodsRankingSearchType === '2' ? 'is-active' : ''}
                  onClick={() => setGoodsRankingSearchType('2')}
                >
                  件数
                </button>
              </div>

              <div className="dashboard-ranking-scroll">
                <table className="dashboard-list-table">
                  {goodsRanking.length > 0 ? (
                    <>
                      <thead>
                        <tr>
                          <th>排名</th>
                          <th>商品名称</th>
                          <th>{goodsRankingValueLabel}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {goodsRanking.map((item) => (
                          <tr key={`${item.rank}-${item.name}`}>
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
                    </>
                  ) : null}
                </table>
                {goodsRanking.length === 0 ? (
                  <div className="dashboard-empty-block">
                    <Empty description="暂无排行数据" />
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default DashboardIndexPage;
