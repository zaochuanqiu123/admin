import { Form, Input, Modal, message } from 'antd';
import React from 'react';
import type { QrCodeBindParams } from '@/api/qrCode';
import { getErrorMessage } from '@/utils/apiMessage';
import './BindQrCodeModal.less';

type BindQrCodeModalProps = {
  open: boolean;
  onCancel: () => void;
  onOk: (values: QrCodeBindParams) => Promise<void> | void;
};

type FormValues = {
  sn?: string;
  storeOrgId?: string;
  bindName?: string;
  bindRemark?: string;
};

export const BindQrCodeModal: React.FC<BindQrCodeModalProps> = ({
  open,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    form.resetFields();
    setSubmitting(false);
  }, [form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onOk({
        sn: String(values.sn || '').trim() || undefined,
        storeOrgId: String(values.storeOrgId || '').trim() || undefined,
        bindName: String(values.bindName || '').trim() || undefined,
        bindRemark: String(values.bindRemark || '').trim() || undefined,
      });
    } catch (error) {
      if ((error as any)?.errorFields) {
        return;
      }
      message.error(getErrorMessage(error, '绑定收款码失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="绑定收款码"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      confirmLoading={submitting}
      width={640}
      className="qr-code-bind-modal"
      destroyOnClose
    >
      <div className="bind-form-card">
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ flex: '96px' }}
          wrapperCol={{ flex: 'auto' }}
        >
          <Form.Item
            label="二维码编号"
            name="sn"
            rules={[{ required: true, message: '请输入收款码编号' }]}
          >
            <Input placeholder="请输入收款码编号" allowClear />
          </Form.Item>

          <Form.Item
            label="门店组织ID"
            name="storeOrgId"
            rules={[{ required: true, message: '请输入门店组织ID' }]}
          >
            <Input placeholder="请输入门店组织ID" allowClear />
          </Form.Item>

          <Form.Item label="绑定名称" name="bindName">
            <Input placeholder="请输入绑定名称" allowClear />
          </Form.Item>

          <Form.Item label="绑定备注" name="bindRemark">
            <Input.TextArea
              placeholder="请输入绑定备注"
              autoSize={{ minRows: 3, maxRows: 5 }}
              allowClear
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
