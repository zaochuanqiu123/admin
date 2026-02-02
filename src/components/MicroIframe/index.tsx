import { history, useLocation } from '@umijs/max';
import { Card, message, Spin } from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type MicroIframeMessage = {
  type: string;
  payload?: any;
};

export type MicroIframeProps = {
  /** 子应用页面地址（不含 query），例如 /api-old-app/Retail/Menu/index.html */
  baseUrl: string;
  /** 默认 query 参数（建议不要在这里放敏感信息） */
  defaultParams?: Record<string, string>;
  /** URL 上接收的参数名（默认 targetId） */
  idParamKey?: string;
  /** 当 URL 参数不存在时，通过 pathname 反查 ID（用于刷新页面/直接访问场景） */
  pathToIdMap?: Record<string, string>;
  /** 子应用请求跳转时：ID -> 主应用路由（可选，不需要可不传） */
  idToPathMap?: Record<string, string>;
  /** 子应用高度上报消息 type（默认 IFRAME_HEIGHT） */
  heightMessageType?: string;
  /** 子应用跳转消息 type（默认 FROM_CHILD_APP） */
  navigateMessageType?: string;
  /** 主应用请求高度的消息 type（默认 REQUEST_HEIGHT） */
  requestHeightType?: string;
  /** 主应用初始化消息 type（默认 INIT_DATA） */
  initType?: string;
  /** 高度 payload 的字段名（默认 scrollHeight），也兼容 height */
  heightPayloadKey?: string;
  /** 高度最小值 */
  minHeight?: number;
  /** 高度额外补偿（比如加 20 避免底部被遮挡） */
  heightOffset?: number;
  /** 是否显示 Card 包裹 */
  withCard?: boolean;
  /** loading 提示文案 */
  loadingText?: string;
  /** 子应用初始化 payload 额外字段 */
  buildInitPayload?: (ctx: {
    id: string | null;
    pathname: string;
    search: string;
  }) => Record<string, any>;
};

const MicroIframe: React.FC<MicroIframeProps> = ({
  baseUrl,
  defaultParams,
  idParamKey = 'targetId',
  pathToIdMap,
  idToPathMap,
  heightMessageType = 'IFRAME_HEIGHT',
  navigateMessageType = 'FROM_CHILD_APP',
  heightPayloadKey = 'scrollHeight',
  minHeight = 300,
  heightOffset = 20,
  withCard = true,
  loadingText = '系统加载中...',
}) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [_iframeHeight, setIframeHeight] = useState<number>(
    Math.max(window.innerHeight, minHeight),
  );

  // 解决闭包：让 message handler 总能拿到最新 location
  const locationRef = useRef(location);
  locationRef.current = location;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 动态计算子应用 URL：从 URL 参数中提取 targetId，拼接到 iframe 的 src 上
  const subAppUrl = useMemo(() => {
    const query = new URLSearchParams(location.search);

    // 1) 优先从 URL 参数中获取 targetId
    let targetId = query.get(idParamKey);

    // 2) 如果 URL 没有 targetId，且提供了 pathToIdMap，则通过 pathname 反查
    if (!targetId && pathToIdMap) {
      targetId = pathToIdMap[location.pathname];
    }

    // 3) 复制默认参数
    const params = new URLSearchParams(defaultParams || {});

    // 4) 如果拿到了 targetId，就拼接到 iframe 的 src 上（参数名用 id，因为子应用读取的是 id）
    if (targetId) {
      params.set('targetId', targetId); // 子应用读取的是 id，不是 targetId
    }
    // 5) 生成最终 URL
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [
    baseUrl,
    defaultParams,
    idParamKey,
    location.pathname,
    location.search,
    pathToIdMap,
  ]);

  // URL 变化 / 子应用 URL 变化：显示 loading（iframe 会因 key 变化被重建）
  useEffect(() => {
    setLoading(true);
  }, [subAppUrl]);

  // 监听来自子应用的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;

      const { type, payload } = (event.data || {}) as MicroIframeMessage;

      // A) 子应用请求主应用跳转
      if (type === 'FROM_CHILD_APP') {
        const targetId = payload?.targetId;
        if (!targetId) return;

        const targetPath = idToPathMap?.[String(targetId)];
        if (!targetPath) {
          message.error('未找到对应模块');
          return;
        }

        const current = locationRef.current;
        const nextUrl = `${targetPath}?${idParamKey}=${targetId}`;

        if (
          current.pathname !== targetPath ||
          !String(current.search || '').includes(`${idParamKey}=${targetId}`)
        ) {
          history.push(nextUrl);
        }
        return;
      }

      // B) 子应用上报高度
      if (type === heightMessageType) {
        const raw =
          payload?.[heightPayloadKey] ??
          payload?.height ??
          payload?.scrollHeight;
        const height = Number(raw);
        if (!Number.isFinite(height) || height <= 0) return;
        setIframeHeight(Math.max(height + heightOffset, minHeight));
        return;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    heightMessageType,
    heightOffset,
    heightPayloadKey,
    idParamKey,
    idToPathMap,
    minHeight,
    navigateMessageType,
  ]);

  // iframe load：关闭 loading
  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const content = (
    <div
      style={{
        position: 'relative',
        overflow: 'auto',
        height: 'calc(100vh - 88px)',
        margin: 16,
        borderRadius: 16,
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#E7EDFB',
            zIndex: 10,
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: 10, color: '#1890ff' }}>{loadingText}</div>
        </div>
      )}

      <iframe
        key={subAppUrl}
        ref={iframeRef}
        src={subAppUrl}
        title="micro-app"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          visibility: loading ? 'hidden' : 'visible',
        }}
        onLoad={handleIframeLoad}
        onError={(e) => {
          console.error('❌ iframe 加载失败:', e);
          setLoading(false);
        }}
      />
    </div>
  );

  return withCard ? (
    <Card styles={{ body: { padding: 0 } }}>{content}</Card>
  ) : (
    content
  );
};

export default MicroIframe;
