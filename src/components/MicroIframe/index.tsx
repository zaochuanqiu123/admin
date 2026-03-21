import { history, useLocation, useModel } from '@umijs/max';
import { Card, message, Spin, theme } from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getToken } from '@/api/storage';
import { findPathByTargetId } from '@/utils/menu';

export type MicroIframeMessage = {
  type: string;
  payload?: any;
};

export type MicroIframeProps = {
  baseUrl: string;
  idParamKey?: string;
  heightMessageType?: string;
  navigateMessageType?: string;
  requestHeightType?: string;
  initType?: string;
  heightPayloadKey?: string;
  minHeight?: number;
  heightOffset?: number;
  withCard?: boolean;
  loadingText?: string;
  buildInitPayload?: (ctx: {
    id: string | null;
    pathname: string;
    search: string;
  }) => Record<string, any>;
};

const MicroIframe: React.FC<MicroIframeProps> = ({
  baseUrl,
  idParamKey = 'targetId',
  heightMessageType = 'IFRAME_HEIGHT',
  navigateMessageType = 'FROM_CHILD_APP',
  heightPayloadKey = 'scrollHeight',
  minHeight = 300,
  heightOffset = 20,
  withCard = false,
  loadingText = '系统加载中...',
}) => {
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const { token } = theme.useToken();
  const loadingMaskBg = token.colorBgLayout;
  const loadingTextColor = token.colorTextSecondary;
  const [loading, setLoading] = useState(true);
  const [_iframeHeight, setIframeHeight] = useState<number>(
    Math.max(window.innerHeight, minHeight),
  );

  const locationRef = useRef(location);
  locationRef.current = location;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const resolvedTargetId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    const targetIdFromQuery = query.get(idParamKey);
    if (targetIdFromQuery) return targetIdFromQuery;
    return undefined;
  }, [idParamKey, location.search]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const targetIdFromQuery = query.get(idParamKey);
    const tokenFromQuery = query.get('token');
    const token = tokenFromQuery || getToken();
    let changed = false;

    if (!targetIdFromQuery && resolvedTargetId) {
      query.set(idParamKey, resolvedTargetId);
      changed = true;
    }

    if (!tokenFromQuery && token) {
      query.set('token', token);
      changed = true;
    }

    if (changed) {
      history.replace({
        pathname: location.pathname,
        search: query.toString(),
      });
    }
  }, [idParamKey, location.pathname, location.search, resolvedTargetId]);

  const subAppUrl = useMemo(() => {
    const query = new URLSearchParams(location.search);
    const targetId = query.get(idParamKey) || resolvedTargetId;

    const tokenFromQuery = query.get('token');
    const token = tokenFromQuery || getToken();

    const params = new URLSearchParams();
    if (targetId) {
      params.set('targetId', targetId);
    }
    if (token) {
      params.set('token', token);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [baseUrl, idParamKey, location.search, resolvedTargetId]);

  useEffect(() => {
    setLoading(true);
  }, [subAppUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;

      const { type, payload } = (event.data || {}) as MicroIframeMessage;

      if (type === navigateMessageType) {
        const targetId = payload?.targetId ?? payload?.id;
        if (!targetId) return;

        const targetPath = findPathByTargetId(
          initialState?.permContextMenu,
          String(targetId),
        );
        if (!targetPath) {
          message.error('未找到对应菜单路径');
          return;
        }

        const current = locationRef.current;
        const nextQuery = new URLSearchParams();
        nextQuery.set(idParamKey, String(targetId));

        const tokenInUrl = new URLSearchParams(current.search).get('token');
        const token = tokenInUrl || getToken();
        if (token) {
          nextQuery.set('token', token);
        }

        const nextUrl = `${targetPath}?${nextQuery.toString()}`;
        if (
          current.pathname !== targetPath ||
          !String(current.search || '').includes(`${idParamKey}=${targetId}`)
        ) {
          history.push(nextUrl);
        }
        return;
      }

      if (type === heightMessageType) {
        const raw =
          payload?.[heightPayloadKey] ??
          payload?.height ??
          payload?.scrollHeight;
        const height = Number(raw);
        if (!Number.isFinite(height) || height <= 0) return;
        setIframeHeight(Math.max(height + heightOffset, minHeight));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    heightMessageType,
    heightOffset,
    heightPayloadKey,
    idParamKey,
    initialState?.permContextMenu,
    minHeight,
    navigateMessageType,
  ]);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const content = (
    <div
      style={{
        position: 'relative',
        overflow: 'auto',
        height: 'calc(100vh - 44px)',
        borderRadius: 16,
        background: loadingMaskBg,
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
            background: loadingMaskBg,
            zIndex: 10,
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: 10, color: loadingTextColor }}>
            {loadingText}
          </div>
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
          background: loadingMaskBg,
        }}
        onLoad={handleIframeLoad}
        onError={(e) => {
          console.error('iframe load failed:', e);
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
