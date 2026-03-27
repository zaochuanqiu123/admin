import { Form, Input, InputNumber, Modal, Radio, Select, message } from 'antd';
import React from 'react';
import { getErrorMessage } from '@/utils/apiMessage';
import './CreateQrCodeModal.less';

type CreateQrCodeModalProps = {
  open: boolean;
  onCancel: () => void;
  onOk: (values: any) => Promise<void> | void;
  templateOptions: { label: string; value: string }[];
};

export const CreateQrCodeModal: React.FC<CreateQrCodeModalProps> = ({
  open,
  onCancel,
  onOk,
  templateOptions,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = React.useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      form.resetFields();
      setSubmitting(false);
    }
  }, [form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onOk(values);
    } catch (error) {
      if ((error as any)?.errorFields) {
        return;
      }
      message.error(getErrorMessage(error, '生成收款码失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="批量生成收款码"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={600}
      className="qr-code-create-modal"
      okText="确定"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 17 }}
        initialValues={{
          bizType: 'RECEIPT_CODE', // Default to 电子码牌/收款码
          openType: 'MINI',
          quantity: 10,
        }}
      >
        <Form.Item
          label="模板"
          name="qrcodeTemplateId"
          rules={[{ required: true, message: '请选择模板' }]}
        >
          <Select placeholder="请选择" options={templateOptions} allowClear />
        </Form.Item>

        <Form.Item
          label="业务类型"
          name="bizType"
          rules={[{ required: true, message: '请选择业务类型' }]}
        >
          <Select
            placeholder="请选择"
            options={[
              { label: '收款码', value: 'RECEIPT_CODE' },
              { label: '餐饮桌台', value: 'CATER_TABLE' },
              { label: '其他业务', value: 'OTHER' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="型号"
          name="model"
          rules={[{ required: true, message: '请输入型号' }]}
        >
          <Input placeholder="请输入型号" />
        </Form.Item>

        <Form.Item
          label="扫码打开方式"
          name="openType"
          rules={[{ required: true, message: '请选择扫码打开方式' }]}
        >
          <Radio.Group>
            <Radio value="MINI">小程序</Radio>
            <Radio value="H5">H5</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="生成数量"
          name="quantity"
          rules={[{ required: true, message: '请输入生成数量' }]}
          extra="生成数量：1 ~ 10000"
        >
          <InputNumber min={1} max={10000} style={{ width: 120 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
