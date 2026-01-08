import { useLocation } from '@umijs/max';
import { Card, message, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';

/**
 * 微应用容器页面
 * 🔥 纯 URL 驱动模式：进入页面/切换菜单 -> iframe重载 -> onLoad 自动发消息
 */
const MicroAppContainer: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 子应用基础地址
  const subAppUrl =
    '/api-old-app/Retail/Menu/index.html?Token=1&username=16601725678&password=asd789&id=3';

  // 📦 1. 封装通用的发送函数
  const sendMessage = (type: string, payload: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      console.log(`📡 [主应用 -> 子应用] ${type}:`, payload);
      iframeRef.current.contentWindow.postMessage({ type, payload }, '*');
    }
  };

  // 🔄 2. 监听 URL 变化
  // 只要 URL 变了（比如菜单点了不同的项，参数变了），就强制销毁并重建 iframe
  useEffect(() => {
    console.log('🔄 路由/参数变化，刷新 iframe:', location.search);
    setLoading(true);
    setIframeKey((prev) => prev + 1); // 👈 这一步会让 iframe 重新加载，从而触发 onLoad
  }, [location.pathname, location.search]); // 监听 search，参数变了也刷新

  // ✅ 3. 核心：Iframe 加载完毕，直接把 URL 里的参数发过去
  const handleIframeLoad = () => {
    console.log('✅ iframe 加载完成，开始解析参数...');
    setLoading(false);

    // 1. 解析当前浏览器地址栏里的参数
    const query = new URLSearchParams(location.search);

    // 2. 组装数据 (模拟广播的数据结构)
    const initPayload = {
      msg: '页面加载完毕(自动触发)',

      // 🔥 核心：直接把 URL 里的 targetId 拿出来发给子应用
      // 这样子应用一启动就能拿到 ID，不需要再点一次
      targetId: query.get('targetId'),
      // 其他辅助信息
      path: location.pathname,
      timestamp: Date.now(),
      userData: {
        name: '测试用户',
        id: 12345,
        token: '12312312313-token',
      },
    };

    // 3. 发送！
    // 这里的 type 既可以是 INIT_DATA，也可以直接伪装成 HEADER_CLICK
    // 看你子应用里监听的是哪个，这里统一发过去
    sendMessage('INIT_DATA', initPayload);

    // 如果子应用只监听 HEADER_CLICK，你也可以多发一条：
    // sendMessage('HEADER_CLICK', initPayload);
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
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#fff',
              zIndex: 10,
            }}
          >
            <Spin size="large" />
            <div style={{ marginTop: 10, color: '#1890ff' }}>系统加载中...</div>
          </div>
        )}

        {/* 🔥 使用 iframe 加载子应用 */}
        <iframe
          key={iframeKey} // 利用 key 强制刷新
          ref={iframeRef}
          src={subAppUrl}
          title="micro-app"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            // 🔥 必须用 visibility，否则 contentWindow 为空，无法发送 onLoad 消息
            visibility: loading ? 'hidden' : 'visible',
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
