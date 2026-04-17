import { Form, message } from 'antd';
import { useState } from 'react';
import {
  addQrCodeTemplate,
  getQrCodeTemplateDetail,
  updateQrCodeTemplate,
} from '@/api/qrCodeTemplate';
import { uploadImageAttachment } from '@/pages/form/shared/upload';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { DEFAULT_EDITOR_STATE } from '../constants';
import type { EditorStateModel, QrBackgroundAsset } from '../types';
import {
  getBackgroundImageAttachmentId,
  getBackgroundImageUrl,
} from '../utils/templateData';
import { createTemplatePreviewFile } from '../utils/templatePreview';

type UseQrTemplateEditorOptions = {
  editorState: EditorStateModel;
  setEditorState: React.Dispatch<React.SetStateAction<EditorStateModel>>;
  backgroundAsset: Pick<
    QrBackgroundAsset,
    | 'resetBackgroundAsset'
    | 'setExistingBackgroundAsset'
    | 'ensureBackgroundAttachmentId'
  >;
  resetCanvasInteraction: () => void;
  refreshFirstPage: () => void;
};

export function useQrTemplateEditor({
  editorState,
  setEditorState,
  backgroundAsset,
  resetCanvasInteraction,
  refreshFirstPage,
}: UseQrTemplateEditorOptions) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [drawerForm] = Form.useForm();

  const openCreateDrawer = () => {
    setEditingTemplateId(null);
    drawerForm.setFieldsValue({
      name: '',
      state: 1,
      isDefault: false,
      showSn: true,
      remark: '',
    });
    backgroundAsset.resetBackgroundAsset();
    setEditorState(DEFAULT_EDITOR_STATE);
    resetCanvasInteraction();
    setDrawerOpen(true);
  };

  const openEditDrawer = async (id: string) => {
    try {
      const res = await getQrCodeTemplateDetail(id, {
        skipErrorHandler: true,
      });
      if (!res) throw new Error('Query detail empty');
      const data = res as any;
      const backgroundImageUrl = getBackgroundImageUrl(data);
      const backgroundImageAttachmentId = getBackgroundImageAttachmentId(data);

      setEditingTemplateId(id);

      drawerForm.setFieldsValue({
        name: data.name,
        state: data.state ?? 1,
        showSn: data.qrcodeSnConfig?.isShow === 1,
        remark: data.remark || '',
      });

      backgroundAsset.setExistingBackgroundAsset(
        backgroundImageAttachmentId,
        backgroundImageUrl,
      );
      setEditorState({
        canvasWidth: data.bgConfig?.w || 320,
        canvasHeight: data.bgConfig?.h || 420,
        backgroundImage: backgroundImageUrl || null,
        qrcode: {
          x: data.qrcodeImageConfig?.x || 88,
          y: data.qrcodeImageConfig?.y || 112,
          size: data.qrcodeImageConfig?.w || 144,
          color: data.qrcodeImageConfig?.color || '#000000',
        },
        codeText: {
          offsetY: data.qrcodeSnConfig?.y || 14,
          fontSize: data.qrcodeSnConfig?.size || 16,
          color: data.qrcodeSnConfig?.color || '#1f2837',
        },
        showCodeText: data.qrcodeSnConfig?.isShow === 1,
      });
      resetCanvasInteraction();
      setDrawerOpen(true);
    } catch (error) {
      console.error('Fetch template detail failed:', error);
      message.error(getErrorMessage(error, '获取模板详情失败'));
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetCanvasInteraction();
  };

  const handleDrawerSubmit = async () => {
    try {
      const values = await drawerForm.validateFields();

      const payload = {
        name: values.name,
        prevImageAttachmentId: '',
        qrcodeSnConfig: {
          isShow: values.showSn ? 1 : 0,
          size: editorState.codeText.fontSize,
          y: editorState.codeText.offsetY,
          color: editorState.codeText.color,
        },
        qrcodeImageConfig: {
          w: editorState.qrcode.size,
          h: editorState.qrcode.size,
          x: editorState.qrcode.x,
          y: editorState.qrcode.y,
          color: editorState.qrcode.color,
        },
        bgConfig: {
          w: editorState.canvasWidth,
          h: editorState.canvasHeight,
          imageAttachmentId: '',
        },
        remark: values.remark || '',
        state: values.state,
      };

      if (editorState.backgroundImage) {
        const backgroundImageAttachmentId =
          await backgroundAsset.ensureBackgroundAttachmentId();
        const previewFile = await createTemplatePreviewFile(
          editorState,
          editorState.backgroundImage,
        );
        const previewImageAttachment = await uploadImageAttachment(
          previewFile,
          'qr-template-preview.png',
        );
        const previewImageAttachmentId = String(
          previewImageAttachment?.id || '',
        ).trim();
        if (!previewImageAttachmentId) {
          throw new Error('上传接口未返回预览图附件 ID');
        }
        payload.prevImageAttachmentId = previewImageAttachmentId;
        payload.bgConfig.imageAttachmentId = backgroundImageAttachmentId;
      }

      if (editingTemplateId) {
        const res = await updateQrCodeTemplate(
          { ...payload, id: editingTemplateId },
          { skipErrorHandler: true },
        );
        message.success(getApiMessage(res, '修改成功'));
      } else {
        const res = await addQrCodeTemplate(payload, {
          skipErrorHandler: true,
        });
        message.success(getApiMessage(res, '保存成功'));
      }

      setDrawerOpen(false);
      refreshFirstPage();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error(error);
      message.error(
        getErrorMessage(
          error,
          editingTemplateId ? '修改模板失败' : '新增模板失败',
        ),
      );
    }
  };

  return {
    drawerOpen,
    editingTemplateId,
    drawerForm,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    handleDrawerSubmit,
  };
}
