import { useLocation } from '@umijs/max';
import { Card, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';

/**
 * 微应用容器页面
 *
 * 🔥🔥 针对纯静态 HTML 子应用，使用 iframe 方案
 * 因为 qiankun 无法正确处理没有生命周期的纯 HTML 应用
 */
const MicroAppContainer: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 子应用的 URL
  const subAppUrl =
    '/api-old-app/Retail/Menu/index.html?Token=1&username=16601725678&password=asd789&id=3';

  useEffect(() => {
    console.log('🔄 路由变化，重新加载 iframe:', location.pathname);

    // 🔥 每次路由变化时，强制重新加载 iframe
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  }, [location.pathname]);

  const handleIframeLoad = () => {
    console.log('✅ iframe 加载完成');
    setLoading(false);

    // 🔥 向子应用发送数据
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'FROM_MAIN_APP',
          payload: {
            testMessage: '来自主应用的测试数据',
            timestamp: new Date().toISOString(),
            pathname: location.pathname,
            userData: {
              name: '测试用户',
              id: 12345,
              token: '12312312313-token',
            },
          },
        },
        '*',
      );
      console.log('📤 已向子应用发送数据');
    }
  };

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          height: 'calc(100vh - 59px)',
        }}
      >
        {/* 加载状态 */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#fff',
              zIndex: 10,
            }}
          >
            <Spin size="large" tip="子应用加载中..." />
          </div>
        )}

        {/* 🔥 使用 iframe 加载子应用 */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={subAppUrl}
          title="micro-app"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: loading ? 'none' : 'block',
          }}
          onLoad={handleIframeLoad}
          onError={(e) => {
            console.error('❌ iframe 加载失败:', e);
            setLoading(false);
          }}
        />
      </div>
    </Card>
  );
};

export default MicroAppContainer;
