import {
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import { Alert, Button, Form, Input, message, Space, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { useCallback, useEffect, useState } from 'react';
import {
  getWechatMpConfig,
  saveWechatMpConfig,
  type WechatMpConfig,
} from '@/api/wechatConfig';
import { PageSectionSkeleton, PermissionButton } from '@/components';
import {
  createRemoteUploadFileList,
  imageUploadRequest,
  normalizeUploadFileList,
  resolveUploadImageUrl,
} from '@/pages/form/shared/upload';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import '../wechat-config.less';

const MP_CONFIG_SAVE_PERM = 'wechat:wechatMpConfig:saveConfig';

type WechatMpFormValues = {
  mpConfigName?: string;
  appid?: string;
  appSecret?: string;
  appToken?: string;
  appAseKey?: string;
  headImg?: UploadFile[];
  userName?: string;
  qrcodeUrl?: UploadFile[];
  signature?: string;
  principalName?: string;
};

function normalizeFormText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeFormText(value);
  return text || undefined;
}

function buildMpFormValues(detail?: WechatMpConfig | null) {
  return {
    mpConfigName: normalizeFormText(detail?.mpConfigName),
    appid: normalizeFormText(detail?.appid),
    appSecret: normalizeFormText(detail?.appSecret),
    appToken: normalizeFormText(detail?.appToken),
    appAseKey: normalizeFormText(detail?.appAseKey),
    headImg: createRemoteUploadFileList(detail?.headImg, 'mp-head-img'),
    userName: normalizeFormText(detail?.userName),
    qrcodeUrl: createRemoteUploadFileList(detail?.qrcodeUrl, 'mp-qrcode'),
    signature: normalizeFormText(detail?.signature),
    principalName: normalizeFormText(detail?.principalName),
  };
}

function validateImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error('只能上传图片文件');
    return false;
  }
  return true;
}

function openUploadPreview(file?: UploadFile) {
  const previewUrl = String(file?.url || file?.thumbUrl || '').trim();
  if (!previewUrl) return;
  window.open(previewUrl, '_blank', 'noopener,noreferrer');
}

function renderUploadTrigger(text: string) {
  return (
    <div className="site-config-upload-trigger">
      <UploadOutlined />
      <span>{text}</span>
    </div>
  );
}

function SingleImageUploadField({
  value,
  onChange,
  canModify = false,
  triggerText,
}: {
  value?: UploadFile[];
  onChange?: (value: UploadFile[]) => void;
  canModify?: boolean;
  triggerText: string;
}) {
  const fileList = Array.isArray(value) ? value.slice(-1) : [];
  const currentFile = fileList[0];
  const previewUrl = String(currentFile?.url || currentFile?.thumbUrl || '');
  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) =>
    validateImageFile(file) ? true : Upload.LIST_IGNORE;

  const handleChange: UploadProps['onChange'] = (event) => {
    onChange?.(normalizeUploadFileList(event));
  };

  return (
    <div className="site-config-image-field site-config-upload-list">
      {currentFile ? (
        <div className="wechat-config-image-card">
          {previewUrl ? (
            <img
              alt={triggerText}
              src={previewUrl}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="wechat-config-image-placeholder">上传中...</span>
          )}
          <div className="wechat-config-image-actions">
            <Button
              icon={<EyeOutlined />}
              size="small"
              type="text"
              onClick={() => openUploadPreview(currentFile)}
            />
            {canModify ? (
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                type="text"
                onClick={() => onChange?.([])}
              />
            ) : null}
          </div>
        </div>
      ) : null}
      {canModify ? (
        <Upload
          accept="image/*"
          beforeUpload={handleBeforeUpload}
          customRequest={imageUploadRequest}
          fileList={fileList}
          maxCount={1}
          onChange={handleChange}
          showUploadList={false}
        >
          {currentFile ? (
            <Button icon={<UploadOutlined />}>替换图片</Button>
          ) : (
            renderUploadTrigger(triggerText)
          )}
        </Upload>
      ) : null}
    </div>
  );
}

async function resolveSingleImageUrl(fileList?: UploadFile[]) {
  if (!Array.isArray(fileList) || fileList.length === 0) return '';
  return resolveUploadImageUrl(fileList);
}

