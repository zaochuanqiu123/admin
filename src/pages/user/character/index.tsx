import { history, useModel } from '@umijs/max';
import { Button, Card, Form, Input, List, message, Select, Space } from 'antd';
import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { logout as requestLogout } from '@/api/auth';
import { getPermContext, getUserLoginContextResponse } from '@/api/context';
import {
  clearSelectedOrgCode,
  getLoginOrgList,
  setSelectedOrgCode,
} from '@/api/storage';
import CharacterTv from '@/assets/character.png';
import {
  clearAuthStorage,
  clearPostLoginRedirect,
  consumeLoginPendingIdentity,
} from '@/utils/auth-expired';
import {
  extractButtonPermissionMap,
  extractPermContextNodes,
  mapPermContextToMenuData,
} from '@/utils/menu';
import {
  clearStoreScopedStorage,
  clearWorkplaceCommonActionsCache,
  resetStoreScopedInitialState,
} from '@/utils/store-switch';
import './index.less';

type StoreType = 'all' | 'merchant' | 'store';

type StoreItem = {
  id: string;
  name: string;
  desc?: string;
  nickName?: string;
  orgCode?: string;
  roles?: any[];
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

function unwrapApiData<T = any>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as T;
  }
  return res as T;
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
    roles: Array.isArray(org?.roles) ? org.roles : [],
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
  const { initialState, setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const keyword = Form.useWatch('keyword', form) as string | undefined;
  const storeType =
    (Form.useWatch('storeType', form) as StoreType | undefined) || 'all';
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();
  const [loggingOut, setLoggingOut] = useState(false);

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
    const nextPath = '/dashboard/index';
    if (orgCode) {
      clearStoreScopedStorage();
      setInitialState((s: any) => resetStoreScopedInitialState(s));
      setSelectedOrgCode(orgCode);
      try {
        // 先调用登录上下文，再获取无业态参数的权限上下文，接口顺序保持不变。
        const loginContextRes = await getUserLoginContextResponse(orgCode, {
          skipErrorHandler: true,
        });
        const loginContext = unwrapApiData<any>(loginContextRes);

        // 权限上下文接口不再传业态。
        const permRes = await getPermContext({
          skipErrorHandler: true,
        });
        const permNodes = extractPermContextNodes(permRes);
        const permContextMenu = mapPermContextToMenuData(permNodes);
        const buttonPermissions = extractButtonPermissionMap(permRes);

        // 登录后首次选择身份也需要刷新用户信息，不能只等页面刷新后再补。
        const currentUser = await initialState?.fetchUserInfo?.();

        // 更新 initialState，包括用户信息和权限菜单
        setInitialState((s: any) => ({
          ...(s || {}),
          currentUser: currentUser || (s as any)?.currentUser,
          currentOrgCode: orgCode,
          loginContext,
          permContextMenu:
            permContextMenu.length > 0 ? permContextMenu : undefined,
          buttonPermissions:
            buttonPermissions.length > 0 ? buttonPermissions : undefined,
        }));
      } catch (error) {
        if ((error as any)?.info?.authHandled) {
          return;
        }
        console.error('getUserLoginContext or getPermContext failed:', error);
        const backendMessage =
          (error as any)?.info?.errorMessage ||
          (error as any)?.response?.data?.msg ||
          (error as any)?.response?.data?.message ||
          (error as any)?.message ||
          '获取用户信息失败，请稍后重试';
        message.error(String(backendMessage));
        clearSelectedOrgCode();
        setInitialState((s: any) => resetStoreScopedInitialState(s));
        return;
      }
    }
    clearPostLoginRedirect();
    if (consumeLoginPendingIdentity()) {
      message.success('登录成功！');
    }
    history.replace(nextPath);
  };

  const handleBackToLogin = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    let logoutApiFailed = false;

    try {
      await requestLogout({
        skipErrorHandler: true,
      });
    } catch (error) {
      logoutApiFailed = true;
      console.error('requestLogout failed:', error);
    } finally {
      clearAuthStorage();
      clearPostLoginRedirect();
      clearWorkplaceCommonActionsCache();
      setInitialState((s: any) =>
        resetStoreScopedInitialState({
          ...(s || {}),
          currentUser: undefined,
        }),
      );
      history.replace('/user/login');
      if (logoutApiFailed) {
        message.warning('退出接口调用失败，已清理本地登录态');
      } else {
        message.success('已退出登录');
      }
      setLoggingOut(false);
    }
  };

  return (
    <div className="characterPage">
      <div className="bgContainer">
        <img className="characterBgImage" src={CharacterTv} alt="" />
      </div>

      <div className="characterOverlay u-flex-center">
        <div className="glassMask" />
        <div className="cardWrap">
          <Card
            className="characterSelectCard"
            title="请选择登录身份"
            extra={
              <Button
                type="link"
                className="characterBackLoginBtn"
                loading={loggingOut}
                onClick={() => void handleBackToLogin()}
              >
                返回登录
              </Button>
            }
          >
            <Form
              form={form}
              layout="inline"
              initialValues={{ keyword: '', storeType: 'all' as StoreType }}
            >
              <div className="searchRow u-flex-center">
                <Form.Item name="keyword" style={{ flex: 1 }}>
                  <Input
                    className="searchInput"
                    placeholder="请输入身份名称"
                    allowClear
                  />
                </Form.Item>
                <Form.Item label="身份信息" name="storeType">
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
              请选择要登录的身份（共 {filteredStores.length} 个）：
            </div>

            <div className="storeListContainer">
              <List
                dataSource={filteredStores}
                split={false}
                renderItem={(item) => {
                  const active = item.id === selectedStoreId;
                  const cls = [
                    'storeItem',
                    'u-flex-between',
                    active ? 'storeItemActive' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <List.Item style={{ padding: '8px 0' }}>
                      <div
                        className={cls}
                        style={{
                          width: '100%',
                          border: '1px solid rgb(235 227 227)',
                          background: 'transparent',
                          textAlign: 'left',
                          font: 'inherit',
                          color: 'inherit',
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

                        <div className="itemContent u-flex-col">
                          <div className="storeTitleRow u-flex-center">
                            <span className="storeTitle">{item.name}</span>
                          </div>
                          {item.desc ? (
                            <div className="storeDesc">{item.desc}</div>
                          ) : item.nickName ? (
                            <div className="storeDesc">{item.nickName}</div>
                          ) : null}
                          {item.roles?.length ? (
                            <div className="storeDesc roleList u-flex u-flex-wrap">
                              {item.roles.map((role, idx) => (
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
                      </div>
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
