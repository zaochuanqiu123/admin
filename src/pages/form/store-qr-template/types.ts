import type { UploadProps } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { TablePaginationConfig } from 'antd/es/table';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { QrCodeTemplateRecord } from '@/api/qrCodeTemplate';

export type QueryFilters = {
  name: string;
  state?: string;
};

export type EditorSelection = 'qrcode' | 'codeText' | null;

export type EditorStateModel = {
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage: string | null;
  qrcode: {
    x: number;
    y: number;
    size: number;
    color: string;
  };
  codeText: {
    offsetY: number;
    fontSize: number;
    color: string;
  };
  showCodeText: boolean;
};

export type DragState = {
  type: 'qrcode' | 'qrcodeResize' | 'codeText';
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialSize?: number;
};

export type CropDraft = {
  sourceUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type CropDragState = {
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
};

export type QrTemplateListState = {
  loading: boolean;
  listInitialized: boolean;
  listError?: string;
  records: QrCodeTemplateRecord[];
  filteredRecords: QrCodeTemplateRecord[];
  filteredTotal: number;
  initialListLoading: boolean;
  refreshingList: boolean;
  draftFilters: QueryFilters;
  pagination: TablePaginationConfig;
};

export type QrTemplateListActions = {
  setDraftFilters: Dispatch<SetStateAction<QueryFilters>>;
  handleSearch: () => void;
  handleReset: () => void;
  handlePageChange: (current: number, pageSize: number) => void;
  refreshFirstPage: () => void;
  handleDeleteTemplate: (id: string) => Promise<void>;
};

export type QrCanvasControls = {
  activeSelection: EditorSelection;
  codeTextTop: number;
  qrcodeNodeRef: RefObject<HTMLDivElement | null>;
  codeTextNodeRef: RefObject<HTMLDivElement | null>;
  resetCanvasInteraction: () => void;
  clearSelection: () => void;
  handleCanvasWidthChange: (value: number | null) => void;
  handleCanvasHeightChange: (value: number | null) => void;
  handleShowCodeTextChange: (checked: boolean) => void;
  handleCodeTextFontSizeChange: (value: number | null) => void;
  handleCodeTextColorChange: (color: string) => void;
  handleQrcodeXChange: (value: number | null) => void;
  handleQrcodeYChange: (value: number | null) => void;
  handleQrcodeColorChange: (color: string) => void;
  handleQrcodeMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
  handleQrcodeResizeMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
  handleCodeTextMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
};

export type QrBackgroundAsset = {
  cropModalOpen: boolean;
  cropDraft: CropDraft | null;
  cropLoading: boolean;
  cropPreviewWidth: number;
  cropPreviewHeight: number;
  cropImageWidth: number;
  cropImageHeight: number;
  cropImageOffsetX: number;
  cropImageOffsetY: number;
  backgroundUploadProps: UploadProps;
  clearBackgroundPreview: () => void;
  resetBackgroundAsset: () => void;
  setExistingBackgroundAsset: (attachmentId: string, url: string) => void;
  ensureBackgroundAttachmentId: () => Promise<string>;
  handleCropConfirm: () => Promise<void>;
  closeCropModal: () => void;
  startCropDrag: (event: React.MouseEvent<HTMLElement>) => void;
  updateCropZoom: (value: number) => void;
  handleCropWheel: (event: React.WheelEvent<HTMLElement>) => void;
};

export type QrTemplateEditor = {
  drawerOpen: boolean;
  editingTemplateId: string | null;
  drawerForm: FormInstance;
  openCreateDrawer: () => void;
  openEditDrawer: (id: string) => Promise<void>;
  closeDrawer: () => void;
  handleDrawerSubmit: () => Promise<void>;
};
