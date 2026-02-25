import { history, useModel } from '@umijs/max';
import {
  Button,
  Card,
  Form,
  Input,
  List,
  message,
  Select,
  Space,
  Spin,
} from 'antd';
import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  getPermContext,
  getRoleVOList,
  getUserLoginContext,
} from '@/api/context';
import {
  getLoginOrgList,
  setBusinessList,
  setCurrentBusinessCode,
  setSelectedOrgCode,
} from '@/api/storage';
import CharacterTv from '@/assets/character.png';
import { IFRAME_PATHS } from '@/config/iframe.config';
import {
  clearPostLoginRedirect,
  getPostLoginRedirect,
  getRedirectFromSearch,
  normalizeRedirectPath,
} from '@/utils/auth-expired';
import { buildIframeRouteWithParams } from '@/utils/iframe';
import {
  extractPermContextNodes,
  mapPermContextToMenuData,
  TEMP_BUSINESS_CODE,
} from '@/utils/menu';
import { getAllowedTopPaths } from '@/utils/route.utils';
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
  // 用户反馈接口返回了 orgLevelName，优先使用它来判断和展示
  const orgLevelName = toStringSafe(org?.orgLevelName);

  // 判断是否为商户：levelCode为MER 或 orgLevelName包含'商户'/'公司'
  const isMerchant =
    levelCode === 'MER' ||
    orgLevelName.includes('商户') ||
    orgLevelName.includes('公司');

  const type: Exclude<StoreType, 'all'> = isMerchant ? 'merchant' : 'store';

  return {
    id,
    name,
    desc,
    nickName,
    orgCode,
    type,
    badge: {
      // 如果有 orgLevelName 直接显示（如 "直营门店"、"加盟商户"），否则兜底显示
      text: orgLevelName || (isMerchant ? '商户' : '门店'),
      tone: isMerchant ? 'primary' : 'cyan',
    },
  };
}

