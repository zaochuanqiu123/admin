import { phpRequest, resolvePhpUrl } from './phpHttp';

export type IncomeCensusTrendItem = {
  time?: string;
  amount?: string | number;
};

export type GoodsAnalysisTrendItem = {
  time?: string;
  value?: string | number;
};

export type IncomeCensusOverview = {
  turnover_money_total?: string | number;
  order_money_total?: string | number;
  member_pay_money_total?: string | number;
  refund_money_total?: string | number;
  turnover_money_total_trend?: IncomeCensusTrendItem[];
  order_money_total_trend?: IncomeCensusTrendItem[];
  member_pay_money_total_trend?: IncomeCensusTrendItem[];
  refund_money_total_trend?: IncomeCensusTrendItem[];
};

type IncomeCensusResponse = {
  status?: string | number;
  message?: string;
  data?: IncomeCensusOverview;
};

export type GoodsAnalysisOverview = {
  sales_goods_species_count?: string | number;
  payment_sales_goods_species_count?: string | number;
  payment_sales_goods_species_count_trend?: GoodsAnalysisTrendItem[];
  sales_order_count?: string | number;
  sales_order_count_trend?: GoodsAnalysisTrendItem[];
  transaction_people_count?: string | number;
  transaction_people_count_trend?: GoodsAnalysisTrendItem[];
  customer_consume_average_amount?: string | number;
  customer_consume_average_amount_trend?: GoodsAnalysisTrendItem[];
  refund_amount?: string | number;
  visit_goods_people_count?: string | number;
  visit_goods_people_count_trend?: GoodsAnalysisTrendItem[];
  shop_visit_goods_transact_rate?: string | number;
};

type GoodsAnalysisResponse = {
  status?: string | number;
  message?: string;
  data?: GoodsAnalysisOverview;
};

export type PendingOrderTotalOverview = {
  treat_send_order_count?: string | number;
  treat_received_order_count?: string | number;
  completed_order_count?: string | number;
  goods_warning_count?: string | number;
  goods_excess_count?: string | number;
  goods_sell_out_count?: string | number;
  treat_cash_out?: string | number;
};

type PendingOrderTotalResponse = {
  status?: string | number;
  message?: string;
  data?: PendingOrderTotalOverview;
};

export type SuperPlugRankingItem = {
  id?: string;
  plug_name?: string;
  identification?: string;
  icon_url?: string;
  information?: string;
  origin_type?: string;
};

type SuperPlugRankingResponse = {
  status?: string | number;
  message?: string;
  msg?: string;
  data?: SuperPlugRankingItem[];
};

export type StoreRankingItem = {
  store_name?: string;
  value?: string | number;
  rank?: string | number;
};

type StoreRankingResponse = {
  status?: string | number;
  message?: string;
  data?: StoreRankingItem[];
};

export type GoodsRankingItem = {
  goods_name?: string;
  value?: string | number;
  rank?: string | number;
  goods_image?: string;
};

type GoodsRankingResponse = {
  status?: string | number;
  message?: string;
  data?: GoodsRankingItem[];
};

export type VipConsumeRankingItem = {
  headimgurl?: string | null;
  trade_amount?: string | number;
  rank?: string | number;
  vip_name?: string;
};

type VipConsumeRankingResponse = {
  status?: string | number;
  message?: string;
  data?: VipConsumeRankingItem[];
};

export type VipPortraitOverview = {
  vip_sex_people_count_list?: Array<{
    type_name?: string;
    vip_count?: string | number;
  }>;
  vip_grade_people_count_list?: Array<{
    grade_name?: string;
    people_count?: string | number;
  }>;
  vip_age_people_count_list?: Array<{
    age_group?: string;
    age_range?: string;
    vip_count?: string | number;
    count_ratio?: string | number;
  }>;
};

type VipPortraitResponse = {
  status?: string | number;
  message?: string;
  data?: VipPortraitOverview;
};

export type MallUserStatItem = {
  type_name?: string;
  count?: string | number;
};

type MallUserStatResponse = {
  status?: string | number;
  message?: string;
  msg?: string;
  data?: MallUserStatItem[];
};

export async function getIncomeCensus(params: {
  startTime: string;
  endTime: string;
  scene?: 'merchant' | 'store';
  storeIds?: string;
}) {
  const formData = new FormData();
  formData.append('start_time', params.startTime);
  formData.append('end_time', params.endTime);
  if (params.scene !== 'store' && params.storeIds) {
    formData.append('store_ids', params.storeIds);
  }

  const url =
    params.scene === 'store'
      ? '/Retail/Home/getIncomeCensus'
      : '/Retail/Index/getIncomeCensus';

  const response = await phpRequest<IncomeCensusResponse>(url, {
    method: 'POST',
    data: formData,
    tokenHeaderName: 'Authorization',
    tokenPrefix: 'bearer ',
  });

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || '获取经营数据统计失败');
  }

  return response?.data || {};
}

export async function getGoodsAnalysis(params: {
  startTime: string;
  endTime: string;
  type: '1' | '2';
  scene?: 'merchant' | 'store';
  storeIds?: string;
}) {
  const formData = new FormData();
  formData.append('start_time', params.startTime);
  formData.append('end_time', params.endTime);
  formData.append('type', params.type);
  if (params.scene !== 'store' && params.storeIds) {
    formData.append('store_ids', params.storeIds);
  }

  const url =
    params.scene === 'store'
      ? '/Retail/Home/getGoodsAnalysis'
      : '/Retail/Index/getGoodsAnalysis';

  const response = await phpRequest<GoodsAnalysisResponse>(url, {
    method: 'POST',
    data: formData,
    tokenHeaderName: 'Authorization',
    tokenPrefix: 'bearer ',
  });

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || '获取商品分析数据失败');
  }

  return response?.data || {};
}

