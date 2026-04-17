import { Modal, Slider, Spin } from 'antd';
import { CROP_ZOOM_MAX, CROP_ZOOM_MIN, CROP_ZOOM_STEP } from '../constants';
import type { QrBackgroundAsset } from '../types';

type QrTemplateCropModalProps = {
  backgroundAsset: QrBackgroundAsset;
};

const QrTemplateCropModal: React.FC<QrTemplateCropModalProps> = ({
  backgroundAsset,
}) => {
  return (
    <Modal
      title="裁剪背景图"
      open={backgroundAsset.cropModalOpen}
      width={560}
      destroyOnClose
      maskClosable={false}
      className="qr-template-crop-modal"
      confirmLoading={backgroundAsset.cropLoading}
      onCancel={backgroundAsset.closeCropModal}
      onOk={() => {
        void backgroundAsset.handleCropConfirm();
      }}
      okText="确定"
      cancelText="取消"
    >
      <div className="qr-template-crop-panel">
        <div className="qr-template-crop-hint">
          选中图片后可拖动位置，并通过缩放控制裁剪范围。确认后再应用到画布。
        </div>
        <div
          className="qr-template-crop-stage"
          style={{
            width: backgroundAsset.cropPreviewWidth,
            height: backgroundAsset.cropPreviewHeight,
          }}
        >
          {backgroundAsset.cropDraft ? (
            <div
              className="qr-template-crop-viewport"
              style={{
                width: backgroundAsset.cropPreviewWidth,
                height: backgroundAsset.cropPreviewHeight,
              }}
              onMouseDown={backgroundAsset.startCropDrag}
              onWheel={backgroundAsset.handleCropWheel}
            >
              <img
                src={backgroundAsset.cropDraft.sourceUrl}
                alt="待裁剪背景图"
                className="qr-template-crop-image"
                style={{
                  width: backgroundAsset.cropImageWidth,
                  height: backgroundAsset.cropImageHeight,
                  marginLeft: -backgroundAsset.cropImageWidth / 2,
                  marginTop: -backgroundAsset.cropImageHeight / 2,
                  transform: `translate(${backgroundAsset.cropImageOffsetX}px, ${backgroundAsset.cropImageOffsetY}px)`,
                }}
              />
              <div className="qr-template-crop-frame" />
            </div>
          ) : (
            <div className="qr-template-crop-empty">
              <Spin size="large" />
            </div>
          )}
        </div>
        <div className="qr-template-crop-toolbar">
          <span className="qr-template-crop-toolbar-label">缩放</span>
          <Slider
            min={CROP_ZOOM_MIN}
            max={CROP_ZOOM_MAX}
            step={CROP_ZOOM_STEP}
            value={backgroundAsset.cropDraft?.zoom ?? 1}
            onChange={backgroundAsset.updateCropZoom}
          />
          <span className="qr-template-crop-toolbar-value">
            {`${((backgroundAsset.cropDraft?.zoom ?? 1) * 100).toFixed(0)}%`}
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default QrTemplateCropModal;
