import {
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Radio,
  Select,
  Spin,
  Switch,
} from 'antd';
import React from 'react';
import type { QrCodeRecord } from '@/api/qrCode';
import {
  getReceiptCodeRuleByQrcode,
  type ReceiptCodeRuleDetail,
  type ReceiptCodeRuleQrcodeParams,
  type ReceiptCodeRuleSetByQrcodeParams,
  setReceiptCodeRuleByQrcode,
} from '@/api/receiptCodeRules';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';

type ReceiptCodeRuleModalProps = {
  open: boolean;
  record?: QrCodeRecord;
  onCancel: () => void;
  onSuccess?: () => Promise<void> | void;
};

type FormValues = {
  amountMode?: 'INPUT' | 'FIXED';
  fixedAmount?: number | null;
  isServiceFee?: boolean;
  serviceFeeType?: 'PERCENT' | 'FIXED';
  serviceFeePercent?: number | null;
  serviceFeeFixed?: number | null;
  minPayAmount?: number | null;
  maxPayAmount?: number | null;
  limitPay?: 'NONE' | 'NO_CREDIT';
  remarkRequired?: boolean;
  phoneRequired?: boolean;
  goodsDesc?: string;
};

const amountModeValues = ['INPUT', 'FIXED'] as const;
const serviceFeeTypeValues = ['PERCENT', 'FIXED'] as const;
const limitPayValues = ['NONE', 'NO_CREDIT'] as const;

const amountModeOptions = [
  { label: '用户输入', value: 'INPUT' },
  { label: '固定金额', value: 'FIXED' },
];

const serviceFeeTypeOptions = [
  { label: '百分比', value: 'PERCENT' },
  { label: '固定金额', value: 'FIXED' },
];

const limitPayOptions = [
  { label: '不限制', value: 'NONE' },
  { label: '禁用贷记卡', value: 'NO_CREDIT' },
];

function readText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function getQrcodeIdentity(
  record?: QrCodeRecord,
  detail?: ReceiptCodeRuleDetail,
): ReceiptCodeRuleQrcodeParams {
  const qrcodeId = readText(detail?.qrcodeId, record?.id);
  const qrcodeSn = readText(detail?.qrcodeSn, record?.qrcodeSn, record?.sn);

  if (qrcodeId) {
    return { qrcodeId };
  }
  if (qrcodeSn) {
    return { qrcodeSn };
  }
  return {};
}

function normalizeEnum<T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback: T[number],
) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return options.includes(normalized) ? (normalized as T[number]) : fallback;
}

function toOptionalNumber(value?: number | null) {
  if (value === undefined || value === null) return undefined;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? undefined : numberValue;
}

function buildFormValues(detail?: ReceiptCodeRuleDetail): FormValues {
  return {
    amountMode: normalizeEnum(detail?.amountMode, amountModeValues, 'INPUT'),
    fixedAmount: detail?.fixedAmount ?? null,
    isServiceFee: Number(detail?.isServiceFee || 0) === 1,
    serviceFeeType: normalizeEnum(
      detail?.serviceFeeType,
      serviceFeeTypeValues,
      'PERCENT',
    ),
    serviceFeePercent: detail?.serviceFeePercent ?? null,
    serviceFeeFixed: detail?.serviceFeeFixed ?? null,
    minPayAmount: detail?.minPayAmount ?? null,
    maxPayAmount: detail?.maxPayAmount ?? null,
    limitPay: normalizeEnum(detail?.limitPay, limitPayValues, 'NONE'),
    remarkRequired: Number(detail?.remarkRequired || 0) === 1,
    phoneRequired: Number(detail?.phoneRequired || 0) === 1,
    goodsDesc: readText(detail?.goodsDesc),
  };
}

