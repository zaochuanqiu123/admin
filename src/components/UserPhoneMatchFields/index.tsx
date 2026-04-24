import type { FormInstance } from 'antd';
import { Button, Form, Input, message } from 'antd';
import { useState } from 'react';
import { type SearchUserResult, searchUserByPhone } from '@/api/user';
import { getErrorMessage } from '@/utils/apiMessage';
import './index.less';

export type UserPhoneMatchStatus = 'idle' | 'matched' | 'new';

type UserPhoneMatchFieldsProps = {
  form: FormInstance;
  status: UserPhoneMatchStatus;
  matchedUser?: SearchUserResult;
  onStatusChange: (status: UserPhoneMatchStatus) => void;
  onMatchedUserChange: (user?: SearchUserResult) => void;
  phoneName: string;
  nameName: string;
  nickNameName: string;
  passwordName: string;
  confirmPasswordName: string;
  phoneLabel?: string;
  phonePlaceholder?: string;
  matchedMessage?: string;
  newMessage?: string;
  nameLabel?: string;
  matchedNameLabel?: string;
  nickNameLabel?: string;
  passwordLabel?: string;
  confirmPasswordLabel?: string;
  phoneRequiredMessage?: string;
  phoneInvalidMessage?: string;
  nameRequiredMessage?: string;
  nickNameRequiredMessage?: string;
  passwordRequiredMessage?: string;
  confirmPasswordRequiredMessage?: string;
};

function isValidMainlandPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

export default function UserPhoneMatchFields({
  form,
  status,
  matchedUser,
  onStatusChange,
  onMatchedUserChange,
  phoneName,
  nameName,
  nickNameName,
  passwordName,
  confirmPasswordName,
  phoneLabel = '手机号',
  phonePlaceholder = '请输入手机号',
  matchedMessage = '已匹配到现有用户。',
  newMessage = '未匹配到现有用户，请补充信息并创建新账号。',
  nameLabel = '姓名',
  matchedNameLabel = '用户姓名',
  nickNameLabel = '昵称',
  passwordLabel = '密码',
  confirmPasswordLabel = '确认密码',
  phoneRequiredMessage = '请输入手机号',
  phoneInvalidMessage = '请输入11位手机号',
  nameRequiredMessage = '请输入姓名',
  nickNameRequiredMessage = '请输入昵称',
  passwordRequiredMessage = '请输入登录密码',
  confirmPasswordRequiredMessage = '请输入确认密码',
}: UserPhoneMatchFieldsProps) {
  const [searching, setSearching] = useState(false);
  const phone = Form.useWatch(phoneName, form) || '';

  const clearAccountFields = () => {
    form.setFieldsValue({
      [nameName]: undefined,
      [nickNameName]: undefined,
      [passwordName]: undefined,
      [confirmPasswordName]: undefined,
    });
  };

  const resetMatchState = () => {
    onStatusChange('idle');
    onMatchedUserChange(undefined);
    clearAccountFields();
  };

  const handleSearchUser = async () => {
    const nextPhone = String(form.getFieldValue(phoneName) || '').trim();
    if (!isValidMainlandPhone(nextPhone)) {
      message.warning(phoneInvalidMessage);
      return;
    }
    setSearching(true);
    try {
      const res = await searchUserByPhone(nextPhone, {
        skipErrorHandler: true,
      });
      clearAccountFields();
      if (String(res?.id || '').trim()) {
        onMatchedUserChange(res);
        onStatusChange('matched');
        message.success('已匹配到现有用户');
        return;
      }
      onMatchedUserChange(undefined);
      onStatusChange('new');
      message.info('未匹配到用户，请补充账号信息');
    } catch (error) {
      onMatchedUserChange(undefined);
      onStatusChange('idle');
      message.error(getErrorMessage(error, '查询用户失败'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <Form.Item label={phoneLabel} required>
        <div className="user-phone-match-search">
          <Form.Item
            name={phoneName}
            className="user-phone-match-inline-form-item"
            normalize={(value) =>
              String(value || '')
                .replace(/[^\d]/g, '')
                .slice(0, 11)
            }
            rules={[
              { required: true, message: phoneRequiredMessage },
              {
                validator: async (_rule, value: string | undefined) => {
                  if (!value || isValidMainlandPhone(value)) return;
                  throw new Error(phoneInvalidMessage);
                },
              },
            ]}
          >
            <Input
              placeholder={phonePlaceholder}
              maxLength={11}
              onChange={() => resetMatchState()}
              onPressEnter={() => void handleSearchUser()}
            />
          </Form.Item>
          <Button
            type="primary"
            loading={searching}
            onClick={() => void handleSearchUser()}
          >
            匹配
          </Button>
        </div>
      </Form.Item>
      {status === 'matched' ? (
        <>
          <Form.Item label=" " colon={false}>
            <div className="user-phone-match-banner matched">
              {matchedMessage}
            </div>
          </Form.Item>
          <Form.Item label={matchedNameLabel}>
            <Input value={String(matchedUser?.name || '-')} disabled />
          </Form.Item>
          <Form.Item label={phoneLabel}>
            <Input value={String(matchedUser?.phone || phone)} disabled />
          </Form.Item>
          <Form.Item
            label={nickNameLabel}
            name={nickNameName}
            rules={[{ required: true, message: nickNameRequiredMessage }]}
          >
            <Input placeholder={`请输入${nickNameLabel}`} />
          </Form.Item>
        </>
      ) : null}
      {status === 'new' ? (
        <>
          <Form.Item label=" " colon={false}>
            <div className="user-phone-match-banner warning">{newMessage}</div>
          </Form.Item>
          <Form.Item label={phoneLabel}>
            <Input value={phone} disabled />
          </Form.Item>
          <Form.Item
            label={nameLabel}
            name={nameName}
            rules={[{ required: true, message: nameRequiredMessage }]}
          >
            <Input placeholder={`请输入${nameLabel}`} />
          </Form.Item>
          <Form.Item
            label={nickNameLabel}
            name={nickNameName}
            rules={[{ required: true, message: nickNameRequiredMessage }]}
          >
            <Input placeholder={`请输入${nickNameLabel}`} />
          </Form.Item>
          <Form.Item
            label={passwordLabel}
            name={passwordName}
            rules={[{ required: true, message: passwordRequiredMessage }]}
          >
            <Input.Password placeholder="请输入登录密码" />
          </Form.Item>
          <Form.Item
            label={confirmPasswordLabel}
            name={confirmPasswordName}
            dependencies={[passwordName]}
            rules={[
              { required: true, message: confirmPasswordRequiredMessage },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue(passwordName) === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入登录密码" />
          </Form.Item>
        </>
      ) : null}
    </>
  );
}
