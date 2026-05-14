import { AppstoreOutlined, ReloadOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { Alert, Button, Empty, message } from 'antd';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AppMenuTreeRecord,
  getAppMenuTree,
  getCurrentOrgOpenedApps,
  type OrgAppGroupRecord,
  type OrgAppRecord,
} from '@/api/app';
import { PageSectionSkeleton } from '@/components';
import { getErrorMessage } from '@/utils/apiMessage';
import {
  getCurrentIdentityItem,
  getIdentityItemsFromStorage,
} from '@/utils/identity';
import './index.less';

type MyAppRecord = {
  key: string;
  id?: string;
  appCode?: string;
  appName: string;
  appDesc?: string;
  appIcon?: string;
};

type MyAppCategory = {
  key: string;
  name: string;
  desc?: string;
  apps: MyAppRecord[];
};

function normalizeText(value: unknown) {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function findFirstPathUrl(
  nodes: AppMenuTreeRecord[] | undefined,
): string | undefined {
  for (const node of nodes || []) {
    const pathUrl = normalizeText(node.pathUrl);
    if (pathUrl) return pathUrl;

    const childPathUrl = findFirstPathUrl(
      Array.isArray(node.children) ? node.children : undefined,
    );
    if (childPathUrl) return childPathUrl;
  }

  return undefined;
}

function mapAppRecord(
  app: OrgAppRecord,
  groupIndex: number,
  appIndex: number,
): MyAppRecord {
  const id = normalizeText(app.id);
  const appCode = normalizeText(app.appCode);
  return {
    key: id || appCode || `${groupIndex}-${appIndex}`,
    id,
    appCode,
    appName: normalizeText(app.appName) || '-',
    appDesc: normalizeText(app.appDesc),
    appIcon: normalizeText(app.appIcon),
  };
}

function mapCategoryRecord(
  group: OrgAppGroupRecord,
  groupIndex: number,
): MyAppCategory | null {
  const apps = (Array.isArray(group.appList) ? group.appList : [])
    .map((app, appIndex) => mapAppRecord(app, groupIndex, appIndex))
    .filter((app) => app.appName);

  if (apps.length === 0) return null;

  const id = normalizeText(group.id);
  const name =
    normalizeText(group.categoryName) ||
    normalizeText(group.typeName) ||
    `应用分类 ${groupIndex + 1}`;

  return {
    key: id || name || String(groupIndex),
    name,
    desc: normalizeText(group.categoryDesc) || normalizeText(group.typeDesc),
    apps,
  };
}

const AppIcon: React.FC<{ src?: string; name: string }> = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const canShowImage = !!src && !failed;

  return (
    <span className="my-app-icon" aria-hidden>
      {canShowImage ? (
        <img
          src={src}
          alt=""
          onError={() => {
            setFailed(true);
          }}
        />
      ) : (
        <span className="my-app-icon-fallback">
          {normalizeText(name)?.slice(0, 1) || <AppstoreOutlined />}
        </span>
      )}
    </span>
  );
};

const MyAppPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const [categories, setCategories] = useState<MyAppCategory[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string>();
  const [configuringAppKey, setConfiguringAppKey] = useState<string>();

  const hasData = categories.length > 0;
  const currentIdentity = useMemo(
    () =>
      getCurrentIdentityItem(
        initialState?.currentOrgCode,
        getIdentityItemsFromStorage(),
      ),
    [initialState?.currentOrgCode],
  );
  const accountRole = currentIdentity?.levelName || '';
  const isStore = accountRole.includes('门店');
  const isMerchant = accountRole.includes('商户');
  const isGroup = accountRole.includes('集团');
  const isAgent = accountRole.includes('代理');
  const isPlatform = !isMerchant && !isStore && !isGroup && !isAgent;
  const canConfigureApp = isPlatform || isMerchant || isStore;

  const loadApps = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setInitialLoading(true);
        setListError(undefined);
      } else {
        setRefreshing(true);
      }

      try {
        const res = await getCurrentOrgOpenedApps({
          skipErrorHandler: true,
        });
        const nextCategories = (Array.isArray(res) ? res : [])
          .map(mapCategoryRecord)
          .filter((item): item is MyAppCategory => item !== null);
        setCategories(nextCategories);
        setListError(undefined);
      } catch (error) {
        const errorMessage = getErrorMessage(error, '获取我的应用失败');
        if (mode === 'initial') {
          setListError(errorMessage);
        } else {
          message.error(errorMessage);
        }
      } finally {
        if (mode === 'initial') {
          setInitialLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadApps('initial');
  }, [loadApps]);

  const handleConfigureApp = useCallback(async (app: MyAppRecord) => {
    const appId = app.id || app.appCode;
    if (!appId) {
      message.warning('当前应用缺少 appId，无法配置');
      return;
    }

    setConfiguringAppKey(app.key);
    try {
      const menuTree = await getAppMenuTree(appId, {
        skipErrorHandler: true,
      });
      const pathUrl = findFirstPathUrl(Array.isArray(menuTree) ? menuTree : []);
      if (!pathUrl) {
        message.warning('未获取到应用配置路径');
        return;
      }

      history.push('/app/my-app/sub-app', { pathUrl });
    } catch (error) {
      message.error(getErrorMessage(error, '获取应用配置路径失败'));
    } finally {
      setConfiguringAppKey(undefined);
    }
  }, []);

  const totalCount = useMemo(
    () => categories.reduce((total, group) => total + group.apps.length, 0),
    [categories],
  );

  const contentNode = (() => {
    if (initialLoading) {
      return (
        <div className="my-app-state-card">
          <PageSectionSkeleton rows={8} showToolbar={false} />
        </div>
      );
    }

    if (listError && !hasData) {
      return <Alert type="error" showIcon message={listError} />;
    }

    if (!hasData) {
      return (
        <div className="my-app-state-card">
          <Empty description="暂无已开通应用" />
        </div>
      );
    }

    return (
      <div className="my-app-category-list">
        {categories.map((category) => (
          <section className="my-app-category" key={category.key}>
            <div className="my-app-category-head">
              <h2>{category.name}</h2>
              {category.desc ? <span>{category.desc}</span> : null}
            </div>
            <div className="my-app-grid">
              {category.apps.map((app) => (
                <article className="my-app-card" key={app.key}>
                  <AppIcon src={app.appIcon} name={app.appName} />
                  <div className="my-app-card-main">
                    <div className="my-app-card-title">{app.appName}</div>
                    <div className="my-app-card-desc">
                      {app.appDesc || '暂无应用描述'}
                    </div>
                  </div>
                  {canConfigureApp ? (
                    <Button
                      type="link"
                      className="my-app-config-btn"
                      loading={configuringAppKey === app.key}
                      onClick={() => {
                        void handleConfigureApp(app);
                      }}
                    >
                      配置
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  })();

  return (
    <div className="my-app-page">
      <div className="my-app-panel">
        <div className="my-app-toolbar">
          <div>
            <h1>我的应用</h1>
            {totalCount > 0 ? <p>当前组织已开通 {totalCount} 个应用</p> : null}
          </div>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={() => {
              void loadApps('refresh');
            }}
          >
            刷新
          </Button>
        </div>
        {contentNode}
      </div>
    </div>
  );
};

export default MyAppPage;
