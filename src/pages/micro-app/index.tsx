import { PageContainer } from '@ant-design/pro-components';
import { MicroApp, useLocation } from '@umijs/max';
import { Card, Spin } from 'antd';
import { useEffect, useState } from 'react';

/**
 * 微应用容器页面
 * 用于加载和展示子应用
 *
 * 🔥 针对纯静态 HTML 子应用的特殊处理：
 * 由于老项目没有 qiankun 生命周期，需要在路由切换时强制重新挂载
 */
const MicroAppContainer: React.FC = () => {
  const location = useLocation();
  // 🔥 使用 key 强制重新挂载微应用
  // 每次路由变化时，key 改变会导致 MicroApp 组件完全卸载并重新挂载
  const [mountKey, setMountKey] = useState(0);

  useEffect(() => {
    console.log('🔄 路由变化，强制重新挂载微应用:', location.pathname);
    // 路由变化时，更新 key 强制重新挂载
    setMountKey((prev) => prev + 1);
  }, [location.pathname]);

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
          key={mountKey} // 🔥 关键：通过 key 强制重新挂载
          name="jquery-app"
          base="/micro-app"
          autoSetLoading
          loader={(loading: boolean) =>
            loading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <Spin size="large" tip="子应用加载中..." />
              </div>
            ) : null
          }
          autoCaptureError
          errorBoundary={(error: unknown) => (
            <div style={{ padding: 12, color: '#ff4d4f' }}>
              子应用加载失败: {String(error)}
            </div>
          )}
          // 通过 props 向子应用传递数据
          testMessage="来自主应用的测试数据"
          timestamp={new Date().toISOString()}
          userData={{
            name: '测试用户',
            id: 12345,
            token: '12312312313-token',
          }}
        />
      </div>
    </Card>
  );
};

export default MicroAppContainer;
