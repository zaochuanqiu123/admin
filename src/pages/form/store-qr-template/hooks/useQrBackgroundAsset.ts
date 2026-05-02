import type { UploadProps } from 'antd';
import { message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadImageAttachment } from '@/pages/form/shared/upload';
import {
  CROP_PREVIEW_WIDTH,
  CROP_ZOOM_MAX,
  CROP_ZOOM_MIN,
  CROP_ZOOM_STEP,
} from '../constants';
import type { CropDraft, CropDragState, EditorStateModel } from '../types';
import { clamp } from '../utils/geometry';
import { revokeObjectUrl } from '../utils/objectUrl';
import { canvasToFile, loadImage } from '../utils/templatePreview';

type UseQrBackgroundAssetOptions = {
  editorState: EditorStateModel;
  setEditorState: React.Dispatch<React.SetStateAction<EditorStateModel>>;
};

function getAttachmentId(
  attachment: Awaited<ReturnType<typeof uploadImageAttachment>>,
) {
  return String(attachment?.id || '').trim();
}

function getAttachmentUrl(
  attachment: Awaited<ReturnType<typeof uploadImageAttachment>>,
) {
  return String(attachment?.url || '').trim();
}

function getCropPreviewHeight(state: EditorStateModel) {
  return Math.round(
    CROP_PREVIEW_WIDTH * (state.canvasHeight / state.canvasWidth),
  );
}

function getCropImageMetrics(
  draft: Pick<CropDraft, 'naturalWidth' | 'naturalHeight' | 'zoom'>,
  previewWidth: number,
  previewHeight: number,
) {
  const baseScale = Math.min(
    previewWidth / draft.naturalWidth,
    previewHeight / draft.naturalHeight,
  );
  const totalScale = baseScale * draft.zoom;
  return {
    imageWidth: draft.naturalWidth * totalScale,
    imageHeight: draft.naturalHeight * totalScale,
  };
}

