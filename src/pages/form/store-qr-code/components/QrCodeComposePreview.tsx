import { Ecc, QrCode } from '@rc-component/qrcode/es/libs/qrcodegen';
import { Empty, Spin } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { QrCodeRecord } from '@/api/qrCode';
import { getQrCodeTemplateDetail } from '@/api/qrCodeTemplate';

type QrCodeComposePreviewProps = {
  record?: QrCodeRecord;
  mode?: 'raw' | 'compose';
  className?: string;
  emptyText?: string;
};

type ComposeTemplateState = {
  backgroundUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  qrcodeBox: {
    x: number;
    y: number;
    size: number;
    color: string;
  };
  snConfig: {
    isShow: boolean;
    x: number;
    y: number;
    size: number;
    color: string;
  };
};

function readText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function readNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function readConfig(value: unknown): Record<string, any> {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, any>;
  }
  if (typeof value !== 'string') return {};

  const text = value.trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, any>)
      : {};
  } catch {
    return {};
  }
}

function getQrContent(record?: QrCodeRecord) {
  return readText(
    record?.qrcodeContent,
    record?.qrCodeContent,
    record?.qrcodeUrl,
    record?.qrCodeUrl,
  );
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('load image failed'));
    image.src = url;
  });
}

function getTemplateBackgroundUrl(template: Record<string, any>) {
  const bgConfig = readConfig(template?.bgConfig);
  return readText(
    bgConfig?.imageUrl,
    bgConfig?.url,
    bgConfig?.imageAttachmentUrl,
    bgConfig?.imageAttachment?.url,
    bgConfig?.attachment?.url,
    template?.bgImageUrl,
    template?.backgroundImageUrl,
    template?.prevImageUrl,
    template?.prevImage,
  );
}

function drawRealQrCode(
  context: CanvasRenderingContext2D,
  content: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  const qrCode = QrCode.encodeText(content, Ecc.MEDIUM);
  const modules = qrCode.getModules();
  const moduleCount = qrCode.size;
  const moduleSize = size / moduleCount;

  context.save();
  context.fillStyle = color || '#000000';
  modules.forEach((row, rowIndex) => {
    row.forEach((enabled, columnIndex) => {
      if (!enabled) return;
      context.fillRect(
        x + columnIndex * moduleSize,
        y + rowIndex * moduleSize,
        Math.ceil(moduleSize),
        Math.ceil(moduleSize),
      );
    });
  });
  context.restore();
}

async function createQrImage(content: string, size: number, color = '#000000') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas context unavailable');
  drawRealQrCode(context, content, 0, 0, size, color);
  return canvas.toDataURL('image/png');
}

async function createRawQrPreview(content: string) {
  return createQrImage(content, 240);
}

async function buildComposeTemplateState(template: Record<string, any>) {
  const bgConfig = readConfig(template?.bgConfig);
  const qrConfig = readConfig(template?.qrcodeImageConfig);
  const snConfig = readConfig(template?.qrcodeSnConfig);
  const backgroundUrl = getTemplateBackgroundUrl(template);
  const backgroundImage = backgroundUrl ? await loadImage(backgroundUrl) : null;
  const qrcodeSize = readNumber(qrConfig?.w || qrConfig?.size, 144);
  const qrcodeBox = {
    x: readNumber(qrConfig?.x, 0),
    y: readNumber(qrConfig?.y, 0),
    size: qrcodeSize,
    color: readText(qrConfig?.color) || '#000000',
  };
  const snFontSize = readNumber(snConfig?.size, 16);
  const snX = readNumber(snConfig?.x, qrcodeBox.x + qrcodeBox.size / 2);
  const snOffsetY = readNumber(snConfig?.y, Math.max(14, snFontSize));
  const snTextHeight = Math.max(28, snFontSize * 1.4 + 8);
  const snY = qrcodeBox.y + qrcodeBox.size + snOffsetY + snTextHeight / 2;
  const snBottom = snY + snTextHeight / 2;

  return {
    backgroundUrl,
    canvasWidth: Math.max(
      readNumber(bgConfig?.w, backgroundImage?.naturalWidth || 320),
      backgroundImage?.naturalWidth || 0,
      qrcodeBox.x + qrcodeBox.size,
    ),
    canvasHeight: Math.max(
      readNumber(bgConfig?.h, backgroundImage?.naturalHeight || 420),
      backgroundImage?.naturalHeight || 0,
      snBottom,
    ),
    qrcodeBox,
    snConfig: {
      isShow: Number(snConfig?.isShow) === 1,
      x: snX,
      y: snY,
      size: snFontSize,
      color: readText(snConfig?.color) || '#1f2837',
    },
  };
}

