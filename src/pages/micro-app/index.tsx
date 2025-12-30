import { PageContainer } from '@ant-design/pro-components';
import { MicroApp } from '@umijs/max';
import { Card, Spin } from 'antd';

/**
 * 微应用容器页面
 * 用于加载和展示子应用
 */
const MicroAppContainer: React.FC = () => {
  return (
    <Card>
      {/* MicroApp 组件会自动加载配置的子应用 */}
      <div
        style={{
          position: 'relative',
          transform: 'translateZ(0)',
          overflow: 'auto',
          height: 'calc(100vh - 220px)',
        }}
      >
        <MicroApp
          name="ziadmin"
          base="/micro-app"
          autoSetLoading
          loader={(loading: boolean) => (loading ? <Spin /> : null)}
          autoCaptureError
          errorBoundary={(error: unknown) => (
            <div style={{ padding: 12, color: '#ff4d4f' }}>{String(error)}</div>
          )}
        />
      </div>
    </Card>
  );
};

export default MicroAppContainer;