export async function getSuperPlugRanking() {
  const response = await phpRequest<SuperPlugRankingResponse>(
    '/Retail/Index/getSuperPlugRanking',
    {
      method: 'POST',
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || response?.msg || '获取应用排行失败');
  }

  return Array.isArray(response?.data)
    ? response.data.map((item, index) => ({
        id: item?.id || String(index),
        plug_name: item?.plug_name || '',
        identification: item?.identification || '',
        icon_url: resolvePhpUrl(item?.icon_url || ''),
        information: item?.information || '',
        origin_type: item?.origin_type || '',
      }))
    : [];
}

export async function getPendingOrderTotal() {
  const response = await phpRequest<PendingOrderTotalResponse>(
    '/Retail/Home/getPendingOrderTotal',
    {
      method: 'POST',
      data: new FormData(),
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || '获取待办事项失败');
  }

  return response?.data || {};
}

export async function getStoreRanking(params: {
  startTime: string;
  endTime: string;
  searchType: '1' | '2';
}) {
  const formData = new FormData();
  formData.append('search_type', params.searchType);
  formData.append('start_time', params.startTime);
  formData.append('end_time', params.endTime);

  const response = await phpRequest<StoreRankingResponse>(
    '/Retail/Index/getStoreRanking',
    {
      method: 'POST',
      data: formData,
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || '获取门店排行失败');
  }

  return Array.isArray(response?.data) ? response.data : [];
}

export async function getGoodsRanking(params: {
  startTime: string;
  endTime: string;
  searchType: '1' | '2';
  scene?: 'merchant' | 'store';
  storeIds?: string;
}) {
  const formData = new FormData();
  formData.append('search_type', params.searchType);
  formData.append('start_time', params.startTime);
  formData.append('end_time', params.endTime);
  if (params.scene !== 'store' && params.storeIds) {
    formData.append('store_ids', params.storeIds);
  }

  const url =
    params.scene === 'store'
      ? '/Retail/Home/getGoodsRanking'
      : '/Retail/Index/getGoodsRanking';

  const response = await phpRequest<GoodsRankingResponse>(url, {
    method: 'POST',
    data: formData,
    tokenHeaderName: 'Authorization',
    tokenPrefix: 'bearer ',
  });

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || '获取商品排行失败');
  }

  return Array.isArray(response?.data)
    ? response.data.map((item) => ({
        goods_name: item?.goods_name || '',
        value: item?.value ?? '0',
        rank: item?.rank ?? '',
        goods_image: resolvePhpUrl(item?.goods_image || ''),
      }))
    : [];
}

export async function getVipConsumeRanking(params: {
  startTime: string;
  endTime: string;
  storeIds?: string;
}) {
  const formData = new FormData();
  formData.append('start_time', params.startTime);
  formData.append('end_time', params.endTime);
  if (params.storeIds) {
    formData.append('store_ids', params.storeIds);
  }

  const response = await phpRequest<VipConsumeRankingResponse>(
    '/Retail/Index/getVipConsumeRanking',
    {
      method: 'POST',
      data: formData,
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || '获取会员消费排行失败');
  }

  return Array.isArray(response?.data)
    ? response.data.map((item) => ({
        headimgurl: resolvePhpUrl(item?.headimgurl || ''),
        trade_amount: item?.trade_amount ?? '0',
        rank: item?.rank ?? '',
        vip_name: item?.vip_name || '',
      }))
    : [];
}

export async function getVipPortrait(params?: { storeIds?: string }) {
  const formData = new FormData();
  formData.append('store_ids', params?.storeIds ?? '');

  const response = await phpRequest<VipPortraitResponse>(
    '/Retail/Index/getVipPortrait',
    {
      method: 'POST',
      data: formData,
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(response?.message || '获取会员画像失败');
  }

  return response?.data || {};
}

export async function getAppletMallVisitUser(params: {
  startTime: string;
  endTime: string;
}) {
  const formData = new FormData();
  formData.append('start_time', params.startTime);
  formData.append('end_time', params.endTime);

  const response = await phpRequest<MallUserStatResponse>(
    '/Retail/Index/getAppletMallVisitUser',
    {
      method: 'POST',
      data: formData,
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(
      response?.message || response?.msg || '获取商城访客人数失败',
    );
  }

  return Array.isArray(response?.data) ? response.data : [];
}

export async function getAppletMallTransactUser(params: {
  startTime: string;
  endTime: string;
}) {
  const formData = new FormData();
  formData.append('start_time', params.startTime);
  formData.append('end_time', params.endTime);

  const response = await phpRequest<MallUserStatResponse>(
    '/Retail/Index/getAppletMallTransactUser',
    {
      method: 'POST',
      data: formData,
      tokenHeaderName: 'Authorization',
      tokenPrefix: 'bearer ',
    },
  );

  if (response?.status !== 1 && response?.status !== '1') {
    throw new Error(
      response?.message || response?.msg || '获取商城交易人数失败',
    );
  }

  return Array.isArray(response?.data) ? response.data : [];
}