function clampCropOffset(
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number,
  previewWidth: number,
  previewHeight: number,
) {
  const maxOffsetX = Math.max(0, (imageWidth - previewWidth) / 2);
  const maxOffsetY = Math.max(0, (imageHeight - previewHeight) / 2);

  return {
    offsetX: clamp(offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(offsetY, -maxOffsetY, maxOffsetY),
  };
}

function clampCropDraft(
  draft: CropDraft,
  previewWidth: number,
  previewHeight: number,
): CropDraft {
  const zoom = clamp(draft.zoom, CROP_ZOOM_MIN, CROP_ZOOM_MAX);
  const metrics = getCropImageMetrics(
    {
      naturalWidth: draft.naturalWidth,
      naturalHeight: draft.naturalHeight,
      zoom,
    },
    previewWidth,
    previewHeight,
  );

  return {
    ...draft,
    zoom,
    ...clampCropOffset(
      draft.offsetX,
      draft.offsetY,
      metrics.imageWidth,
      metrics.imageHeight,
      previewWidth,
      previewHeight,
    ),
  };
}

export function useQrBackgroundAsset({
  editorState,
  setEditorState,
}: UseQrBackgroundAssetOptions) {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropDragState, setCropDragState] = useState<CropDragState | null>(
    null,
  );
  const backgroundObjectUrlRef = useRef<string | null>(null);
  const backgroundSourceObjectUrlRef = useRef<string | null>(null);
  const backgroundFileRef = useRef<File | null>(null);
  const backgroundUploadedAttachmentIdRef = useRef<string | null>(null);
  const backgroundUploadedUrlRef = useRef<string | null>(null);
  const cropPreviewWidth = CROP_PREVIEW_WIDTH;
  const cropPreviewHeight = getCropPreviewHeight(editorState);

  const releaseBackgroundResources = useCallback(() => {
    revokeObjectUrl(backgroundObjectUrlRef.current);
    backgroundObjectUrlRef.current = null;
    revokeObjectUrl(backgroundSourceObjectUrlRef.current);
    backgroundSourceObjectUrlRef.current = null;
    backgroundFileRef.current = null;
    backgroundUploadedAttachmentIdRef.current = null;
    backgroundUploadedUrlRef.current = null;
  }, []);

  const clearBackgroundPreview = useCallback(() => {
    releaseBackgroundResources();
    setEditorState((prev) => ({
      ...prev,
      backgroundImage: null,
    }));
    setCropDraft(null);
  }, [releaseBackgroundResources, setEditorState]);

  const resetBackgroundAsset = useCallback(() => {
    releaseBackgroundResources();
    setCropDraft(null);
    setCropModalOpen(false);
    setCropDragState(null);
  }, [releaseBackgroundResources]);

  const setExistingBackgroundAsset = useCallback(
    (attachmentId: string, url: string) => {
      releaseBackgroundResources();
      backgroundUploadedAttachmentIdRef.current = attachmentId || null;
      backgroundUploadedUrlRef.current = url || null;
    },
    [releaseBackgroundResources],
  );

  useEffect(() => {
    return () => {
      revokeObjectUrl(backgroundObjectUrlRef.current);
      revokeObjectUrl(backgroundSourceObjectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!cropDragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      setCropDraft((prev) => {
        if (!prev) return prev;
        return clampCropDraft(
          {
            ...prev,
            offsetX:
              cropDragState.initialX + (event.clientX - cropDragState.startX),
            offsetY:
              cropDragState.initialY + (event.clientY - cropDragState.startY),
          },
          cropPreviewWidth,
          cropPreviewHeight,
        );
      });
    };

    const handleMouseUp = () => {
      setCropDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [cropDragState, cropPreviewHeight, cropPreviewWidth]);

  useEffect(() => {
    setCropDraft((prev) =>
      prev ? clampCropDraft(prev, cropPreviewWidth, cropPreviewHeight) : prev,
    );
  }, [cropPreviewHeight, cropPreviewWidth]);

  const backgroundUploadProps: UploadProps = {
    accept: 'image/png, image/jpeg, image/jpg',
    showUploadList: false,
    beforeUpload: async (file) => {
      revokeObjectUrl(backgroundSourceObjectUrlRef.current);

      const sourceUrl = URL.createObjectURL(file);
      backgroundSourceObjectUrlRef.current = sourceUrl;

      try {
        const image = await loadImage(sourceUrl);
        setCropDraft(
          clampCropDraft(
            {
              sourceUrl,
              naturalWidth: image.naturalWidth,
              naturalHeight: image.naturalHeight,
              zoom: 1,
              offsetX: 0,
              offsetY: 0,
            },
            cropPreviewWidth,
            cropPreviewHeight,
          ),
        );
        setCropDragState(null);
        setCropModalOpen(true);
      } catch (error) {
        console.error('load background image failed:', error);
        message.error('图片读取失败，请重试');
        revokeObjectUrl(sourceUrl);
        backgroundSourceObjectUrlRef.current = null;
      }

      return false;
    },
  };

  const handleCropConfirm = async () => {
    if (!cropDraft) return;

    setCropLoading(true);
    try {
      const image = await loadImage(cropDraft.sourceUrl);
      const clampedDraft = clampCropDraft(
        cropDraft,
        cropPreviewWidth,
        cropPreviewHeight,
      );
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = editorState.canvasWidth;
      exportCanvas.height = editorState.canvasHeight;
      const context = exportCanvas.getContext('2d');
      if (!context) throw new Error('canvas context unavailable');

      const metrics = getCropImageMetrics(
        clampedDraft,
        cropPreviewWidth,
        cropPreviewHeight,
      );
      const previewLeft =
        (cropPreviewWidth - metrics.imageWidth) / 2 + clampedDraft.offsetX;
      const previewTop =
        (cropPreviewHeight - metrics.imageHeight) / 2 + clampedDraft.offsetY;
      const ratioX = editorState.canvasWidth / cropPreviewWidth;
      const ratioY = editorState.canvasHeight / cropPreviewHeight;

      context.drawImage(
        image,
        previewLeft * ratioX,
        previewTop * ratioY,
        metrics.imageWidth * ratioX,
        metrics.imageHeight * ratioY,
      );

      const backgroundFile = await canvasToFile(
        exportCanvas,
        'qr-template-bg.png',
      );
      const previewUrl = URL.createObjectURL(backgroundFile);
      const backgroundImageAttachment = await uploadImageAttachment(
        backgroundFile,
        'qr-template-bg.png',
      );
      const backgroundImageAttachmentId = getAttachmentId(
        backgroundImageAttachment,
      );
      const backgroundImageUrl = getAttachmentUrl(backgroundImageAttachment);
      if (!backgroundImageAttachmentId) {
        throw new Error('上传接口未返回背景图附件 ID');
      }
      revokeObjectUrl(backgroundObjectUrlRef.current);
      backgroundObjectUrlRef.current = previewUrl;
      backgroundFileRef.current = backgroundFile;
      backgroundUploadedAttachmentIdRef.current = backgroundImageAttachmentId;
      backgroundUploadedUrlRef.current = backgroundImageUrl;
      setEditorState((prev) => ({
        ...prev,
        backgroundImage: previewUrl,
      }));
      setCropModalOpen(false);
      setCropDragState(null);
      message.success('背景图裁剪完成');
    } catch (error) {
      console.error('crop background image failed:', error);
      message.error('背景图裁剪失败，请重试');
    } finally {
      setCropLoading(false);
    }
  };

  const ensureBackgroundAttachmentId = async () => {
    let backgroundImageAttachmentId =
      backgroundUploadedAttachmentIdRef.current || '';
    if (!backgroundImageAttachmentId && backgroundFileRef.current) {
      const backgroundImageAttachment = await uploadImageAttachment(
        backgroundFileRef.current,
        'qr-template-bg.png',
      );
      backgroundImageAttachmentId = getAttachmentId(backgroundImageAttachment);
      backgroundUploadedAttachmentIdRef.current = backgroundImageAttachmentId;
      backgroundUploadedUrlRef.current = getAttachmentUrl(
        backgroundImageAttachment,
      );
    }
    if (!backgroundImageAttachmentId) {
      throw new Error('上传接口未返回背景图附件 ID');
    }
    return backgroundImageAttachmentId;
  };

  const cropMetrics = cropDraft
    ? getCropImageMetrics(cropDraft, cropPreviewWidth, cropPreviewHeight)
    : null;
  const cropImageWidth = cropMetrics?.imageWidth ?? 0;
  const cropImageHeight = cropMetrics?.imageHeight ?? 0;
  const cropImageOffset = cropDraft
    ? clampCropOffset(
        cropDraft.offsetX,
        cropDraft.offsetY,
        cropImageWidth,
        cropImageHeight,
        cropPreviewWidth,
        cropPreviewHeight,
      )
    : { offsetX: 0, offsetY: 0 };

  const updateCropZoom = useCallback(
    (value: number) => {
      setCropDraft((prev) =>
        prev
          ? clampCropDraft(
              {
                ...prev,
                zoom: Number(value),
              },
              cropPreviewWidth,
              cropPreviewHeight,
            )
          : prev,
      );
    },
    [cropPreviewHeight, cropPreviewWidth],
  );

  const handleCropWheel = useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      if (!cropDraft) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      updateCropZoom(cropDraft.zoom + direction * CROP_ZOOM_STEP);
    },
    [cropDraft, updateCropZoom],
  );

  return useMemo(
    () => ({
      cropModalOpen,
      cropDraft,
      cropLoading,
      cropPreviewWidth,
      cropPreviewHeight,
      cropImageWidth,
      cropImageHeight,
      cropImageOffsetX: cropImageOffset.offsetX,
      cropImageOffsetY: cropImageOffset.offsetY,
      backgroundUploadProps,
      clearBackgroundPreview,
      resetBackgroundAsset,
      setExistingBackgroundAsset,
      ensureBackgroundAttachmentId,
      handleCropConfirm,
      closeCropModal: () => {
        setCropModalOpen(false);
        setCropDragState(null);
      },
      startCropDrag: (event: React.MouseEvent<HTMLElement>) => {
        if (!cropDraft) return;
        event.preventDefault();
        setCropDragState({
          startX: event.clientX,
          startY: event.clientY,
          initialX: cropDraft.offsetX,
          initialY: cropDraft.offsetY,
        });
      },
      updateCropZoom,
      handleCropWheel,
    }),
    [
      backgroundUploadProps,
      clearBackgroundPreview,
      cropDraft,
      cropImageHeight,
      cropImageOffset.offsetX,
      cropImageOffset.offsetY,
      cropImageWidth,
      cropLoading,
      cropModalOpen,
      cropPreviewHeight,
      cropPreviewWidth,
      ensureBackgroundAttachmentId,
      handleCropWheel,
      handleCropConfirm,
      resetBackgroundAsset,
      setExistingBackgroundAsset,
      updateCropZoom,
    ],
  );
}
