import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch, message } from 'antd';
import React from 'react';
import type { SpeakerChannelRecord } from '@/api/speaker';
import { getErrorMessage } from '@/utils/apiMessage';
import './SpeakerBrandModal.less';

type SpeakerBrandModalProps = {
  open: boolean;
  title: string;
  onCancel: () => void;
  onOk: (values: SpeakerBrandFormValues) => Promise<void> | void;
  belongBrandOptions: { label: string; value: string }[];
  initialValues?: Partial<SpeakerChannelRecord>;
};

export type SpeakerBrandFormValues = {
  belongBrandName?: string;
  name: string;
  code: string;
  config?: string;
  sort?: number;
  state?: boolean;
};

function normalizeInitialValues(
  values?: Partial<SpeakerChannelRecord>,
): Partial<SpeakerBrandFormValues> {
  return {
    belongBrandName:
      String(values?.belongBrandName || values?.brandName || '').trim() ||
      undefined,
    name: String(values?.name || '').trim(),
    code: String(values?.code || '').trim(),
    config: String(values?.config || '').trim() || undefined,
    sort:
      Number(
        values?.sort ?? values?.sortNum ?? values?.orderNum ?? 0,
      ) || 0,
    state: Number(values?.state ?? 1) === 1,
  };
}

export const SpeakerBrandModal: React.FC<SpeakerBrandModalProps> = ({
  open,
  title,
  onCancel,
  onOk,
  belongBrandOptions,
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
      message.error(getErrorMessage(error, '保存音响品牌失败'));
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
          label="所属品牌"
          name="belongBrandName"
          rules={[{ required: true, message: '请选择所属品牌' }]}
        >
          <Select allowClear placeholder="请选择" options={belongBrandOptions} />
        </Form.Item>

        <Form.Item
          label="品牌名称"
          name="name"
          rules={[{ required: true, message: '请输入品牌名称' }]}
        >
          <Input placeholder="请输入品牌名称" />
        </Form.Item>

        <Form.Item
          label="品牌标识"
          name="code"
          rules={[{ required: true, message: '请输入品牌标识' }]}
        >
          <Input placeholder="请输入品牌标识" />
        </Form.Item>

        <Form.Item label="API参数" name="config">
          <Input.TextArea
            rows={3}
            placeholder="请输入 API 参数"
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Form.Item label="排序" required>
          <Space.Compact>
            <Button
              onClick={() => {
                const currentValue = Number(form.getFieldValue('sort') || 0);
                form.setFieldValue('sort', currentValue - 1);
              }}
            >
              -
            </Button>
            <Form.Item name="sort" noStyle initialValue={0}>
              <InputNumber min={-9999} max={9999} controls={false} />
            </Form.Item>
            <Button
              onClick={() => {
                const currentValue = Number(form.getFieldValue('sort') || 0);
                form.setFieldValue('sort', currentValue + 1);
              }}
            >
              +
            </Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item label="是否启用" name="state" valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
