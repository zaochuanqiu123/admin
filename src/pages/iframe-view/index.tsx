import MicroIframe from '@/components/MicroIframe';

const FormMicroApp: React.FC = () => {
  return (
    <MicroIframe
      baseUrl="http://192.168.1.201:8081/Retail/Menu/index.html"
      idParamKey="targetId"
      heightPayloadKey="scrollHeight"
      minHeight={300}
      heightOffset={20}
      loadingText="系统加载中..."
      buildInitPayload={({ id }) => ({ id: id ?? undefined })}
    />
  );
};

export default FormMicroApp;
