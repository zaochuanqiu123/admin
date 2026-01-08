import { history, useLocation } from '@umijs/max';
import { Card, message, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';

// 🔥 1. 定义 [ID -> 路由] 的映射表
// 这是核心配置：当子应用发来 ID 时，主应用查这张表决定去哪里
const ID_TO_PATH_MAP: Record<string, string> = {
  '163': '/dashboard/index', // 工作台
  //   '1457': '/shop/index',          // 门店
  //   '1459': '/goods/list',          // 商品
  //   '206':  '/storage/index',       // 进销存
  //   '1432': '/order/list',          // 订单
  //   '215':  '/member/index',        // 会员
  //   '1917': '/data/analysis',       // 数据
  //   '1464': '/finance/index',       // 财务
  //   '303':  '/settings/index',      // 设置
  '1495': '/admin', // 应用
};

/**
 * 微应用容器页面
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

  // 🔄 2. 监听 URL 变化，重载 iframe
  useEffect(() => {
    console.log('🔄 路由/参数变化，刷新 iframe:', location.search);
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  }, [location.pathname, location.search]);

  // 🔥🔥🔥 3. 核心新增：监听子应用发来的"ID跳转请求" 🔥🔥🔥
  useEffect(() => {
    const handleSubAppMessage = (event: MessageEvent) => {
      // 1. 获取最外层的 type 和 payload
      const { type, payload } = event.data || {};

      // 2. 校验消息类型
      if (type !== 'FROM_CHILD_APP') return;

      // 🔥🔥🔥 核心修正：从 payload 里面提取 targetId 🔥🔥🔥
      // 你的数据结构是 event.data.payload.targetId
      const targetId = payload?.targetId;

      console.log(`🚀 [主应用] 收到跳转请求, 原始ID: ${targetId}`);

      if (!targetId) {
        console.warn('⚠️ 收到消息但缺少 targetId');
        return;
      }

      // 3. 查表：根据 ID 找路径
      const targetPath = ID_TO_PATH_MAP[String(targetId)];

      if (targetPath) {
        console.log(`✅ 匹配成功: ${targetPath}, 正在跳转...`);

        // 4. 执行跳转
        history.push(`${targetPath}?targetId=${targetId}`);
      } else {
        console.error(
          `❌ 未找到 ID [${targetId}] 对应的路由，请检查 ID_TO_PATH_MAP 配置`,
        );
        message.error('未找到对应模块，请联系管理员');
      }
    };

    window.addEventListener('message', handleSubAppMessage);
    return () => window.removeEventListener('message', handleSubAppMessage);
  }, []);

  // ✅ 5. Iframe 加载完毕，发送初始化数据
  const handleIframeLoad = () => {
    console.log('✅ iframe 加载完成，开始解析参数...');
    setLoading(false);

    const query = new URLSearchParams(location.search);

    const initPayload = {
      msg: '页面加载完毕(自动触发)',
      // 把 URL 里的 targetId 发给子应用
      targetId: query.get('targetId'),
      path: location.pathname,
      timestamp: Date.now(),
      userData: {
        name: '测试用户',
        id: 12345,
        token: '12312312313-token',
      },
    };

    sendMessage('INIT_DATA', initPayload);
  };

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          height: 'calc(100vh - 55px)',
        }}
      >
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

        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={subAppUrl}
          title="micro-app"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
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
