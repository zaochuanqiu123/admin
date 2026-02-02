import {
  AntDesignOutlined,
  LockOutlined,
  PhoneOutlined,
  ReloadOutlined,
  UserOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { Helmet, history, SelectLang, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Carousel,
  Checkbox,
  Form,
  Input,
  Tabs,
} from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { login } from '@/api/auth';
import {
  clearSelectedOrgCode,
  setLoginOrgList,
  setLoginUserInfo,
  setToken,
} from '@/api/storage';
import { getFakeCaptcha } from '@/api/user';
import Banner1 from '@/assets/Banner1.jpg';
import Banner2 from '@/assets/Banner2.jpg';
import Banner3 from '@/assets/Banner3.jpg';
import Banner4 from '@/assets/Banner4.jpg';
import { Footer } from '@/components';
import Settings from '../../../../config/defaultSettings';
import './index.less';

const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;

const Lang = () => {
  return (
    <div data-lang style={{ display: 'none' }}>
      {/* 国际化按钮已隐藏 */}
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<string>('account');
  const [loginErrorText, setLoginErrorText] = useState<string | undefined>();
  const { message } = App.useApp();
  const intl = useIntl();
  const { setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm<API.LoginParams>();
  const carouselRef = useRef<any>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);

  // --- 缩放逻辑 ---
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calcScale = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // 调整为 1600x900 基准
      const s = Math.min(w / 1600, h / 900, 1);
      // 用户要求卡片别太小，所以限制最小缩放为 0.9
      setScale(Math.max(s, 0.9));
    };
    calcScale();
    window.addEventListener('resize', calcScale);
    return () => window.removeEventListener('resize', calcScale);
  }, []);

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      setLoginErrorText(undefined);
      if (devBypassAuth) {
        // ... bypass 逻辑，这里没动
        return;
      }
      // 登录
      const res = await login({
        loginName: type === 'mobile' ? values.mobile : values.username,
        password: type === 'mobile' ? values.captcha : values.password,
        loginType: 'PC',
      } as any);

      // --- 以下是我的主要修改 ---

      // 1. 改动：优先从 res.token 取 token（真实接口），并兼容 tokenValue
      const token =
        (res as any)?.token ??
        (res as any)?.tokenValue ??
        (res as any)?.data?.tokenValue ??
        (res as any)?.token ??
        (res as any)?.data?.token;

      // 2. 新增：打印返回和 token，方便你调试
      console.log('login response:', res);
      console.log('token:', token);

      // 3. 新增：如果没取到 token，就抛出错误，避免“假成功”
      if (typeof token !== 'string' || token.length === 0) {
        throw new Error('登录成功但未获取到 tokenValue');
      }

      // 4. 改动：setToken 存本地，这行没变，但意义明确了
      setToken(token);
      clearSelectedOrgCode();

      const orgList =
        (res as any)?.org ??
        (res as any)?.orgList ??
        (res as any)?.data?.org ??
        (res as any)?.data?.orgList;
      if (Array.isArray(orgList)) {
        setLoginOrgList(orgList);
      }

      const str = (v: any) => {
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return String(v);
        return '';
      };
      const userInfo =
        (res as any)?.user ||
        (res as any)?.userInfo ||
        (res as any)?.data?.user ||
        (res as any)?.data?.userInfo ||
        (res as any)?.data?.currentUser ||
        (res as any)?.currentUser;

      const name =
        str(userInfo?.name) ||
        str(userInfo?.userName) ||
        str(userInfo?.nickName) ||
        str((res as any)?.name) ||
        str((res as any)?.userName) ||
        str(values.username) ||
        str(values.mobile);

      const avatar =
        str(userInfo?.avatar) ||
        str(userInfo?.headImg) ||
        str(userInfo?.avatarUrl) ||
        str(userInfo?.photo) ||
        str((res as any)?.avatar) ||
        str((res as any)?.headImg);

      setLoginUserInfo({ name, avatar });

      setInitialState((s: any) => ({
        ...(s || {}),
        currentUser: {
          ...((s as any)?.currentUser || {}),
          name,
          avatar,
        },
      }));

      setUserLoginState({ status: 'ok', type });
      setLoginErrorText(undefined);

      const defaultLoginSuccessMessage = intl.formatMessage({
        id: 'pages.login.success',
        defaultMessage: '登录成功！',
      });
      message.success(defaultLoginSuccessMessage);

      // 5. 改动：把 await fetchUserInfo() 删掉了，直接跳转
      const urlParams = new URL(window.location.href).searchParams;
      void urlParams.get('redirect');
      // 登录成功后统一进入“用户身份/门店选择”页
      history.replace('/user/character');
      return;
    } catch (error) {
      // ... 错误处理逻辑，这里没动
      setUserLoginState({ status: 'error', type });
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: '登录失败，请重试！',
      });
      console.log(error);

      const bizMessage =
        (error as any)?.info?.errorMessage ??
        (error as any)?.response?.data?.msg ??
        (error as any)?.response?.data?.message ??
        (error as any)?.response?.data?.errorMessage ??
        (error as any)?.message;

      const defaultInlineMessage =
        type === 'mobile' ? '验证码错误' : '账户或密码错误';
      const finalMessage =
        bizMessage || defaultInlineMessage || defaultLoginFailureMessage;
      setLoginErrorText(finalMessage);
    }
  };
  const { status } = userLoginState;

  const appTitle = typeof Settings.title === 'string' ? Settings.title : '';
  const pageTitle = `${intl.formatMessage({
    id: 'menu.login',
    defaultMessage: '登录页',
  })}${appTitle ? ` - ${appTitle}` : ''}`;

  const bannerImages = useMemo(() => {
    return [Banner1, Banner2, Banner3, Banner4];
  }, []);

  const cardTitle = appTitle ? `欢迎登录${appTitle}` : '欢迎登录随付达';

  return (
    <div className="loginPage">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <div className="bgCarousel">
        <Carousel
          ref={carouselRef}
          autoplay
          autoplaySpeed={3000}
          effect="fade"
          dots={false}
          beforeChange={(_, next) => {
            setActiveSlide(next);
          }}
        >
          {bannerImages.map((src) => {
            return (
              <div className="bgSlide" key={src}>
                <img src={src} alt="" className="bgImage" />
              </div>
            );
          })}
        </Carousel>
      </div>
      <div className="overlay">
        <Lang />
        <div className="header">
          <div className="brand">
            <AntDesignOutlined />
            <span>Ant Design</span>
          </div>
          <div className="service">
            <PhoneOutlined />
            <span>400-010-3000</span>
          </div>
        </div>

        <div className="content">
          <div
            className="loginPanel"
            style={{
              transform: `translateY(-50%) scale(${scale})`,
              transformOrigin: 'right center',
            }}
          >
            <div className="loginCard">
              <div className="cardLeft">
                <div className="qrTitle">扫码登录</div>
                <div className="qrTips">
                  <span className="qrTipsText">请使用微信打开扫一扫登录</span>
                </div>
                <div className="qrCode">
                  <WechatOutlined />
                  <div className="qrPlaceholder">二维码</div>
                </div>
                <button
                  className="qrRefresh"
                  type="button"
                  onClick={() => {
                    message.success('已刷新');
                  }}
                >
                  <span>刷新</span>
                  <ReloadOutlined />
                </button>
              </div>
              <div className="cardDivider" />
              <div className="cardRight">
                <div className="cardTitle">{cardTitle}</div>
                <div className="cardSubTitle">
                  体验「组合型」的智慧与「一站式」的高效
                </div>

                <Tabs
                  className="tabs"
                  activeKey={type}
                  onChange={(key) => {
                    setType(key);
                    setUserLoginState({});
                    setLoginErrorText(undefined);
                    form.resetFields();
                    form.setFieldsValue({ autoLogin: true });
                  }}
                  items={[
                    {
                      key: 'account',
                      label: '账户密码登录',
                    },
                    {
                      key: 'mobile',
                      label: '手机号登录',
                    },
                  ]}
                />

                {status === 'error' && (
                  <LoginMessage
                    content={
                      loginErrorText ||
                      (type === 'mobile' ? '验证码错误' : '账户或密码错误')
                    }
                  />
                )}

                <Form
                  className="form"
                  form={form}
                  initialValues={{ autoLogin: true }}
                  onFinish={async (values) => {
                    await handleSubmit(values as API.LoginParams);
                  }}
                >
                  {type === 'account' && (
                    <>
                      <Form.Item
                        name="username"
                        rules={[
                          {
                            required: true,
                            message: '请输入用户名',
                          },
                        ]}
                      >
                        <Input
                          className="input"
                          prefix={<UserOutlined />}
                          placeholder="请输入登录账号"
                          allowClear
                        />
                      </Form.Item>
                      <Form.Item
                        name="password"
                        rules={[
                          {
                            required: true,
                            message: '请输入密码',
                          },
                        ]}
                      >
                        <Input.Password
                          className="input"
                          prefix={<LockOutlined />}
                          placeholder="请输入登录密码"
                        />
                      </Form.Item>
                    </>
                  )}

                  {type === 'mobile' && (
                    <>
                      <Form.Item
                        name="mobile"
                        rules={[
                          {
                            required: true,
                            message: '请输入手机号',
                          },
                          {
                            pattern: /^1\d{10}$/,
                            message: '手机号格式错误',
                          },
                        ]}
                      >
                        <Input
                          className="input"
                          prefix={<UserOutlined />}
                          placeholder="手机号"
                          allowClear
                        />
                      </Form.Item>
                      <Form.Item
                        name="captcha"
                        rules={[
                          {
                            required: true,
                            message: '请输入验证码',
                          },
                        ]}
                      >
                        <Input
                          className="input"
                          prefix={<LockOutlined />}
                          placeholder="验证码"
                          addonAfter={
                            <a
                              onClick={async () => {
                                const mobile = form.getFieldValue('mobile');
                                const result = await getFakeCaptcha({
                                  phone: mobile,
                                });
                                if (!result) {
                                  return;
                                }
                                message.success(
                                  '获取验证码成功！验证码为：1234',
                                );
                              }}
                            >
                              获取验证码
                            </a>
                          }
                        />
                      </Form.Item>
                    </>
                  )}

                  <div className="extraRow">
                    <Form.Item name="autoLogin" valuePropName="checked" noStyle>
                      <Checkbox>自动登录</Checkbox>
                    </Form.Item>
                    <a className="forgot">忘记密码？</a>
                  </div>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      className="submitBtn"
                      type="primary"
                      htmlType="submit"
                    >
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </div>

        <div className="carouselDots">
          {bannerImages.map((src, idx) => {
            const active = idx === activeSlide;
            return (
              <button
                key={src}
                className={active ? 'dot dotActive' : 'dot'}
                type="button"
                onClick={() => {
                  carouselRef.current?.goTo?.(idx);
                }}
                aria-label={`slide-${idx + 1}`}
              />
            );
          })}
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Login;