const Character: FC = () => {
  console.log('=== Character component rendering ===');
  const { setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const keyword = Form.useWatch('keyword', form) as string | undefined;
  const storeType =
    (Form.useWatch('storeType', form) as StoreType | undefined) || 'all';
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();
  const [roleMap, setRoleMap] = useState<Record<string, any[]>>({});
  const [loadingRoles, setLoadingRoles] = useState<Record<string, boolean>>({});

  const storeData = useMemo<StoreItem[]>(() => {
    console.log('=== useMemo computing storeData ===');
    const orgList = getLoginOrgList<any[]>() ?? [];
    console.log('orgList from localStorage:', orgList);
    const rawList = Array.isArray(orgList) ? orgList : [];
    const flattened = flattenOrgList(rawList);
    console.log('flattened orgList:', flattened);
    const normalized = flattened.map((o, idx) =>
      normalizeOrgToStoreItem(o, idx),
    );
    console.log('normalized storeData:', normalized);
    const uniq = new Map<string, StoreItem>();
    normalized.forEach((x) => {
      if (!uniq.has(x.id)) uniq.set(x.id, x);
    });
    const result = Array.from(uniq.values());
    console.log('final storeData:', result);
    return result;
  }, []);

  useEffect(() => {
    console.log('useEffect triggered, storeData length:', storeData.length);
    const fetchRoles = async () => {
      for (const item of storeData) {
        console.log('Processing item:', item.id, 'orgCode:', item.orgCode);
        if (item.orgCode) {
          setLoadingRoles((prev) => ({ ...prev, [item.id]: true }));
          try {
            const res = await getRoleVOList(item.orgCode, {
              skipErrorHandler: true,
            });
            console.log('getRoleVOList response for', item.orgCode, ':', res);
            const roles = Array.isArray(res) ? res : [];
            setRoleMap((prev) => ({ ...prev, [item.id]: roles }));
          } catch (error) {
            console.error('getRoleVOList failed:', error);
          } finally {
            setLoadingRoles((prev) => ({ ...prev, [item.id]: false }));
          }
        } else {
          console.log('Item has no orgCode:', item.id);
        }
      }
    };
    if (storeData.length > 0) {
      console.log('Calling fetchRoles...');
      fetchRoles();
    } else {
      console.log('storeData is empty, not calling fetchRoles');
    }
  }, [storeData]);

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
    let nextPath = '/dashboard/index';
    const requestedRedirect =
      getRedirectFromSearch() || getPostLoginRedirect() || undefined;
    if (orgCode) {
      setSelectedOrgCode(orgCode);
      try {
        // 1. 先调用 getUserLoginContext 获取登录上下文
        const loginContext = await getUserLoginContext(orgCode, {
          skipErrorHandler: true,
        });

        // 2. 从 loginContext 中提取 businessList 和默认 businessCode
        const businessList = loginContext?.businessList || [];
        const defaultBusiness = businessList[0];
        const businessCode =
          defaultBusiness?.businessCode || TEMP_BUSINESS_CODE;

        // 保存到 localStorage
        setBusinessList(businessList);
        setCurrentBusinessCode(businessCode);

        // 3. 使用 businessCode 调用 getPermContext 获取权限菜单
        const permRes = await getPermContext(businessCode, {
          skipErrorHandler: true,
        });
        const permNodes = extractPermContextNodes(permRes);
        const permContextMenu = mapPermContextToMenuData(permNodes);
        const defaultPath = buildIframeRouteWithParams(
          '/dashboard/index',
          permContextMenu.length > 0 ? permContextMenu : undefined,
        );
        nextPath = defaultPath;

        const redirectPath = normalizeRedirectPath(requestedRedirect);
        if (redirectPath) {
          const targetPathname = String(redirectPath)
            .split('?')[0]
            .split('#')[0];
          const moduleRoot = `/${targetPathname.split('/')[1] || ''}`;
          const isDashboard =
            targetPathname === '/dashboard' ||
            targetPathname.startsWith('/dashboard/');
          const allowedTopPaths = getAllowedTopPaths(
            permContextMenu.length > 0 ? permContextMenu : undefined,
          );
          const isIframeModule = IFRAME_PATHS.some((p) => moduleRoot === p);
          if (
            isDashboard ||
            !isIframeModule ||
            allowedTopPaths.has(moduleRoot)
          ) {
            nextPath = redirectPath;
          } else {
            message.warning('原页面无权限，已跳转到工作台');
          }
        }

        // 4. 更新 initialState，包括登录上下文、业态列表、当前业态和权限菜单
        setInitialState((s: any) => ({
          ...(s || {}),
          currentOrgCode: orgCode,
          loginContext,
          businessList, // 保存业态列表
          currentBusinessCode: businessCode, // 保存当前选中的业态
          permContextMenu:
            permContextMenu.length > 0 ? permContextMenu : undefined,
        }));
      } catch (error) {
        if ((error as any)?.info?.authHandled) {
          return;
        }
        console.error('getUserLoginContext or getPermContext failed:', error);
        message.error('获取用户信息失败，请稍后重试');
        setInitialState((s: any) => ({
          ...(s || {}),
          currentOrgCode: orgCode,
          loginContext: undefined,
        }));
        return;
      }
    }
    clearPostLoginRedirect();
    history.replace(nextPath);
  };

  return (
    <div className="characterPage">
      <div className="bgContainer">
        <img className="characterBgImage" src={CharacterTv} alt="" />
      </div>

      <div className="characterOverlay">
        <div className="glassMask" />
        <div className="cardWrap">
          <Card className="characterSelectCard" title="请选择登录身份">
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
                        style={{
                          width: '100%',
                          border: '1px solid rgb(235 227 227)',
                          background: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          font: 'inherit',
                          color: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
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
                          {loadingRoles[item.id] ? (
                            <div className="storeDesc">
                              <Spin size="small" />
                            </div>
                          ) : roleMap[item.id]?.length ? (
                            <div className="storeDesc roleList">
                              {roleMap[item.id].map((role, idx) => (
                                <span
                                  key={`${item.id}-${role.roleName || role.name || idx}`}
                                  className="roleTag"
                                >
                                  {role.roleName || role.name || '-'}
                                </span>
                              ))}
                            </div>
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
