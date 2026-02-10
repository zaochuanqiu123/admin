import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button } from 'antd';
import React from 'react';
import {
  getAllowedTopPaths,
  isPathMatch,
  resolveTopRoutePath,
} from '@/utils/route.utils';
import routes from '../../../config/routes';

type TopRouteTabItem = {
  name: string;
  path: string;
  rawPath: string;
};

const WorkplaceCommonTopRouteTabs: React.FC = () => {
  const pathname = history.location.pathname;
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const lastPathRef = React.useRef<string>(pathname);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [activeKey, setActiveKey] = React.useState<string>('');

  const allowedTopPaths = getAllowedTopPaths(
    ((window as any)?.g_initialState as any)?.permContextMenu,
  );

  const topRoutes = React.useMemo(() => {
    const list = (routes as any[])
      .filter((r) => r?.name && r.path)
      .filter((r) => r.path !== '/' && r.path !== '/*' && r.path !== '/user')
      .filter((r) => !(r as any)?.hideInMenu)
      .filter((r) => (r as any)?.layout !== false);

    const mapped: TopRouteTabItem[] = [];
    for (const r of list) {
      const rawPath = String(r.path);
      const targetPath = resolveTopRoutePath(r);
      if (!targetPath) continue;
      mapped.push({ name: String(r.name), path: targetPath, rawPath });
    }
    const filtered = mapped.filter((r) => allowedTopPaths.has(r.rawPath));
    return filtered;
  }, [allowedTopPaths]);

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();

    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true } as any);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', onScroll as any);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scrollByAmount = (delta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const getActiveKeyFromPathname = React.useCallback(() => {
    const found = topRoutes.find(
      (r) => isPathMatch(r.rawPath, pathname) || isPathMatch(r.path, pathname),
    );
    return found?.rawPath ?? topRoutes[0]?.rawPath ?? '';
  }, [pathname, topRoutes]);

  React.useEffect(() => {
    // 首次渲染：用当前路由初始化高亮
    if (!activeKey) {
      setActiveKey(getActiveKeyFromPathname());
    }
  }, [activeKey, getActiveKeyFromPathname]);

  React.useEffect(() => {
    // 当外部路由变化时（例如用户通过其它方式切换页面），同步高亮
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      setActiveKey(getActiveKeyFromPathname());
    }
  }, [getActiveKeyFromPathname, pathname]);

  React.useEffect(() => {
    if (!activeKey) return;
    const el = tabRefs.current[activeKey];
    if (!el) return;
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeKey]);

  if (!topRoutes || topRoutes.length === 0) return null;

  return (
    <div className="workplace-common-drawer-top-tabs">
      <Button
        type="text"
        className="workplace-common-drawer-top-tabs-arrow"
        icon={<LeftOutlined />}
        disabled={!canScrollLeft}
        onClick={() => scrollByAmount(-220)}
      />

      <div className="workplace-common-drawer-top-tabs-scroll" ref={scrollRef}>
        <div className="workplace-common-drawer-top-tabs-list">
          {topRoutes.map((r) => {
            const active = r.rawPath === activeKey;
            return (
              <button
                key={r.rawPath}
                type="button"
                className={
                  'workplace-common-drawer-top-tab' +
                  (active ? ' workplace-common-drawer-top-tab-active' : '')
                }
                ref={(node) => {
                  tabRefs.current[r.rawPath] = node;
                }}
                onClick={() => setActiveKey(r.rawPath)}
              >
                {r.name}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        type="text"
        className="workplace-common-drawer-top-tabs-arrow"
        icon={<RightOutlined />}
        disabled={!canScrollRight}
        onClick={() => scrollByAmount(220)}
      />
    </div>
  );
};

export default WorkplaceCommonTopRouteTabs;
