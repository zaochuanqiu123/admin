import { UploadOutlined } from '@ant-design/icons';
import { Button, Form, Modal, message, Select, Space, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import React from 'react';
import { resolveUploadAttachmentId } from '@/pages/form/shared/upload';
import { getErrorMessage } from '@/utils/apiMessage';
import './SpeakerImportModal.less';

type SpeakerImportModalProps = {
  open: boolean;
  onCancel: () => void;
  onOk: (values: {
    belongBrand?: string;
    speakerBrand?: string;
    fileId: string;
  }) => Promise<void> | void;
  onDownloadTemplate: () => void;
  belongBrandOptions: { label: string; value: string }[];
  speakerBrandOptions: { label: string; value: string }[];
};

type FormValues = {
  belongBrand?: string;
  speakerBrand?: string;
  fileList?: UploadFile[];
};

function normalizeUploadFileList(
  event: Parameters<NonNullable<UploadProps['onChange']>>[0] | UploadFile[],
) {
  if (Array.isArray(event)) {
    return event.slice(-1);
  }
  return (event?.fileList || []).slice(-1);
}

export const SpeakerImportModal: React.FC<SpeakerImportModalProps> = ({
  open,
  onCancel,
  onOk,
  onDownloadTemplate,
  belongBrandOptions,
  speakerBrandOptions,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = React.useState(false);

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
      await onOk({
        belongBrand: values.belongBrand,
        speakerBrand: values.speakerBrand,
        fileId: await resolveUploadAttachmentId(values.fileList),
      });
    } catch (error) {
      if ((error as any)?.errorFields) {
        return;
      }
      message.error(getErrorMessage(error, '音响入库失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="音响入库"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      confirmLoading={submitting}
      width={560}
      className="speaker-import-modal"
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
          name="belongBrand"
          rules={[{ required: true, message: '请选择所属品牌' }]}
        >
          <Select
            allowClear
            placeholder="请选择"
            options={belongBrandOptions}
          />
        </Form.Item>

        <Form.Item
          label="品牌"
          name="speakerBrand"
          rules={[{ required: true, message: '请选择品牌' }]}
        >
          <Select
            allowClear
            placeholder="请选择"
            options={speakerBrandOptions}
          />
        </Form.Item>

        <Form.Item
          label="数据上传"
          name="fileList"
          valuePropName="fileList"
          getValueFromEvent={normalizeUploadFileList}
          rules={[
            {
              validator: async (_rule, value: UploadFile[] | undefined) => {
                if (!value || value.length === 0) {
                  throw new Error('请上传入库文件');
                }
              },
            },
          ]}
          extra="只支持上传 xls/xlsx"
        >
          <Space size={12} wrap>
            <Upload accept=".xls,.xlsx" beforeUpload={() => false} maxCount={1}>
              <Button type="primary" icon={<UploadOutlined />}>
                选取文件
              </Button>
            </Upload>
            <Button onClick={onDownloadTemplate}>下载 excel 模板</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
