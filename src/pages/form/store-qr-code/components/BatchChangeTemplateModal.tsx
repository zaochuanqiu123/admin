import { Form, Input, Modal, Radio, Select, Space, message } from 'antd';
import React from 'react';
import type { QrCodeChangeTemplateParams } from '@/api/qrCode';
import { getErrorMessage } from '@/utils/apiMessage';
import './BatchChangeTemplateModal.less';

type BatchChangeTemplateModalProps = {
  open: boolean;
  onCancel: () => void;
  onOk: (values: QrCodeChangeTemplateParams) => Promise<void> | void;
  templateOptions: { label: string; value: string }[];
};

type FormValues = {
  operationType: QrCodeChangeTemplateParams['operationType'];
  snInput?: string;
  startSn?: string;
  endSn?: string;
  batchSn?: string;
  qrcodeTemplateId?: string;
};

export const BatchChangeTemplateModal: React.FC<BatchChangeTemplateModalProps> = ({
  open,
  onCancel,
  onOk,
  templateOptions,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = React.useState(false);
  const operationType = Form.useWatch('operationType', form) || 'SN_LIST';

  React.useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        operationType: 'SN_LIST',
      });
      setSubmitting(false);
    }
  }, [form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: QrCodeChangeTemplateParams = {
        operationType: values.operationType,
        qrcodeTemplateId: String(values.qrcodeTemplateId || '').trim(),
      };

      if (values.operationType === 'SN_LIST') {
        payload.snList = String(values.snInput || '')
          .split(/[\n,，]+/)
          .map((item) => item.trim())
          .filter(Boolean);
      }

      if (values.operationType === 'SN_RANGE') {
        payload.startSn = String(values.startSn || '').trim();
        payload.endSn = String(values.endSn || '').trim();
      }

      if (values.operationType === 'BATCH_SN') {
        payload.batchSn = String(values.batchSn || '').trim();
      }

      setSubmitting(true);
      await onOk(payload);
    } catch (error) {
      if ((error as any)?.errorFields) {
        return;
      }
      message.error(getErrorMessage(error, '批量修改模板失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="批量修改模板"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      confirmLoading={submitting}
      width={720}
      className="qr-code-batch-template-modal"
      destroyOnClose
    >
      <div className="batch-template-form-card">
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ flex: '88px' }}
          wrapperCol={{ flex: 'auto' }}
          initialValues={{
            operationType: 'SN_LIST',
          }}
        >
          <Form.Item
            label="修改方式"
            name="operationType"
            className="batch-template-mode-item"
          >
            <Radio.Group>
              <Radio value="SN_LIST">自定义编号</Radio>
              <Radio value="SN_RANGE">按编号区间</Radio>
              <Radio value="BATCH_SN">按批次号</Radio>
            </Radio.Group>
          </Form.Item>

          {operationType === 'SN_LIST' && (
            <Form.Item
              label="自定义编号"
              name="snInput"
              rules={[
                { required: true, message: '请输入自定义编号' },
                {
                  validator: async (_, value) => {
                    const snList = String(value || '')
                      .split(/[\n,，]+/)
                      .map((item) => item.trim())
                      .filter(Boolean);
                    if (!snList.length) {
                      throw new Error('请输入至少一个编号');
                    }
                  },
                },
              ]}
            >
              <Input placeholder="多个用英文,隔开" allowClear />
            </Form.Item>
          )}

          {operationType === 'SN_RANGE' && (
            <Form.Item label="编号区间" required className="batch-template-range-item">
              <Space.Compact block>
                <Form.Item
                  name="startSn"
                  noStyle
                  rules={[{ required: true, message: '请输入起始编号' }]}
                >
                  <Input placeholder="请输入起始编号" allowClear />
                </Form.Item>
                <Input className="batch-template-range-separator" value="-" disabled />
                <Form.Item
                  name="endSn"
                  noStyle
                  rules={[{ required: true, message: '请输入结束编号' }]}
                >
                  <Input placeholder="请输入结束编号" allowClear />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
          )}

          {operationType === 'BATCH_SN' && (
            <Form.Item
              label="批次号"
              name="batchSn"
              rules={[{ required: true, message: '请输入批次号' }]}
            >
              <Input placeholder="请输入批次号" allowClear />
            </Form.Item>
          )}

          <Form.Item
            label="新模板"
            name="qrcodeTemplateId"
            rules={[{ required: true, message: '请选择新模板' }]}
          >
            <Select placeholder="请选择" options={templateOptions} allowClear />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
