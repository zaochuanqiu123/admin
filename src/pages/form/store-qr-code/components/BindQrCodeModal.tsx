import { Form, Input, Modal, message, Select } from 'antd';
import React from 'react';
import { getCurrentMerchantStoreList, type OrgRecord } from '@/api/org';
import type { QrCodeBindParams } from '@/api/qrCode';
import { getErrorMessage } from '@/utils/apiMessage';
import './BindQrCodeModal.less';

export type StoreOrgIdInputMode = 'hidden' | 'merchantSelect' | 'manual';

type BindQrCodeModalProps = {
  open: boolean;
  storeOrgIdInputMode?: StoreOrgIdInputMode;
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
  storeOrgIdInputMode = 'manual',
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = React.useState(false);
  const [storeOptions, setStoreOptions] = React.useState<OrgRecord[]>([]);
  const [storeLoading, setStoreLoading] = React.useState(false);
  const shouldShowStoreOrgId = storeOrgIdInputMode !== 'hidden';
  const shouldUseMerchantStoreSelect = storeOrgIdInputMode === 'merchantSelect';

  React.useEffect(() => {
    if (!open) return;
    form.resetFields();
    setSubmitting(false);
  }, [form, open]);

  React.useEffect(() => {
    if (!open || !shouldUseMerchantStoreSelect) return;

    let cancelled = false;

    const loadStoreOptions = async () => {
      setStoreLoading(true);
      try {
        const res = await getCurrentMerchantStoreList({
          skipErrorHandler: true,
        });
        if (!cancelled) {
          setStoreOptions(Array.isArray(res) ? res : []);
        }
      } catch (error) {
        if (!cancelled) {
          setStoreOptions([]);
          message.error(getErrorMessage(error, '获取门店列表失败'));
        }
      } finally {
        if (!cancelled) {
          setStoreLoading(false);
        }
      }
    };

    void loadStoreOptions();

    return () => {
      cancelled = true;
    };
  }, [open, shouldUseMerchantStoreSelect]);

  const storeSelectOptions = React.useMemo(
    () =>
      storeOptions
        .map((item) => {
          const value = String(item?.id || '').trim();
          if (!value) return null;
          const orgName = String(item?.orgName || '').trim();
          const orgCode = String(item?.orgCode || '').trim();
          return {
            label: orgCode
              ? `${orgName || value}（${orgCode}）`
              : orgName || value,
            value,
          };
        })
        .filter(Boolean) as Array<{ label: string; value: string }>,
    [storeOptions],
  );

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: QrCodeBindParams = {
        sn: String(values.sn || '').trim() || undefined,
        bindName: String(values.bindName || '').trim() || undefined,
        bindRemark: String(values.bindRemark || '').trim() || undefined,
      };
      if (shouldShowStoreOrgId) {
        const storeOrgId = String(values.storeOrgId || '').trim();
        if (storeOrgId) {
          payload.storeOrgId = storeOrgId;
        }
      }
      setSubmitting(true);
      await onOk(payload);
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

          {shouldUseMerchantStoreSelect ? (
            <Form.Item
              label="门店"
              name="storeOrgId"
              rules={[{ required: true, message: '请选择门店' }]}
            >
              <Select
                allowClear
                showSearch
                loading={storeLoading}
                placeholder="请选择门店"
                options={storeSelectOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          ) : shouldShowStoreOrgId ? (
            <Form.Item
              label="门店组织ID"
              name="storeOrgId"
              rules={[{ required: true, message: '请输入门店组织ID' }]}
            >
              <Input placeholder="请输入门店组织ID" allowClear />
            </Form.Item>
          ) : null}

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