export const ReceiptCodeRuleModal: React.FC<ReceiptCodeRuleModalProps> = ({
  open,
  record,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [detail, setDetail] = React.useState<ReceiptCodeRuleDetail>();
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string>();
  const amountMode = Form.useWatch('amountMode', form) || 'INPUT';
  const isServiceFee = Form.useWatch('isServiceFee', form);
  const serviceFeeType = Form.useWatch('serviceFeeType', form) || 'PERCENT';
  const qrcodeSn = readText(record?.qrcodeSn, record?.sn);

  React.useEffect(() => {
    if (!open) {
      form.resetFields();
      setDetail(undefined);
      setLoadError(undefined);
      setLoading(false);
      setSubmitting(false);
      return;
    }

    const identity = getQrcodeIdentity(record);
    if (!identity.qrcodeId && !identity.qrcodeSn) {
      setLoadError('缺少二维码标识，无法获取配置规则');
      form.setFieldsValue(buildFormValues());
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(undefined);
    getReceiptCodeRuleByQrcode(identity, { skipErrorHandler: true })
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
        form.setFieldsValue(buildFormValues(res));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('getReceiptCodeRuleByQrcode failed:', error);
        const errorMessage = getErrorMessage(error, '获取配置规则失败');
        setLoadError(errorMessage);
        form.setFieldsValue(buildFormValues());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form, open, record?.id, record?.qrcodeSn, record?.sn]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const minPayAmount = toOptionalNumber(values.minPayAmount);
      const maxPayAmount = toOptionalNumber(values.maxPayAmount);

      if (
        minPayAmount !== undefined &&
        maxPayAmount !== undefined &&
        minPayAmount > maxPayAmount
      ) {
        form.setFields([
          {
            name: 'maxPayAmount',
            errors: ['最大支付金额不能小于最小支付金额'],
          },
        ]);
        return;
      }

      const identity = getQrcodeIdentity(record, detail);
      if (!identity.qrcodeId && !identity.qrcodeSn) {
        message.error('缺少二维码标识，无法保存配置规则');
        return;
      }

      const payload: ReceiptCodeRuleSetByQrcodeParams = {
        ...identity,
        amountMode: values.amountMode || 'INPUT',
        fixedAmount:
          values.amountMode === 'FIXED'
            ? toOptionalNumber(values.fixedAmount)
            : undefined,
        isServiceFee: values.isServiceFee ? 1 : 0,
        serviceFeeType: values.isServiceFee ? values.serviceFeeType : undefined,
        serviceFeePercent:
          values.isServiceFee && values.serviceFeeType === 'PERCENT'
            ? toOptionalNumber(values.serviceFeePercent)
            : undefined,
        serviceFeeFixed:
          values.isServiceFee && values.serviceFeeType === 'FIXED'
            ? toOptionalNumber(values.serviceFeeFixed)
            : undefined,
        minPayAmount,
        maxPayAmount,
        limitPay: values.limitPay || 'NONE',
        remarkRequired: values.remarkRequired ? 1 : 0,
        phoneRequired: values.phoneRequired ? 1 : 0,
        goodsDesc: String(values.goodsDesc ?? '').trim(),
      };

      setSubmitting(true);
      const res = await setReceiptCodeRuleByQrcode(payload, {
        skipErrorHandler: true,
      });
      message.success(getApiMessage(res, '配置规则保存成功'));
      await onSuccess?.();
    } catch (error) {
      if ((error as any)?.errorFields) {
        return;
      }
      message.error(getErrorMessage(error, '配置规则保存失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="配置规则"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      width={760}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {loadError ? (
          <Alert
            type="error"
            showIcon
            message={loadError}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ flex: '116px' }}
          wrapperCol={{ flex: 'auto' }}
          initialValues={buildFormValues()}
        >
          <Form.Item label="二维码编号">
            <Input value={qrcodeSn || '-'} disabled />
          </Form.Item>

          <Form.Item
            label="金额模式"
            name="amountMode"
            rules={[{ required: true, message: '请选择金额模式' }]}
          >
            <Radio.Group options={amountModeOptions} />
          </Form.Item>

          {amountMode === 'FIXED' ? (
            <Form.Item
              label="固定金额"
              name="fixedAmount"
              rules={[{ required: true, message: '请输入固定金额' }]}
            >
              <InputNumber
                min={0.01}
                max={99999999.99}
                precision={2}
                addonAfter="元"
                style={{ width: '100%' }}
              />
            </Form.Item>
          ) : null}

          <Form.Item
            label="收取服务费"
            name="isServiceFee"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          {isServiceFee ? (
            <>
              <Form.Item
                label="服务费类型"
                name="serviceFeeType"
                rules={[{ required: true, message: '请选择服务费类型' }]}
              >
                <Radio.Group options={serviceFeeTypeOptions} />
              </Form.Item>

              {serviceFeeType === 'PERCENT' ? (
                <Form.Item
                  label="服务费百分比"
                  name="serviceFeePercent"
                  rules={[{ required: true, message: '请输入服务费百分比' }]}
                >
                  <InputNumber
                    min={0.0001}
                    max={100}
                    precision={4}
                    addonAfter="%"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  label="固定服务费"
                  name="serviceFeeFixed"
                  rules={[{ required: true, message: '请输入固定服务费' }]}
                >
                  <InputNumber
                    min={0.01}
                    max={99999999.99}
                    precision={2}
                    addonAfter="元"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              )}
            </>
          ) : null}

          <Form.Item label="最小支付金额" name="minPayAmount">
            <InputNumber
              min={0.01}
              max={99999999.99}
              precision={2}
              addonAfter="元"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="最大支付金额" name="maxPayAmount">
            <InputNumber
              min={0.01}
              max={99999999.99}
              precision={2}
              addonAfter="元"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="限制支付"
            name="limitPay"
            rules={[{ required: true, message: '请选择限制支付' }]}
          >
            <Select options={limitPayOptions} />
          </Form.Item>

          <Form.Item
            label="付款备注"
            name="remarkRequired"
            valuePropName="checked"
          >
            <Switch checkedChildren="必填" unCheckedChildren="选填" />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phoneRequired"
            valuePropName="checked"
          >
            <Switch checkedChildren="必填" unCheckedChildren="选填" />
          </Form.Item>

          <Form.Item label="商品描述" name="goodsDesc">
            <Input.TextArea
              allowClear
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="请输入微信/支付宝账单中的商品描述"
            />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};
