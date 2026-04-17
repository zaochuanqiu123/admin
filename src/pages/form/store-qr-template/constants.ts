import type { EditorStateModel } from './types';

export const QR_TEMPLATE_PERMS = {
  add: 'admin:device:qrcodeTemplate:add',
  update: 'admin:device:qrcodeTemplate:update',
  delete: 'admin:device:qrcodeTemplate:delete',
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_CANVAS_WIDTH = 500;
export const MAX_CANVAS_HEIGHT = 600;
export const CROP_PREVIEW_WIDTH = 420;
export const CROP_ZOOM_MIN = 1;
export const CROP_ZOOM_MAX = 3;
export const CROP_ZOOM_STEP = 0.05;
export const QR_TEMPLATE_PREVIEW_VALUE =
  'https://demo.suifida.local/pay/template-preview';
export const QR_TEMPLATE_PREVIEW_SN = 'NO. 20260320';

export const DEFAULT_EDITOR_STATE: EditorStateModel = {
  canvasWidth: 320,
  canvasHeight: 420,
  backgroundImage: null,
  qrcode: {
    x: 88,
    y: 112,
    size: 144,
    color: '#000000',
  },
  codeText: {
    offsetY: 14,
    fontSize: 16,
    color: '#1f2837',
  },
  showCodeText: true,
};
