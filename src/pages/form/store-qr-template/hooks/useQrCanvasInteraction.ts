import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  DEFAULT_EDITOR_STATE,
  MAX_CANVAS_HEIGHT,
  MAX_CANVAS_WIDTH,
} from '../constants';
import type { DragState, EditorSelection, EditorStateModel } from '../types';
import { clamp, clampCodeTextOffset } from '../utils/geometry';

type UseQrCanvasInteractionOptions = {
  editorState: EditorStateModel;
  setEditorState: React.Dispatch<React.SetStateAction<EditorStateModel>>;
};

type DragPreviewResult =
  | {
      type: 'qrcode';
      x: number;
      y: number;
    }
  | {
      type: 'qrcodeResize';
      size: number;
      codeTextOffsetY: number;
    }
  | {
      type: 'codeText';
      offsetY: number;
    };

export function useQrCanvasInteraction({
  editorState,
  setEditorState,
}: UseQrCanvasInteractionOptions) {
  const qrcodeNodeRef = useRef<HTMLDivElement | null>(null);
  const codeTextNodeRef = useRef<HTMLDivElement | null>(null);
  const previewFrameRef = useRef<number | null>(null);
  const pendingPreviewRef = useRef<(() => void) | null>(null);
  const latestDragResultRef = useRef<DragPreviewResult | null>(null);
  const [selection, setSelection] = useState<EditorSelection>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const cancelPreviewFrame = useCallback(() => {
    if (previewFrameRef.current !== null) {
      window.cancelAnimationFrame(previewFrameRef.current);
      previewFrameRef.current = null;
    }
    pendingPreviewRef.current = null;
  }, []);

  const queuePreviewUpdate = useCallback((task: () => void) => {
    pendingPreviewRef.current = task;
    if (previewFrameRef.current !== null) return;

    previewFrameRef.current = window.requestAnimationFrame(() => {
      previewFrameRef.current = null;
      const pendingPreview = pendingPreviewRef.current;
      pendingPreviewRef.current = null;
      pendingPreview?.();
    });
  }, []);

  const resetPreviewStyles = useCallback(() => {
    cancelPreviewFrame();

    if (qrcodeNodeRef.current) {
      qrcodeNodeRef.current.style.transform = '';
    }
    if (codeTextNodeRef.current) {
      codeTextNodeRef.current.style.transform = '';
    }
  }, [cancelPreviewFrame]);

  const resetCanvasInteraction = useCallback(() => {
    latestDragResultRef.current = null;
    resetPreviewStyles();
    setSelection(null);
    setDragState(null);
  }, [resetPreviewStyles]);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (dragState.type === 'qrcode') {
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        const maxX = Math.max(
          0,
          editorState.canvasWidth - editorState.qrcode.size,
        );
        const maxY = Math.max(
          0,
          editorState.canvasHeight - editorState.qrcode.size,
        );
        const x = clamp(dragState.initialX + deltaX, 0, maxX);
        const y = clamp(dragState.initialY + deltaY, 0, maxY);
        const transformX = x - dragState.initialX;
        const transformY = y - dragState.initialY;

        latestDragResultRef.current = {
          type: 'qrcode',
          x,
          y,
        };
        queuePreviewUpdate(() => {
          const transform = `translate3d(${transformX}px, ${transformY}px, 0)`;
          if (qrcodeNodeRef.current) {
            qrcodeNodeRef.current.style.transform = transform;
          }
          if (codeTextNodeRef.current) {
            codeTextNodeRef.current.style.transform = transform;
          }
        });
        return;
      }

      if (dragState.type === 'qrcodeResize') {
        const delta = Math.max(
          event.clientX - dragState.startX,
          event.clientY - dragState.startY,
        );

        const initialSize = Number(
          dragState.initialSize || editorState.qrcode.size,
        );
        const maxSize = Math.min(
          editorState.canvasWidth - editorState.qrcode.x,
          editorState.canvasHeight - editorState.qrcode.y,
        );
        const size = clamp(initialSize + delta, 72, maxSize);
        const codeTextOffsetY = clampCodeTextOffset(
          editorState.codeText.offsetY,
          {
            canvasHeight: editorState.canvasHeight,
            qrcode: {
              ...editorState.qrcode,
              size,
            },
            codeText: editorState.codeText,
          },
        );
        const scale = initialSize > 0 ? size / initialSize : 1;
        const codeTextTranslateY =
          size - initialSize + codeTextOffsetY - editorState.codeText.offsetY;

        latestDragResultRef.current = {
          type: 'qrcodeResize',
          size,
          codeTextOffsetY,
        };
        queuePreviewUpdate(() => {
          if (qrcodeNodeRef.current) {
            qrcodeNodeRef.current.style.transform = `scale(${scale})`;
          }
          if (codeTextNodeRef.current) {
            codeTextNodeRef.current.style.transform = `translate3d(0, ${codeTextTranslateY}px, 0)`;
          }
        });
        return;
      }

      const deltaY = event.clientY - dragState.startY;
      const offsetY = clampCodeTextOffset(
        dragState.initialY + deltaY,
        editorState,
      );
      const transformY = offsetY - dragState.initialY;

      latestDragResultRef.current = {
        type: 'codeText',
        offsetY,
      };
      queuePreviewUpdate(() => {
        if (codeTextNodeRef.current) {
          codeTextNodeRef.current.style.transform = `translate3d(0, ${transformY}px, 0)`;
        }
      });
    };

    const handleMouseUp = () => {
      const dragResult = latestDragResultRef.current;
      latestDragResultRef.current = null;

      if (dragResult) {
        flushSync(() => {
          setEditorState((prev) => {
            if (dragResult.type === 'qrcode') {
              return {
                ...prev,
                qrcode: {
                  ...prev.qrcode,
                  x: clamp(
                    dragResult.x,
                    0,
                    Math.max(0, prev.canvasWidth - prev.qrcode.size),
                  ),
                  y: clamp(
                    dragResult.y,
                    0,
                    Math.max(0, prev.canvasHeight - prev.qrcode.size),
                  ),
                },
              };
            }

            if (dragResult.type === 'qrcodeResize') {
              const size = clamp(
                dragResult.size,
                72,
                Math.min(
                  prev.canvasWidth - prev.qrcode.x,
                  prev.canvasHeight - prev.qrcode.y,
                ),
              );
              const nextQrcode = {
                ...prev.qrcode,
                size,
              };

              return {
                ...prev,
                qrcode: nextQrcode,
                codeText: {
                  ...prev.codeText,
                  offsetY: clampCodeTextOffset(dragResult.codeTextOffsetY, {
                    canvasHeight: prev.canvasHeight,
                    qrcode: nextQrcode,
                    codeText: prev.codeText,
                  }),
                },
              };
            }

            return {
              ...prev,
              codeText: {
                ...prev.codeText,
                offsetY: clampCodeTextOffset(dragResult.offsetY, prev),
              },
            };
          });
        });
      }

      resetPreviewStyles();
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelPreviewFrame();
    };
  }, [
    cancelPreviewFrame,
    dragState,
    editorState,
    queuePreviewUpdate,
    resetPreviewStyles,
    setEditorState,
  ]);

  const handleCanvasWidthChange = (value: number | null) => {
    setEditorState((prev) => {
      const canvasWidth = clamp(Number(value || 0), 120, MAX_CANVAS_WIDTH);
      const nextSize = clamp(
        prev.qrcode.size,
        72,
        Math.min(canvasWidth, prev.canvasHeight),
      );

      return {
        ...prev,
        canvasWidth,
        qrcode: {
          ...prev.qrcode,
          size: nextSize,
          x: clamp(prev.qrcode.x, 0, Math.max(0, canvasWidth - nextSize)),
          y: clamp(prev.qrcode.y, 0, Math.max(0, prev.canvasHeight - nextSize)),
        },
      };
    });
  };

  const handleCanvasHeightChange = (value: number | null) => {
    setEditorState((prev) => {
      const canvasHeight = clamp(Number(value || 0), 120, MAX_CANVAS_HEIGHT);
      const nextSize = clamp(
        prev.qrcode.size,
        72,
        Math.min(prev.canvasWidth, canvasHeight),
      );
      const nextQrcode = {
        ...prev.qrcode,
        size: nextSize,
        x: clamp(prev.qrcode.x, 0, Math.max(0, prev.canvasWidth - nextSize)),
        y: clamp(prev.qrcode.y, 0, Math.max(0, canvasHeight - nextSize)),
      };

      return {
        ...prev,
        canvasHeight,
        qrcode: nextQrcode,
        codeText: {
          ...prev.codeText,
          offsetY: clampCodeTextOffset(prev.codeText.offsetY, {
            canvasHeight,
            qrcode: nextQrcode,
            codeText: prev.codeText,
          }),
        },
      };
    });
  };

  const handleShowCodeTextChange = (checked: boolean) => {
    setEditorState((prev) => ({
      ...prev,
      showCodeText: checked,
    }));

    if (!checked && selection === 'codeText') {
      setSelection('qrcode');
    }
  };

  const handleCodeTextFontSizeChange = (value: number | null) => {
    setEditorState((prev) => {
      const nextCodeText = {
        ...prev.codeText,
        fontSize: clamp(Number(value || 0), 12, 36),
      };

      return {
        ...prev,
        codeText: {
          ...nextCodeText,
          offsetY: clampCodeTextOffset(nextCodeText.offsetY, {
            canvasHeight: prev.canvasHeight,
            qrcode: prev.qrcode,
            codeText: nextCodeText,
          }),
        },
      };
    });
  };

  const handleCodeTextColorChange = (color: string) => {
    setEditorState((prev) => ({
      ...prev,
      codeText: {
        ...prev.codeText,
        color,
      },
    }));
  };

  const handleQrcodeColorChange = (color: string) => {
    setEditorState((prev) => ({
      ...prev,
      qrcode: {
        ...prev.qrcode,
        color,
      },
    }));
  };

  const handleQrcodeXChange = (value: number | null) => {
    setEditorState((prev) => ({
      ...prev,
      qrcode: {
        ...prev.qrcode,
        x: clamp(
          Number(value || 0),
          0,
          Math.max(0, prev.canvasWidth - prev.qrcode.size),
        ),
      },
    }));
    setSelection('qrcode');
  };

  const handleQrcodeYChange = (value: number | null) => {
    setEditorState((prev) => {
      const y = clamp(
        Number(value || 0),
        0,
        Math.max(0, prev.canvasHeight - prev.qrcode.size),
      );
      const nextQrcode = {
        ...prev.qrcode,
        y,
      };

      return {
        ...prev,
        qrcode: nextQrcode,
        codeText: {
          ...prev.codeText,
          offsetY: clampCodeTextOffset(prev.codeText.offsetY, {
            canvasHeight: prev.canvasHeight,
            qrcode: nextQrcode,
            codeText: prev.codeText,
          }),
        },
      };
    });
    setSelection('qrcode');
  };

  const handleQrcodeMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setSelection('qrcode');
    latestDragResultRef.current = null;
    resetPreviewStyles();
    setDragState({
      type: 'qrcode',
      startX: event.clientX,
      startY: event.clientY,
      initialX: editorState.qrcode.x,
      initialY: editorState.qrcode.y,
    });
  };

  const handleQrcodeResizeMouseDown = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelection('qrcode');
    latestDragResultRef.current = null;
    resetPreviewStyles();
    setDragState({
      type: 'qrcodeResize',
      startX: event.clientX,
      startY: event.clientY,
      initialX: editorState.qrcode.x,
      initialY: editorState.qrcode.y,
      initialSize: editorState.qrcode.size,
    });
  };

  const handleCodeTextMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setSelection('codeText');
    latestDragResultRef.current = null;
    resetPreviewStyles();
    setDragState({
      type: 'codeText',
      startX: event.clientX,
      startY: event.clientY,
      initialX: editorState.qrcode.x,
      initialY: editorState.codeText.offsetY,
    });
  };

  const activeSelection = useMemo<EditorSelection>(() => {
    if (selection === 'codeText') {
      return editorState.showCodeText ? 'codeText' : null;
    }
    if (selection === 'qrcode') return 'qrcode';
    return null;
  }, [editorState.showCodeText, selection]);

  const codeTextTop =
    editorState.qrcode.y +
    editorState.qrcode.size +
    editorState.codeText.offsetY;

  return {
    activeSelection,
    codeTextTop,
    qrcodeNodeRef,
    codeTextNodeRef,
    resetCanvasInteraction,
    clearSelection,
    handleCanvasWidthChange,
    handleCanvasHeightChange,
    handleShowCodeTextChange,
    handleCodeTextFontSizeChange,
    handleCodeTextColorChange,
    handleQrcodeXChange,
    handleQrcodeYChange,
    handleQrcodeColorChange,
    handleQrcodeMouseDown,
    handleQrcodeResizeMouseDown,
    handleCodeTextMouseDown,
    resetEditorState: () => {
      setEditorState(DEFAULT_EDITOR_STATE);
      resetCanvasInteraction();
    },
  };
}
