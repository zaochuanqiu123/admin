import { Button, Drawer, Space } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type {
  EditorStateModel,
  QrBackgroundAsset,
  QrCanvasControls,
} from '../types';
import QrTemplateCanvasPreview from './QrTemplateCanvasPreview';
import QrTemplateEditorSidebar from './QrTemplateEditorSidebar';

type QrTemplateEditorDrawerProps = {
  open: boolean;
  form: FormInstance;
  editorState: EditorStateModel;
  canvasControls: QrCanvasControls;
  backgroundAsset: QrBackgroundAsset;
  onClose: () => void;
  onSubmit: () => void;
};

const QrTemplateEditorDrawer: React.FC<QrTemplateEditorDrawerProps> = ({
  open,
  form,
  editorState,
  canvasControls,
  backgroundAsset,
  onClose,
  onSubmit,
}) => {
  return (
    <Drawer
      title="添加模板"
      width={1040}
      open={open}
      destroyOnClose
      placement="right"
      onClose={onClose}
      className="qr-template-drawer"
      styles={{
        body: {
          padding: 16,
        },
      }}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={onSubmit}>
            保存
          </Button>
        </Space>
      }
    >
      <div className="qr-template-editor-layout">
        <QrTemplateEditorSidebar
          form={form}
          editorState={editorState}
          canvasControls={canvasControls}
          backgroundAsset={backgroundAsset}
        />
        <QrTemplateCanvasPreview
          editorState={editorState}
          canvasControls={canvasControls}
        />
      </div>
    </Drawer>
  );
};

export default QrTemplateEditorDrawer;
