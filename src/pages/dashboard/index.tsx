import MicroIframe from '@/components/MicroIframe';

// 🔥 1. [ID -> 路由] 映射表 (子应用点击 -> 主应用跳转)
const ID_TO_PATH_MAP: Record<string, string> = {
  '163': '/dashboard/index',
  '1457': '/shop/index',
  '1459': '/goods/list',
  '1495': '/admin',
};

// 🔥 2. [路由 -> ID] 反向映射表 (刷新页面 -> 找回 ID)
const PATH_TO_ID_MAP: Record<string, string> = {
  '/dashboard/index': '163',
  '/shop/index': '1457',
  '/goods/list': '1459',
  '/admin': '1495',
};

const DashboardMicroApp: React.FC = () => {
  return (
    <MicroIframe
      baseUrl="/api-old-app/Retail/Menu/index.html"
      // 注意：不建议把敏感信息长期写在 URL；这里按你当前项目做保留
      defaultParams={{
        id: '3',
        Token: '1',
        username: '16601725678',
        password: 'asd789',
      }}
      idParamKey="targetId"
      pathToIdMap={PATH_TO_ID_MAP}
      idToPathMap={ID_TO_PATH_MAP}
      loadingText="系统加载中..."
    />
  );
};

export default DashboardMicroApp;
