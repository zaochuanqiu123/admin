import { history, useModel } from '@umijs/max';
import {
  Button,
  Card,
  Carousel,
  Form,
  Input,
  List,
  message,
  Select,
  Space,
} from 'antd';

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { getUserLoginContext } from '@/api/context';
import { getLoginOrgList, setSelectedOrgCode } from '@/api/storage';
import Banner1 from '@/assets/Banner1.jpg';
import Banner2 from '@/assets/Banner2.jpg';
import Banner3 from '@/assets/Banner3.jpg';
import Banner4 from '@/assets/Banner4.jpg';
import './index.less';
type StoreType = 'all' | 'merchant' | 'store';

type StoreItem = {
  id: string;
  name: string;
  desc?: string;
  nickName?: string;
  orgCode?: string;
  badge?: {
    text: string;
    tone: 'primary' | 'cyan';
  };
  type: Exclude<StoreType, 'all'>;
};

function toStringSafe(v: any): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function getAnyArray(o: any, keys: string[]): any[] {
  for (const k of keys) {
    const v = o?.[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function flattenOrgList(list: any[]): any[] {
  const out: any[] = [];
  const visit = (node: any) => {
    if (!node) return;
    out.push(node);
    const children = getAnyArray(node, [
      'children',
      'child',
      'stores',
      'storeList',
      'shopList',
      'orgList',
    ]);
    children.forEach(visit);
  };
  list.forEach(visit);
  return out;
}

function normalizeOrgToStoreItem(org: any, index: number): StoreItem {
  const orgCode =
    toStringSafe(org?.orgCode) ||
    toStringSafe(org?.code) ||
    toStringSafe(org?.orgId) ||
    toStringSafe(org?.id) ||
    toStringSafe(org?.storeId) ||
    undefined;
  const id =
    toStringSafe(org?.orgId) ||
    toStringSafe(org?.id) ||
    toStringSafe(org?.storeId) ||
    toStringSafe(org?.orgCode) ||
    toStringSafe(org?.code) ||
    `org-${index}`;

  const name =
    toStringSafe(org?.name) ||
    toStringSafe(org?.orgName) ||
    toStringSafe(org?.storeName) ||
    toStringSafe(org?.title) ||
    `未命名-${index + 1}`;

  const desc =
    toStringSafe(org?.desc) ||
    toStringSafe(org?.address) ||
    toStringSafe(org?.addr) ||
    toStringSafe(org?.remark) ||
    toStringSafe(org?.orgAddr) ||
    toStringSafe(org?.storeAddr) ||
    undefined;

  const nickName = toStringSafe(org?.nickName) || undefined;

  const levelCode = toStringSafe(org?.levelCode).toUpperCase();
  const isMerchant = levelCode === 'MER';

  const type: Exclude<StoreType, 'all'> = isMerchant ? 'merchant' : 'store';

  return {
    id,
    name,
    desc,
    nickName,
    orgCode,
    type,
    badge: {
      text: isMerchant ? '商户' : '门店',
      tone: isMerchant ? 'primary' : 'cyan',
    },
  };
}

const Character: FC = () => {
  const { setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const keyword = Form.useWatch('keyword', form) as string | undefined;
  const storeType =
    (Form.useWatch('storeType', form) as StoreType | undefined) || 'all';
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();

  const bannerImages = useMemo(() => {
    return [Banner1, Banner2, Banner3, Banner4];
  }, []);

  const storeData = useMemo<StoreItem[]>(() => {
    const orgList = getLoginOrgList<any[]>() ?? [];
    const rawList = Array.isArray(orgList) ? orgList : [];
    const flattened = flattenOrgList(rawList);
    const normalized = flattened.map((o, idx) =>
      normalizeOrgToStoreItem(o, idx),
    );
    const uniq = new Map<string, StoreItem>();
    normalized.forEach((x) => {
      if (!uniq.has(x.id)) uniq.set(x.id, x);
    });
    return Array.from(uniq.values());
  }, []);

  const filteredStores = useMemo(() => {
    const kw = keyword?.trim() || '';
    return storeData.filter((it) => {
      const kwOk = kw ? (it.name || '').includes(kw) : true;
      const typeOk = storeType === 'all' ? true : it.type === storeType;
      return kwOk && typeOk;
    });
  }, [keyword, storeType, storeData]);

  const handleSelectStore = async (item: StoreItem) => {
    setSelectedStoreId(item.id);
    const orgCode = item.orgCode;
    if (orgCode) {
      setSelectedOrgCode(orgCode);
      try {
        const loginContext = await getUserLoginContext(orgCode, {
          skipErrorHandler: true,
        });
        setInitialState((s: any) => ({
          ...(s || {}),
          currentOrgCode: orgCode,
          loginContext,
        }));
      } catch (error) {
        console.error('getUserLoginContext failed:', error);
        message.error('获取用户登录上下文失败，请稍后重试');
        setInitialState((s: any) => ({
          ...(s || {}),
          currentOrgCode: orgCode,
          loginContext: undefined,
        }));
      }
    }
    history.replace('/dashboard/index');
  };

  return (
    <div className="characterPage">
      <div className="bgCarousel">
        <Carousel autoplay autoplaySpeed={3000} effect="fade" dots={false}>
          {bannerImages.map((src) => {
            return (
              <div className="bgSlide" key={src}>
                <img className="bgImage" src={src} alt="" />
              </div>
            );
          })}
        </Carousel>
      </div>

      <div className="overlay">
        <div className="glassMask" />
        <div className="cardWrap">
          <Card className="characterSelectCard" title="选择登录身份">
            <Form
              form={form}
              layout="inline"
              initialValues={{ keyword: '', storeType: 'all' as StoreType }}
            >
              <div className="searchRow">
                <Form.Item name="keyword" style={{ flex: 1 }}>
                  <Input
                    className="searchInput"
                    placeholder="请输入门店名称"
                    allowClear
                  />
                </Form.Item>
                <Form.Item label="门店信息" name="storeType">
                  <Select
                    className="selectInput"
                    options={[
                      { label: '全部', value: 'all' },
                      { label: '商户', value: 'merchant' },
                      { label: '门店', value: 'store' },
                    ]}
                  />
                </Form.Item>
                <Space>
                  <Button
                    onClick={() => {
                      form.resetFields();
                      setSelectedStoreId(undefined);
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </div>
            </Form>

            <div className="listHint">
              请选择要登录的门店（共 {filteredStores.length} 个）：
            </div>

            <div className="storeListContainer">
              <List
                dataSource={filteredStores}
                split={false}
                renderItem={(item) => {
                  const active = item.id === selectedStoreId;
                  const cls = ['storeItem', active ? 'storeItemActive' : '']
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <List.Item style={{ padding: '8px 0' }}>
                      <button
                        type="button"
                        className={cls}
                        onClick={() => void handleSelectStore(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleSelectStore(item);
                        }}
                      >
                        {item.badge && (
                          <div
                            className={`tagCorner ${
                              item.badge.tone === 'primary'
                                ? 'tagPrimary'
                                : 'tagCyan'
                            }`}
                          >
                            {item.badge.text}
                          </div>
                        )}

                        <div className="itemContent">
                          <div className="storeTitleRow">
                            <span className="storeTitle">{item.name}</span>
                          </div>
                          {item.desc ? (
                            <div className="storeDesc">{item.desc}</div>
                          ) : item.nickName ? (
                            <div className="storeDesc">{item.nickName}</div>
                          ) : null}
                        </div>

                        <div className="itemAction">
                          <Button
                            type="primary"
                            ghost={!active}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleSelectStore(item);
                            }}
                          >
                            选择
                          </Button>
                        </div>
                      </button>
                    </List.Item>
                  );
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Character;
