import { QRCode } from 'antd';
import {
  QR_TEMPLATE_PREVIEW_SN,
  QR_TEMPLATE_PREVIEW_VALUE,
} from '../constants';
import type { EditorStateModel, QrCanvasControls } from '../types';

type QrTemplateCanvasPreviewProps = {
  editorState: EditorStateModel;
  canvasControls: QrCanvasControls;
};

const QrTemplateCanvasPreview: React.FC<QrTemplateCanvasPreviewProps> = ({
  editorState,
  canvasControls,
}) => {
  return (
    <div className="qr-template-editor-preview-pane">
      <div className="qr-template-editor-preview-header">
        <div>
          <div className="qr-template-editor-preview-title">画布预览</div>
          <div className="qr-template-editor-preview-desc">
            二维码支持拖拽和等比缩放，编码仅支持纵向拖动。
          </div>
        </div>
      </div>

      <div className="qr-template-canvas-shell">
        <div className="qr-template-canvas-stage">
          <div
            className="qr-template-canvas"
            style={{
              width: editorState.canvasWidth,
              height: editorState.canvasHeight,
            }}
            onMouseDown={canvasControls.clearSelection}
          >
            {editorState.backgroundImage ? (
              <img
                src={editorState.backgroundImage}
                alt="背景图预览"
                className="qr-template-canvas-background"
              />
            ) : null}

            <div
              ref={canvasControls.qrcodeNodeRef}
              className={`qr-template-canvas-qrcode ${
                canvasControls.activeSelection === 'qrcode' ? 'is-active' : ''
              }`}
              style={{
                left: editorState.qrcode.x,
                top: editorState.qrcode.y,
                width: editorState.qrcode.size,
                height: editorState.qrcode.size,
              }}
              onMouseDown={canvasControls.handleQrcodeMouseDown}
            >
              <QRCode
                value={QR_TEMPLATE_PREVIEW_VALUE}
                size={editorState.qrcode.size}
                color={editorState.qrcode.color}
                bgColor="transparent"
                marginSize={0}
                bordered={false}
              />
              {canvasControls.activeSelection === 'qrcode' ? (
                <div
                  className="qr-template-canvas-qrcode-handle"
                  onMouseDown={canvasControls.handleQrcodeResizeMouseDown}
                />
              ) : null}
            </div>

            {editorState.showCodeText ? (
              <div
                ref={canvasControls.codeTextNodeRef}
                className={`qr-template-canvas-code-text ${
                  canvasControls.activeSelection === 'codeText'
                    ? 'is-active'
                    : ''
                }`}
                style={{
                  left: editorState.qrcode.x,
                  top: canvasControls.codeTextTop,
                  width: editorState.qrcode.size,
                  color: editorState.codeText.color,
                  fontSize: editorState.codeText.fontSize,
                }}
                onMouseDown={canvasControls.handleCodeTextMouseDown}
              >
                {QR_TEMPLATE_PREVIEW_SN}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrTemplateCanvasPreview;
