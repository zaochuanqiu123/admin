import MicroIframe from '@/components/MicroIframe';

// 全局的 ID <=> Path 映射关系
const ID_TO_PATH_MAP: Record<string, string> = {
  '163': '/dashboard/index',
  '1457': '/form',
  '1459': '/list',
  '206': '/profile',
  '1432': '/result',
  '215': '/exception',
  '1917': '/account',
  '1464': '/finance',
  '303': '/set',
  '1495': '/admin',
};

const PATH_TO_ID_MAP: Record<string, string> = {
  '/dashboard/index': '163',
  '/form': '1457',
  '/list': '1459',
  '/profile': '206',
  '/result': '1432',
  '/exception': '215',
  '/account': '1917',
  '/finance': '1464',
  '/set': '303',
  '/admin': '1495',
};

const FormMicroApp: React.FC = () => {
  return (
    <MicroIframe
      baseUrl="/api-old-app/Retail/Menu/index.html"
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

export default FormMicroApp;