function ComposePreviewView({
  className,
  qrImageUrl,
  record,
  templateState,
}: {
  className?: string;
  qrImageUrl: string;
  record: QrCodeRecord;
  templateState: ComposeTemplateState;
}) {
  const { canvasWidth, canvasHeight, qrcodeBox, snConfig } = templateState;
  const sn = readText(record?.sn);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      role="img"
      aria-label="二维码模板合成预览"
      style={{
        display: 'block',
      }}
    >
      {templateState.backgroundUrl ? (
        <image
          href={templateState.backgroundUrl}
          x="0"
          y="0"
          width={canvasWidth}
          height={canvasHeight}
          preserveAspectRatio="none"
        />
      ) : null}
      <image
        href={qrImageUrl}
        x={qrcodeBox.x}
        y={qrcodeBox.y}
        width={qrcodeBox.size}
        height={qrcodeBox.size}
        preserveAspectRatio="none"
      />
      {snConfig.isShow && sn ? (
        <text
          x={snConfig.x}
          y={snConfig.y}
          fill={snConfig.color}
          fontSize={snConfig.size}
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {sn}
        </text>
      ) : null}
    </svg>
  );
}

async function createComposePreviewState(
  template: Record<string, any>,
  content: string,
) {
  const templateState = await buildComposeTemplateState(template);
  const qrImageUrl = await createQrImage(
    content,
    templateState.qrcodeBox.size,
    templateState.qrcodeBox.color,
  );
  return { templateState, qrImageUrl };
}

export function getQrCodeContent(record?: QrCodeRecord) {
  return getQrContent(record);
}

export const QrCodeComposePreview: React.FC<QrCodeComposePreviewProps> = ({
  record,
  mode = 'compose',
  className,
  emptyText = '暂无二维码内容',
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [composeState, setComposeState] = useState<{
    templateState: ComposeTemplateState;
    qrImageUrl: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const qrContent = useMemo(() => getQrContent(record), [record]);
  const templateId = readText(
    record?.qrcodeTemplateId,
    record?.qrcodeTemplate?.id,
  );

  useEffect(() => {
    let disposed = false;

    const createPreview = async () => {
      setImageUrl('');
      setComposeState(undefined);
      setError('');
      if (!qrContent || !record) return;

      setLoading(true);
      try {
        const template =
          mode === 'compose' && templateId
            ? await getQrCodeTemplateDetail(templateId, {
                skipErrorHandler: true,
              })
            : record.qrcodeTemplate || {};
        if (mode === 'raw') {
          const nextImageUrl = await createRawQrPreview(qrContent);
          if (!disposed) {
            setImageUrl(nextImageUrl);
          }
        } else {
          const nextComposeState = await createComposePreviewState(
            template || {},
            qrContent,
          );
          if (!disposed) {
            setComposeState(nextComposeState);
          }
        }
      } catch (previewError) {
        console.error('create qr code preview failed:', previewError);
        if (!disposed) {
          setError('预览生成失败');
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void createPreview();

    return () => {
      disposed = true;
    };
  }, [mode, qrContent, record, templateId]);

  if (!qrContent) {
    return (
      <div className={className}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={className}>
        <Spin />
      </div>
    );
  }

  if (
    error ||
    (mode === 'raw' && !imageUrl) ||
    (mode === 'compose' && !composeState)
  ) {
    return (
      <div className={className}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={error || emptyText}
        />
      </div>
    );
  }

  if (mode === 'compose' && composeState && record) {
    return (
      <ComposePreviewView
        className={className}
        record={record}
        qrImageUrl={composeState.qrImageUrl}
        templateState={composeState.templateState}
      />
    );
  }

  return <img className={className} src={imageUrl} alt="二维码预览" />;
};