const WechatMpConfigPage = () => {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const [form] = Form.useForm<WechatMpFormValues>();
  const [detail, setDetail] = useState<WechatMpConfig>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const canSave = Boolean(access?.hasButtonPerm?.(MP_CONFIG_SAVE_PERM));

  const loadConfig = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      }
      setLoadError(undefined);

      try {
        const res = await getWechatMpConfig({
          skipErrorHandler: true,
        });
        const nextDetail = res || {};
        setDetail(nextDetail);
        form.setFieldsValue(buildMpFormValues(nextDetail));
      } catch (error) {
        console.error('load wechat mp config failed:', error);
        const errorMessage = getErrorMessage(error, '获取公众号配置失败');
        if (mode === 'refresh') {
          message.error(errorMessage);
        } else {
          setLoadError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [form],
  );

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleSave = async (values: WechatMpFormValues) => {
    setSaving(true);
    try {
      const id = normalizeOptionalText(detail?.id);
      const res = await saveWechatMpConfig(
        {
          ...(id ? { id } : {}),
          mpConfigName: normalizeFormText(values.mpConfigName),
          appid: normalizeFormText(values.appid),
          appSecret: normalizeFormText(values.appSecret),
          appToken: normalizeFormText(values.appToken),
          appAseKey: normalizeFormText(values.appAseKey),
          headImg: await resolveSingleImageUrl(values.headImg),
          userName: normalizeFormText(values.userName),
          qrcodeUrl: await resolveSingleImageUrl(values.qrcodeUrl),
          signature: normalizeFormText(values.signature),
          principalName: normalizeFormText(values.principalName),
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(getApiMessage(res, '保存成功'));
      await loadConfig('refresh');
    } catch (error) {
      console.error('save wechat mp config failed:', error);
      message.error(getErrorMessage(error, '保存公众号配置失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="site-config-page wechat-config-page">
      <section className="content-card site-config-card">
        <div className="site-config-header">
          <div className="site-config-title-block">
            <h2>公众号配置</h2>
            <span>配置微信公众号基础参数</span>
          </div>
          <Space wrap>
            <Button
              htmlType="button"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => loadConfig('refresh')}
            >
              刷新
            </Button>
          </Space>
        </div>

        {loading ? (
          <PageSectionSkeleton rows={6} />
        ) : loadError ? (
          <Alert type="error" showIcon message={loadError} />
        ) : (
          <Form
            form={form}
            labelAlign="right"
            labelCol={{ flex: '180px' }}
            layout="horizontal"
            onFinish={handleSave}
            wrapperCol={{ flex: '1' }}
          >
            <div className="site-config-form-list">
              <Form.Item
                className="site-config-form-item"
                label="公众号配置名称"
                name="mpConfigName"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入公众号配置名称"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="公众号 AppID"
                name="appid"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入公众号 AppID"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="公众号 Secret"
                name="appSecret"
              >
                <Input.Password
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入公众号 Secret"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="公众号 Token"
                name="appToken"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入公众号 Token"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="公众号 EncodingAESKey"
                name="appAseKey"
              >
                <Input.Password
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入公众号 EncodingAESKey"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="头像"
                name="headImg"
                valuePropName="value"
              >
                <SingleImageUploadField
                  canModify={canSave}
                  triggerText="上传头像"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="原始 ID"
                name="userName"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入原始 ID"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="二维码"
                name="qrcodeUrl"
                valuePropName="value"
              >
                <SingleImageUploadField
                  canModify={canSave}
                  triggerText="上传二维码"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="账号介绍"
                name="signature"
              >
                <Input.TextArea
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入账号介绍"
                  autoSize={{ minRows: 3, maxRows: 5 }}
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="主体名称"
                name="principalName"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入主体名称"
                />
              </Form.Item>
            </div>
            <Form.Item
              className="site-config-submit-row"
              label=" "
              colon={false}
            >
              <PermissionButton
                perm={MP_CONFIG_SAVE_PERM}
                type="primary"
                htmlType="submit"
                loading={saving}
              >
                立即提交
              </PermissionButton>
            </Form.Item>
          </Form>
        )}
      </section>
    </div>
  );
};

export default WechatMpConfigPage;
