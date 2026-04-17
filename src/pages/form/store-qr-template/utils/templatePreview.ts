import { Ecc, QrCode } from '@rc-component/qrcode/es/libs/qrcodegen';
import {
  QR_TEMPLATE_PREVIEW_SN,
  QR_TEMPLATE_PREVIEW_VALUE,
} from '../constants';
import type { EditorStateModel } from '../types';

export function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('load image failed'));
    image.src = url;
  });
}

export function canvasToFile(canvas: HTMLCanvasElement, fileName: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('canvas blob unavailable'));
        return;
      }
      resolve(new File([blob], fileName, { type: blob.type || 'image/png' }));
    }, 'image/png');
  });
}

function drawPreviewQrCode(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  const qrCode = QrCode.encodeText(QR_TEMPLATE_PREVIEW_VALUE, Ecc.MEDIUM);
  const modules = qrCode.getModules();
  const moduleCount = qrCode.size;
  const marginModules = 0;
  const totalModules = moduleCount + marginModules * 2;
  const moduleSize = size / totalModules;

  context.fillStyle = color;
  modules.forEach((row, rowIndex) => {
    row.forEach((enabled, columnIndex) => {
      if (!enabled) return;
      context.fillRect(
        x + (columnIndex + marginModules) * moduleSize,
        y + (rowIndex + marginModules) * moduleSize,
        Math.ceil(moduleSize),
        Math.ceil(moduleSize),
      );
    });
  });
}

export async function createTemplatePreviewFile(
  state: EditorStateModel,
  backgroundImage: string,
) {
  const image = await loadImage(backgroundImage);
  const canvas = document.createElement('canvas');
  canvas.width = state.canvasWidth;
  canvas.height = state.canvasHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas context unavailable');

  context.drawImage(image, 0, 0, state.canvasWidth, state.canvasHeight);

  const qrBox = state.qrcode;
  drawPreviewQrCode(context, qrBox.x, qrBox.y, qrBox.size, qrBox.color);

  if (state.showCodeText) {
    const codeTextTop = qrBox.y + qrBox.size + state.codeText.offsetY;
    const textHeight = Math.max(28, state.codeText.fontSize * 1.4 + 8);
    context.save();
    context.font = `600 ${state.codeText.fontSize}px sans-serif`;
    context.fillStyle = state.codeText.color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(255, 255, 255, 0.72)';
    context.shadowBlur = 1;
    context.shadowOffsetY = 1;
    context.fillText(
      QR_TEMPLATE_PREVIEW_SN,
      qrBox.x + qrBox.size / 2,
      codeTextTop + textHeight / 2,
      qrBox.size,
    );
    context.restore();
  }

  return canvasToFile(canvas, 'qr-template-preview.png');
}
