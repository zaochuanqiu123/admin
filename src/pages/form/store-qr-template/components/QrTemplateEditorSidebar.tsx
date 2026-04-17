import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Button,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { MAX_CANVAS_HEIGHT, MAX_CANVAS_WIDTH } from '../constants';
import type {
  EditorStateModel,
  QrBackgroundAsset,
  QrCanvasControls,
} from '../types';

type QrTemplateEditorSidebarProps = {
  form: FormInstance;
  editorState: EditorStateModel;
  canvasControls: QrCanvasControls;
  backgroundAsset: QrBackgroundAsset;
};

const QrTemplateEditorSidebar: React.FC<QrTemplateEditorSidebarProps> = ({
  form,
  editorState,
  canvasControls,
  backgroundAsset,
}) => {
  return (
    <div className="qr-template-editor-sidebar">
      <Form form={form} layout="vertical">
        <div className="qr-template-editor-card">
          <div className="qr-template-editor-card-title">基础信息</div>
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" maxLength={30} />
          </Form.Item>
          <Form.Item
            label="状态"
            name="state"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              placeholder="请选择状态"
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={4} placeholder="请输入备注" maxLength={200} />
          </Form.Item>
        </div>

        <div className="qr-template-editor-card">
          <div className="qr-template-editor-card-title">编码设置</div>
          <Form.Item label="显示编码" name="showSn" valuePropName="checked">
            <Switch
              checkedChildren="显示"
              unCheckedChildren="隐藏"
              onChange={canvasControls.handleShowCodeTextChange}
            />
          </Form.Item>
          <div className="qr-template-editor-grid">
            <div className="qr-template-editor-control">
              <span className="qr-template-editor-label">编码字号</span>
              <InputNumber
                min={12}
                max={36}
                addonAfter="px"
                disabled={!editorState.showCodeText}
                value={editorState.codeText.fontSize}
                onChange={canvasControls.handleCodeTextFontSizeChange}
              />
            </div>
            <div className="qr-template-editor-control">
              <span className="qr-template-editor-label">编码颜色</span>
              <div className="qr-template-editor-color-control">
                <ColorPicker
                  disabled={!editorState.showCodeText}
                  value={editorState.codeText.color}
                  showText
                  onChange={(_, hex) => {
                    canvasControls.handleCodeTextColorChange(hex);
                  }}
                />
                <div
                  className="qr-template-editor-color-preview"
                  style={{ backgroundColor: editorState.codeText.color }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="qr-template-editor-card">
          <div className="qr-template-editor-card-title">二维码设置</div>
          <div className="qr-template-editor-grid">
            <div className="qr-template-editor-coordinate-row">
              <div className="qr-template-editor-control">
                <span className="qr-template-editor-label">X 坐标</span>
                <InputNumber
                  min={0}
                  max={Math.max(
                    0,
                    editorState.canvasWidth - editorState.qrcode.size,
                  )}
                  addonAfter="px"
                  value={editorState.qrcode.x}
                  onChange={canvasControls.handleQrcodeXChange}
                />
              </div>
              <div className="qr-template-editor-control">
                <span className="qr-template-editor-label">Y 坐标</span>
                <InputNumber
                  min={0}
                  max={Math.max(
                    0,
                    editorState.canvasHeight - editorState.qrcode.size,
                  )}
                  addonAfter="px"
                  value={editorState.qrcode.y}
                  onChange={canvasControls.handleQrcodeYChange}
                />
              </div>
            </div>
            <div className="qr-template-editor-control">
              <span className="qr-template-editor-label">二维码颜色</span>
              <div className="qr-template-editor-color-control">
                <ColorPicker
                  value={editorState.qrcode.color}
                  showText
                  onChange={(_, hex) => {
                    canvasControls.handleQrcodeColorChange(hex);
                  }}
                />
                <div
                  className="qr-template-editor-color-preview"
                  style={{ backgroundColor: editorState.qrcode.color }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="qr-template-editor-card">
          <div className="qr-template-editor-card-title">画布设置</div>
          <div className="qr-template-editor-grid">
            <div className="qr-template-editor-control">
              <span className="qr-template-editor-label">画布宽度</span>
              <InputNumber
                min={120}
                max={MAX_CANVAS_WIDTH}
                addonAfter="px"
                value={editorState.canvasWidth}
                onChange={canvasControls.handleCanvasWidthChange}
              />
            </div>
            <div className="qr-template-editor-control">
              <span className="qr-template-editor-label">画布高度</span>
              <InputNumber
                min={120}
                max={MAX_CANVAS_HEIGHT}
                addonAfter="px"
                value={editorState.canvasHeight}
                onChange={canvasControls.handleCanvasHeightChange}
              />
            </div>
          </div>
          <div className="qr-template-editor-limit-note">
            当前先限制为宽 {MAX_CANVAS_WIDTH}px、高 {MAX_CANVAS_HEIGHT}px。
          </div>
          <div className="qr-template-editor-actions">
            <Upload {...backgroundAsset.backgroundUploadProps}>
              <Button icon={<UploadOutlined />}>
                {editorState.backgroundImage ? '重新上传背景图' : '上传背景图'}
              </Button>
            </Upload>
            <Button
              icon={<DeleteOutlined />}
              disabled={!editorState.backgroundImage}
              onClick={backgroundAsset.clearBackgroundPreview}
            >
              删除背景图
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default QrTemplateEditorSidebar;
