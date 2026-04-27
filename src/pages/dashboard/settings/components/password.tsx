import { ProForm, ProFormText } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { message } from 'antd';
import React from 'react';
import { emitRouteTabsResetEvent } from '@/api/storage';
import { modifyUserPassword } from '@/api/user';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import {
  clearAuthStorage,
  clearPostLoginRedirect,
  setAuthLogoutMessage,
} from '@/utils/auth-expired';
import {
  clearWorkplaceCommonActionsCache,
  resetStoreScopedInitialState,
} from '@/utils/store-switch';
import useStyles from './index.style';

const PASSWORD_PATTERN = /^[a-zA-Z0-9.*!@#$%^&]{4,16}$/;
const LOGIN_PATH = '/user/login';
const PASSWORD_CHANGED_MESSAGE = '密码已修改，请重新登录。';

type PasswordFormValues = {
  oldPassword?: string;
  newPassword?: string;
};

const PasswordView: React.FC = () => {
  const { styles } = useStyles();
  const { setInitialState } = useModel('@@initialState');

  const logoutAfterPasswordChanged = () => {
    setAuthLogoutMessage(PASSWORD_CHANGED_MESSAGE);
    clearPostLoginRedirect();
    clearAuthStorage();
    clearWorkplaceCommonActionsCache();
    emitRouteTabsResetEvent();
    setInitialState((s) =>
      resetStoreScopedInitialState({
        ...(s || {}),
        currentUser: undefined,
      }),
    );
    history.replace(LOGIN_PATH);
  };

  const handleFinish = async (values: PasswordFormValues) => {
    try {
      const res = await modifyUserPassword(
        {
          oldPassword: String(values.oldPassword || ''),
          newPassword: String(values.newPassword || ''),
        },
        { skipErrorHandler: true },
      );
      message.success(getApiMessage(res, PASSWORD_CHANGED_MESSAGE));
      logoutAfterPasswordChanged();
      return true;
    } catch (error: any) {
      message.error(getErrorMessage(error, '修改密码失败'));
      return false;
    }
  };

  return (
    <div className={styles.baseView}>
      <div className={styles.left}>
        <ProForm
          layout="vertical"
          onFinish={handleFinish}
          submitter={{
            searchConfig: {
              submitText: '修改密码',
            },
            render: (_, dom) => dom[1],
          }}
          hideRequiredMark
        >
          <ProFormText.Password
            width="md"
            name="oldPassword"
            label="旧密码"
            rules={[
              { required: true, message: '请输入旧密码!' },
              {
                pattern: PASSWORD_PATTERN,
                message: '密码需为4-16位字母、数字或特殊字符',
              },
            ]}
            fieldProps={{
              placeholder: '请输入旧密码',
            }}
          />
          <ProFormText.Password
            width="md"
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码!' },
              {
                pattern: PASSWORD_PATTERN,
                message: '密码需为4-16位字母、数字或特殊字符',
              },
            ]}
            fieldProps={{
              placeholder: '请输入新密码',
            }}
          />
        </ProForm>
      </div>
    </div>
  );
};

export default PasswordView;
