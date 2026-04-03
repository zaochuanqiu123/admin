import { Button, Modal, message, QRCode } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCodeLinkNew } from '@/api/cashier';
import { getErrorMessage } from '@/utils/apiMessage';

export type StoreQrCodeModalPayload = {
  scene: 'store' | 'merchant';
  storeName: string;
  storeCode: string;
  sid: string;
  mid: string;
};

type StoreQrCodeModalProps = {
  open: boolean;
  payload: StoreQrCodeModalPayload | null;
  onCancel: () => void;
};

const SCENE_CONFIG = {
  store: {
    title: '门店二维码',
    field: 'sid',
    downloadName: '门店二维码',
  },
  merchant: {
    title: '商户二维码',
    field: 'mid',
    downloadName: '商户二维码',
  },
} as const;

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').trim();
}

const StoreQrCodeModal: React.FC<StoreQrCodeModalProps> = ({
  open,
  payload,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [codeLink, setCodeLink] = useState('');
  const [loadError, setLoadError] = useState('');
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  const sceneConfig = useMemo(() => {
    if (!payload) return SCENE_CONFIG.store;
    return SCENE_CONFIG[payload.scene];
  }, [payload]);

  const currentFieldValue = useMemo(() => {
    if (!payload) return '';
    return payload.scene === 'store' ? payload.sid : payload.mid;
  }, [payload]);

  useEffect(() => {
    if (!open || !payload) {
      setLoading(false);
      setCodeLink('');
      setLoadError('');
      return;
    }

    const requestValue =
      payload.scene === 'store' ? { sid: payload.sid } : { mid: payload.mid };

    let cancelled = false;
    setLoading(true);
    setCodeLink('');
    setLoadError('');

    void getCodeLinkNew(requestValue)
      .then((link) => {
        if (cancelled) return;
        setCodeLink(link);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(getErrorMessage(error, '获取二维码失败'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentFieldValue, open, payload, sceneConfig.field]);

  const handleDownload = () => {
    const canvas = qrContainerRef.current?.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      message.error('二维码尚未生成，暂时无法下载');
      return;
    }

    try {
      const anchor = document.createElement('a');
      const baseName = sanitizeFileName(
        payload?.storeName || payload?.storeCode || '二维码',
      );
      anchor.href = canvas.toDataURL('image/png');
      anchor.download = `${baseName}-${sceneConfig.downloadName}.png`;
      anchor.click();
    } catch (error) {
      message.error(getErrorMessage(error, '下载二维码失败'));
    }
  };

  return (
    <Modal
      open={open}
      title={sceneConfig.title}
      footer={null}
      width={440}
      centered
      onCancel={onCancel}
      className="store-code-modal"
    >
      {payload ? (
        <div className="store-code-modal-body u-flex-col u-items-center">
          <div className="store-code-card">
            <div className="store-code-qr-shell" ref={qrContainerRef}>
              {loading ? (
                <QRCode
                  value={`loading-${sceneConfig.field}`}
                  status="loading"
                  type="canvas"
                  size={220}
                  bordered={false}
                />
              ) : codeLink ? (
                <QRCode
                  value={codeLink}
                  type="canvas"
                  size={220}
                  bordered={false}
                />
              ) : (
                <div className="store-code-empty">
                  {loadError || '暂无二维码'}
                </div>
              )}
            </div>
          </div>
          <div className="store-code-name">{payload.storeName}</div>
          <div className="store-code-meta">
            <div>门店编号：{payload.storeCode || '-'}</div>
            <div>
              {sceneConfig.field}：{currentFieldValue || '-'}
            </div>
          </div>
          {loadError && !loading ? (
            <div className="store-code-error">{loadError}</div>
          ) : null}
          <Button
            type="primary"
            className="store-code-download-btn"
            loading={loading}
            disabled={!codeLink}
            onClick={handleDownload}
          >
            下载二维码
          </Button>
        </div>
      ) : null}
    </Modal>
  );
};

export default StoreQrCodeModal;
