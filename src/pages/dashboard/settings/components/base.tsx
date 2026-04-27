import { UploadOutlined } from '@ant-design/icons';
import { ProForm, ProFormText } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button, Form, message, Upload } from 'antd';
import React from 'react';
import { uploadAttachment } from '@/api/cloudStorage';
import { setLoginUserInfo } from '@/api/storage';
import { editUserInfo, getUserInfo, type UserInfoResult } from '@/api/user';
import useStyles from './index.style';

const normalizeDisplayText = (value?: unknown) => String(value || '').trim();

const isAvatarDisplaySrc = (avatar?: unknown) => {
  const value = normalizeDisplayText(avatar);
  if (!value) return false;
  return (
    /^(https?:)?\/\//.test(value) ||
    /^(data|blob):/.test(value) ||
    value.startsWith('/')
  );
};

type BasicInfoFormValues = {
  account?: string;
  name?: string;
  nickName?: string;
  avatar?: string;
};

const mapUserInfoToCurrentUser = (
  userInfo: UserInfoResult,
  currentUser?: API.CurrentUser,
) => ({
  ...(currentUser || {}),
  userid: userInfo.account ?? currentUser?.userid,
  account: userInfo.account ?? currentUser?.account,
  name: userInfo.name ?? currentUser?.name,
  nickName: userInfo.nickName ?? currentUser?.nickName,
  avatar: userInfo.avatar ?? currentUser?.avatar,
  avatarUrl: userInfo.avatarUrl ?? (currentUser as any)?.avatarUrl,
  phone: userInfo.phone ?? currentUser?.phone,
});

const BaseView: React.FC = () => {
  const { styles } = useStyles();
  const { initialState, setInitialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as API.CurrentUser | undefined;
  const [form] = Form.useForm<BasicInfoFormValues>();
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [avatarPreview, setAvatarPreview] = React.useState('');
  const avatarObjectUrlRef = React.useRef<string | undefined>(undefined);
  const loading = false;

  React.useEffect(() => {
    const account = normalizeDisplayText(currentUser?.account);
    const name = normalizeDisplayText(currentUser?.name);
    const nickName = normalizeDisplayText(
      currentUser?.nickName || (currentUser as any)?.nickname,
    );
    const avatar = normalizeDisplayText(currentUser?.avatar);
    const nextAvatarPreview = normalizeDisplayText(
      (currentUser as any)?.avatarUrl ||
        (isAvatarDisplaySrc(currentUser?.avatar) ? currentUser?.avatar : ''),
    );

    form.setFieldsValue({
      account,
      name,
      nickName,
      avatar,
    });
    setAvatarPreview(nextAvatarPreview);
  }, [currentUser, form]);

  React.useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    };
  }, []);

  const refreshCurrentUser = async (
    user: API.CurrentUser & Record<string, any>,
  ) => {
    setLoginUserInfo(user);
    setInitialState((s: any) => ({
      ...s,
      currentUser: {
        ...(s?.currentUser || {}),
        ...user,
      },
    }));
  };
  const handleAvatarUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }
    const maxMB = 5;
    if (file.size / 1024 / 1024 > maxMB) {
      message.error(`图片大小不能超过 ${maxMB}MB！`);
      return false;
    }

    setAvatarUploading(true);
    try {
      const attachment = await uploadAttachment({ file, categoryId: 1 });
      const attachmentId = attachment?.id;
      if (!attachmentId) {
        message.error('上传失败，请重试');
        return false;
      }

      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
      const nextPreview = attachment.url || URL.createObjectURL(file);
      if (!attachment.url) {
        avatarObjectUrlRef.current = nextPreview;
      }
      form.setFieldsValue({ avatar: String(attachmentId) });
      setAvatarPreview(nextPreview);
      message.success('头像已上传，保存后生效');
    } catch (error: any) {
      message.error(error?.message || '头像上传失败，请重试');
    } finally {
      setAvatarUploading(false);
    }
    return false;
  };
  // 头像组件 方便以后独立，增加裁剪之类的功能
  const AvatarView = ({ avatar }: { avatar: string }) => (
    <>
      <div className={styles.avatar_title}>头像</div>
      <div className={styles.avatar}>
        <img src={avatar} alt="avatar" />
      </div>
      <Upload
        accept="image/*"
        showUploadList={false}
        beforeUpload={handleAvatarUpload}
        disabled={avatarUploading}
      >
        <div className={styles.button_view}>
          <Button loading={avatarUploading}>
            <UploadOutlined />
            更换头像
          </Button>
        </div>
      </Upload>
    </>
  );
  const getAvatarURL = () =>
    avatarPreview ||
    'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png';
  const handleFinish = async () => {
    const values = form.getFieldsValue(true);
    const submittedInfo = {
      account: normalizeDisplayText(values.account),
      name: normalizeDisplayText(values.name),
      avatar: normalizeDisplayText(values.avatar),
      nickName: normalizeDisplayText(values.nickName),
    };

    await editUserInfo({
      ...submittedInfo,
      avatar: submittedInfo.avatar || undefined,
    });

    const freshUserInfo = await getUserInfo({ skipErrorHandler: true });
    const nextUser = mapUserInfoToCurrentUser(freshUserInfo, currentUser);
    await refreshCurrentUser(nextUser);
    message.success('基本信息已更新');
  };
  return (
    <div className={styles.baseView}>
      {loading ? null : (
        <>
          <div className={styles.left}>
            <ProForm
              form={form}
              layout="vertical"
              onFinish={handleFinish}
              submitter={{
                searchConfig: {
                  submitText: '更新基本信息',
                },
                render: (_, dom) => dom[1],
              }}
              initialValues={{
                account: normalizeDisplayText(currentUser?.account),
                name: normalizeDisplayText(currentUser?.name),
                nickName: normalizeDisplayText(currentUser?.nickName),
                avatar: normalizeDisplayText(currentUser?.avatar),
              }}
              hideRequiredMark
            >
              <ProFormText
                width="md"
                name="account"
                label="账号"
                rules={[
                  {
                    required: true,
                    message: '请输入账号!',
                  },
                ]}
                fieldProps={{
                  placeholder: '请输入账号',
                }}
              />
              <ProFormText
                width="md"
                name="name"
                label="用户姓名"
                rules={[
                  {
                    required: true,
                    message: '请输入用户姓名!',
                  },
                ]}
                fieldProps={{
                  placeholder: '请输入用户姓名',
                }}
              />
              <ProFormText
                width="md"
                name="nickName"
                label="用户昵称"
                rules={[
                  {
                    required: true,
                    message: '请输入您的昵称!',
                  },
                ]}
                fieldProps={{
                  placeholder: '请输入用户昵称',
                }}
              />
              <ProFormText name="avatar" hidden />
            </ProForm>
          </div>
          <div className={styles.right}>
            <AvatarView avatar={getAvatarURL()} />
          </div>
        </>
      )}
    </div>
  );
};
export default BaseView;
