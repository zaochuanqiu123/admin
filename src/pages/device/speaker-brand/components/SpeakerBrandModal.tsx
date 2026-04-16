import { PlusOutlined } from '@ant-design/icons';
import { Form, Input, Modal, message, Switch, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import React from 'react';
import type { SpeakerChannelRecord } from '@/api/speaker';
import {
  createRemoteUploadFileList,
  imageUploadRequest,
  normalizeUploadFileList,
  resolveUploadAttachmentId,
} from '@/pages/form/shared/upload';
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
  logoFileList?: UploadFile[];
  remark?: string;
  config: string;
  state?: boolean;
};

function readText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) {
      return text;
    }
  }
  return '';
}

function getSpeakerChannelLogoId(values?: Partial<SpeakerChannelRecord>) {
  const logo = String(values?.logo || '').trim();
  return readText(
    values?.logoId,
    values?.logoAttachmentId,
    values?.logoAttachment?.id,
    values?.attachment?.id,
    /^https?:\/\//i.test(logo) ? '' : logo,
  );
}

function getSpeakerChannelLogoUrl(values?: Partial<SpeakerChannelRecord>) {
  const logo = String(values?.logo || '').trim();
  return readText(
    values?.logoUrl,
    values?.logoImageUrl,
    values?.logoAttachmentUrl,
    values?.logoAttachment?.url,
    values?.attachment?.url,
    /^https?:\/\//i.test(logo) ? logo : '',
  );
}

function normalizeInitialValues(
  values?: Partial<SpeakerChannelRecord>,
): Partial<SpeakerBrandFormValues> {
  const logoId = getSpeakerChannelLogoId(values);
  const logoUrl = getSpeakerChannelLogoUrl(values);
  return {
    name: String(values?.name || '').trim(),
    code: String(values?.code || '').trim(),
    logo: logoId || undefined,
    logoFileList: createRemoteUploadFileList(logoUrl, 'speaker-logo'),
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
      const logo = await resolveUploadAttachmentId(
        values.logoFileList,
        getSpeakerChannelLogoId(initialValues),
      );
      setSubmitting(true);
      await onOk({
        ...values,
        logo,
      });
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

        <Form.Item
          label="通道LOGO"
          name="logoFileList"
          valuePropName="fileList"
          getValueFromEvent={normalizeUploadFileList}
        >
          <Upload
            accept="image/*"
            customRequest={imageUploadRequest}
            maxCount={1}
            listType="picture-card"
            className="speaker-brand-logo-upload"
          >
            <div className="speaker-brand-logo-upload__trigger">
              <PlusOutlined />
              <span>上传图片</span>
            </div>
          </Upload>
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
