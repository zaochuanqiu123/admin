import { ReloadOutlined } from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import { Alert, Button, Form, Input, message, Space } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  getWechatOpenConfig,
  saveWechatOpenConfig,
  type WechatOpenConfig,
} from '@/api/wechatConfig';
import { PageSectionSkeleton, PermissionButton } from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import '../wechat-config.less';

const OPEN_CONFIG_SAVE_PERM = 'wechat:wechatOpenConfig:saveConfig';

type WechatOpenFormValues = {
  appId?: string;
  appSecret?: string;
  token?: string;
  encodingAesKey?: string;
};

function normalizeFormText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeFormText(value);
  return text || undefined;
}

function buildOpenFormValues(detail?: WechatOpenConfig | null) {
  return {
    appId: normalizeFormText(detail?.appId),
    appSecret: normalizeFormText(detail?.appSecret),
    token: normalizeFormText(detail?.token),
    encodingAesKey: normalizeFormText(detail?.encodingAesKey),
  };
}

const WechatOpenConfigPage = () => {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const [form] = Form.useForm<WechatOpenFormValues>();
  const [detail, setDetail] = useState<WechatOpenConfig>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const canSave = Boolean(access?.hasButtonPerm?.(OPEN_CONFIG_SAVE_PERM));

  const loadConfig = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      }
      setLoadError(undefined);

      try {
        const res = await getWechatOpenConfig({
          skipErrorHandler: true,
        });
        const nextDetail = res || {};
        setDetail(nextDetail);
        form.setFieldsValue(buildOpenFormValues(nextDetail));
      } catch (error) {
        console.error('load wechat open config failed:', error);
        const errorMessage = getErrorMessage(error, '获取开放平台配置失败');
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

  const handleSave = async (values: WechatOpenFormValues) => {
    setSaving(true);
    try {
      const id = normalizeOptionalText(detail?.id);
      const res = await saveWechatOpenConfig(
        {
          ...(id ? { id } : {}),
          appId: normalizeFormText(values.appId),
          appSecret: normalizeFormText(values.appSecret),
          token: normalizeFormText(values.token),
          encodingAesKey: normalizeFormText(values.encodingAesKey),
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(getApiMessage(res, '保存成功'));
      await loadConfig('refresh');
    } catch (error) {
      console.error('save wechat open config failed:', error);
      message.error(getErrorMessage(error, '保存开放平台配置失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="site-config-page wechat-config-page">
      <section className="content-card site-config-card">
        <div className="site-config-header">
          <div className="site-config-title-block">
            <h2>开放平台配置</h2>
            <span>配置微信开放平台</span>
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
          <PageSectionSkeleton rows={4} />
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
                label="开放平台 AppID"
                name="appId"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入开放平台 AppID"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="开放平台 AppSecret"
                name="appSecret"
              >
                <Input.Password
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入开放平台 AppSecret"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="消息校验 Token"
                name="token"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入消息校验 Token"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="消息加解密 Key"
                name="encodingAesKey"
              >
                <Input.Password
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入消息加解密 Key"
                />
              </Form.Item>
            </div>
            <Form.Item
              className="site-config-submit-row"
              label=" "
              colon={false}
            >
              <PermissionButton
                perm={OPEN_CONFIG_SAVE_PERM}
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

export default WechatOpenConfigPage;
