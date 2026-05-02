import { ReloadOutlined } from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import { Alert, Button, Form, Input, message, Space } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  type AlipayWebConfig,
  getAlipayWebConfig,
  saveAlipayWebConfig,
} from '@/api/alipayConfig';
import { PageSectionSkeleton, PermissionButton } from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import '../wechat-config.less';

const ALIPAY_WEB_CONFIG_SAVE_PERM = 'alipay:alipayWebConfig:saveConfig';

type AlipayWebFormValues = {
  name?: string;
  appid?: string;
  alipayPublicKey?: string;
  appPublicKey?: string;
  appPrivateKey?: string;
};

function normalizeFormText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeFormText(value);
  return text || undefined;
}

function buildAlipayWebFormValues(detail?: AlipayWebConfig | null) {
  return {
    name: normalizeFormText(detail?.name),
    appid: normalizeFormText(detail?.appid),
    alipayPublicKey: normalizeFormText(detail?.alipayPublicKey),
    appPublicKey: normalizeFormText(detail?.appPublicKey),
    appPrivateKey: normalizeFormText(detail?.appPrivateKey),
  };
}

const AlipayWebConfigPage = () => {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const [form] = Form.useForm<AlipayWebFormValues>();
  const [detail, setDetail] = useState<AlipayWebConfig>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const canSave = Boolean(access?.hasButtonPerm?.(ALIPAY_WEB_CONFIG_SAVE_PERM));

  const loadConfig = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      }
      setLoadError(undefined);

      try {
        const res = await getAlipayWebConfig({
          skipErrorHandler: true,
        });
        const nextDetail = res || {};
        setDetail(nextDetail);
        form.setFieldsValue(buildAlipayWebFormValues(nextDetail));
      } catch (error) {
        console.error('load alipay web config failed:', error);
        const errorMessage = getErrorMessage(error, '获取支付宝网页配置失败');
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

  const handleSave = async (values: AlipayWebFormValues) => {
    setSaving(true);
    try {
      const id = normalizeOptionalText(detail?.id);
      const res = await saveAlipayWebConfig(
        {
          ...(id ? { id } : {}),
          name: normalizeFormText(values.name),
          appid: normalizeFormText(values.appid),
          alipayPublicKey: normalizeFormText(values.alipayPublicKey),
          appPublicKey: normalizeFormText(values.appPublicKey),
          appPrivateKey: normalizeFormText(values.appPrivateKey),
        },
        {
          skipErrorHandler: true,
        },
      );
      message.success(getApiMessage(res, '保存成功'));
      await loadConfig('refresh');
    } catch (error) {
      console.error('save alipay web config failed:', error);
      message.error(getErrorMessage(error, '保存支付宝网页配置失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="site-config-page alipay-web-config-page">
      <section className="content-card site-config-card">
        <div className="site-config-header">
          <div className="site-config-title-block">
            <h2>支付宝网页配置</h2>
            <span>配置支付宝网页应用基础参数</span>
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
          <PageSectionSkeleton rows={5} />
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
                label="配置名称"
                name="name"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入配置名称"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="AppID"
                name="appid"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder="请输入 AppID"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="支付宝公钥"
                name="alipayPublicKey"
              >
                <Input.TextArea
                  allowClear
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  disabled={!canSave}
                  placeholder="请输入支付宝公钥"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="应用公钥"
                name="appPublicKey"
              >
                <Input.TextArea
                  allowClear
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  disabled={!canSave}
                  placeholder="请输入应用公钥"
                />
              </Form.Item>
              <Form.Item
                className="site-config-form-item"
                label="应用私钥"
                name="appPrivateKey"
              >
                <Input.TextArea
                  allowClear
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  disabled={!canSave}
                  placeholder="请输入应用私钥"
                />
              </Form.Item>
            </div>
            <Form.Item
              className="site-config-submit-row"
              label=" "
              colon={false}
            >
              <PermissionButton
                perm={ALIPAY_WEB_CONFIG_SAVE_PERM}
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

export default AlipayWebConfigPage;
