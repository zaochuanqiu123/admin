import { Form, Input, Modal, message, Switch } from 'antd';
import React from 'react';
import type { SpeakerChannelRecord } from '@/api/speaker';
import { getErrorMessage } from '@/utils/apiMessage';
import './SpeakerBrandModal.less';

type SpeakerBrandModalProps = {
  open: boolean;
  title: string;
  onCancel: () => void;
  onOk: (values: SpeakerBrandFormValues) => Promise<void> | void;
  initialValues?: Partial<SpeakerChannelRecord>;
};

export type SpeakerBrandFormValues = {
  name: string;
  code: string;
  logo?: string;
  remark?: string;
  config: string;
  state?: boolean;
};

function normalizeInitialValues(
  values?: Partial<SpeakerChannelRecord>,
): Partial<SpeakerBrandFormValues> {
  return {
    name: String(values?.name || '').trim(),
    code: String(values?.code || '').trim(),
    logo: String(values?.logo || '').trim() || undefined,
    remark: String(values?.remark || '').trim() || undefined,
    config: String(values?.config || '').trim(),
    state: Number(values?.state ?? 1) === 1,
  };
}

export const SpeakerBrandModal: React.FC<SpeakerBrandModalProps> = ({
  open,
  title,
  onCancel,
  onOk,
  initialValues,
}) => {
  const [form] = Form.useForm<SpeakerBrandFormValues>();
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(normalizeInitialValues(initialValues));
    setSubmitting(false);
  }, [form, initialValues, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onOk(values);
    } catch (error) {
      if ((error as any)?.errorFields) {
        return;
      }
      message.error(getErrorMessage(error, '保存音响通道失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      confirmLoading={submitting}
      width={560}
      className="speaker-brand-modal"
      destroyOnClose
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ flex: '84px' }}
        wrapperCol={{ flex: 'auto' }}
      >
        <Form.Item
          label="通道名称"
          name="name"
          rules={[{ required: true, message: '请输入通道名称' }]}
        >
          <Input placeholder="请输入通道名称" />
        </Form.Item>

        <Form.Item
          label="通道编码"
          name="code"
          rules={[{ required: true, message: '请输入通道编码' }]}
        >
          <Input placeholder="请输入通道编码" />
        </Form.Item>

        <Form.Item label="通道LOGO" name="logo">
          <Input placeholder="请输入通道LOGO" />
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <Input.TextArea
            rows={2}
            placeholder="请输入备注"
            showCount
            maxLength={200}
          />
        </Form.Item>

        <Form.Item
          label="通道配置"
          name="config"
          rules={[{ required: true, message: '请输入通道配置' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder='请输入通道配置，例如：{"appKey":"xxx","appSecret":"yyy"}'
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Form.Item label="是否启用" name="state" valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
