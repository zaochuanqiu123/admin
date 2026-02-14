import MicroIframe from '@/components/MicroIframe';

const AccountMicroApp: React.FC = () => {
  return (
    <MicroIframe
      baseUrl="http://192.168.1.201:8081/Retail/Menu/index.html"
      idParamKey="targetId"
      loadingText="系统加载中..."
    />
  );
};

export default AccountMicroApp;
