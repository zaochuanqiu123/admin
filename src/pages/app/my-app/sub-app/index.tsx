import MicroIframe from '@/components/MicroIframe';

const MyAppSubAppPage: React.FC = () => {
  return (
    <MicroIframe
      baseUrl="/Retail/Menu/index.html"
      idParamKey="targetId"
      loadingText="系统加载中..."
    />
  );
};

export default MyAppSubAppPage;
