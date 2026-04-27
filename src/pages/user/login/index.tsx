import {
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
  Modal,
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
import {
  getUncheckedSiteStaticConfig,
  type SystemConfigItem,
} from '@/api/systemConfig';
import Banner1 from '@/assets/Banner1.jpg';
import Banner2 from '@/assets/Banner2.jpg';
import Banner3 from '@/assets/Banner3.jpg';
import Banner4 from '@/assets/Banner4.jpg';
import LogoDark from '@/assets/logo-dark.png';
import {
  clearPostLoginRedirect,
  consumeAuthLogoutMessage,
  consumeAuthLogoutReason,
  getPostLoginRedirect,
  getRedirectFromSearch,
  markLoginPendingIdentity,
  setPostLoginRedirect,
} from '@/utils/auth-expired';
import { setDocumentFavicon } from '@/utils/favicon';
import Settings from '../../../../config/defaultSettings';
import './index.less';

const devBypassAuth =
  typeof __DEV_BYPASS_AUTH__ !== 'undefined' && __DEV_BYPASS_AUTH__;
const DEFAULT_SERVICE_PHONE = '400-010-3000';
const DEFAULT_SITE_NAME = '随付达';
const DEFAULT_BANNER_IMAGES = [Banner1, Banner2, Banner3, Banner4];

type LoginStaticResourceState = {
  logoUrl: string;
  faviconUrl?: string;
  siteName: string;
  servicePhone: string;
  icpText?: string;
  icpLink?: string;
  psbText?: string;
  psbLink?: string;
  bannerImages: string[];
  carouselAutoplay: boolean;
  carouselIntervalMs: number;
};

type BannerConfig = {
  items?: Array<Record<string, any>>;
  autoplay?: boolean;
  intervalMs?: number;
};

const defaultLoginStaticResources: LoginStaticResourceState = {
  logoUrl: LogoDark,
  siteName: DEFAULT_SITE_NAME,
  servicePhone: DEFAULT_SERVICE_PHONE,
  bannerImages: DEFAULT_BANNER_IMAGES,
  carouselAutoplay: true,
  carouselIntervalMs: 3000,
};

const isDisplaySrc = (value?: unknown) => {
  const text = String(value || '').trim();
  if (!text) return false;
  return (
    /^(https?:)?\/\//.test(text) ||
    /^(data|blob):/.test(text) ||
    text.startsWith('/')
  );
};

const parseJsonConfig = <T,>(value?: unknown): T | undefined => {
  if (!value) return undefined;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const toConfigMap = (configs?: SystemConfigItem[]) => {
  const map: Record<string, SystemConfigItem> = {};
  (configs || []).forEach((item) => {
    const key = String(item?.configKey || '').trim();
    if (key) map[key] = item;
  });
  return map;
};

const readTextConfig = (item?: SystemConfigItem, fallback = '') =>
  String(item?.configValue || item?.configValueConvert || fallback).trim();

const readFirstTextConfig = (
  configMap: Record<string, SystemConfigItem>,
  keys: string[],
  fallback = '',
) => {
  for (const key of keys) {
    const value = readTextConfig(configMap[key]);
    if (value) return value;
  }
  return fallback;
};

const readFileUrlConfig = (item?: SystemConfigItem, fallback = '') => {
  const converted = String(item?.configValueConvert || '').trim();
  if (isDisplaySrc(converted)) return converted;
  const raw = String(item?.configValue || '').trim();
  return isDisplaySrc(raw) ? raw : fallback;
};

const readFirstFileUrlConfig = (
  configMap: Record<string, SystemConfigItem>,
  keys: string[],
  fallback = '',
) => {
  for (const key of keys) {
    const value = readFileUrlConfig(configMap[key]);
    if (value) return value;
  }
  return fallback;
};

const readFooterExtraConfig = (item?: SystemConfigItem) => {
  const value =
    parseJsonConfig<Record<string, any>>(item?.configValueConvert) ||
    parseJsonConfig<Record<string, any>>(item?.configValue);
  return value || {};
};

const readBannerConfig = (item?: SystemConfigItem) => {
  const converted =
    parseJsonConfig<BannerConfig>(item?.configValueConvert) ||
    parseJsonConfig<BannerConfig>(item?.configValue);
  const directUrl = readFileUrlConfig(item);
  if (!converted && directUrl) {
    return {
      images: [directUrl],
      autoplay: true,
      intervalMs: 3000,
    };
  }

  const items = Array.isArray(converted)
    ? converted
    : Array.isArray(converted?.items)
      ? converted.items
      : [];
  const images = items
    .slice()
    .sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0))
    .map((configItem) =>
      typeof configItem === 'string'
        ? configItem.trim()
        : String(
            configItem?.url ||
              configItem?.attachmentUrl ||
              configItem?.imageUrl ||
              configItem?.src ||
              '',
          ).trim(),
    )
    .filter((src) => isDisplaySrc(src));

  return {
    images,
    autoplay:
      typeof converted?.autoplay === 'boolean' ? converted.autoplay : true,
    intervalMs: Number(converted?.intervalMs || 3000),
  };
};

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

type LoginErrorState = {
  code?: string | number;
  message: string;
} | null;

function getDefaultLoginInlineMessage(loginType: string) {
  return loginType === 'mobile' ? '验证码错误' : '账户或密码错误';
}

function normalizeLoginError(
  error: unknown,
  loginType: string,
  defaultMessage: string,
): LoginErrorState {
  const bizCode =
    (error as any)?.info?.errorCode ?? (error as any)?.response?.status;
  const bizMessage =
    (error as any)?.info?.errorMessage ??
    (error as any)?.response?.data?.msg ??
    (error as any)?.response?.data?.message ??
    (error as any)?.response?.data?.errorMessage ??
    (error as any)?.message;

  return {
    code: bizCode,
    message:
      bizMessage || getDefaultLoginInlineMessage(loginType) || defaultMessage,
  };
}

const Login: React.FC = () => {
  const [type, setType] = useState<string>('account');
  const [loginError, setLoginError] = useState<LoginErrorState>(null);
  const [logoutReasonText, setLogoutReasonText] = useState<
    string | undefined
  >();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { message } = App.useApp();
  const intl = useIntl();
  const { setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm<API.LoginParams>();
  const carouselRef = useRef<any>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [qrRefreshSpinKey, setQrRefreshSpinKey] = useState<number>(0);
  const [staticResources, setStaticResources] =
    useState<LoginStaticResourceState>(defaultLoginStaticResources);

  useEffect(() => {
    Modal.destroyAll();
    if (!getRedirectFromSearch()) {
      clearPostLoginRedirect();
    }
    const logoutMessage = consumeAuthLogoutMessage();
    const reason = consumeAuthLogoutReason();
    if (logoutMessage) {
      setLogoutReasonText(logoutMessage);
      return;
    }
    if (reason === 'mutual_login') {
      setLogoutReasonText(
        '登录状态已失效，您的账号已在其他设备登录，请重新登录。',
      );
      return;
    }
    if (reason === 'unauthorized') {
      setLogoutReasonText('未认证，请重新登录。');
      return;
    }
    if (reason === 'expired') {
      setLogoutReasonText('登录状态已过期，请重新登录。');
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadStaticResources = async () => {
      try {
        const configs = await getUncheckedSiteStaticConfig({
          skipErrorHandler: true,
        });
        if (ignore) return;

        const configMap = toConfigMap(configs);
        const bannerConfig = readBannerConfig(configMap['auth.login.carousel']);
        const footerExtra = readFooterExtraConfig(configMap['footer.extra']);
        const nextBannerImages =
          bannerConfig.images.length > 0
            ? bannerConfig.images
            : DEFAULT_BANNER_IMAGES;

        const nextStaticResources = {
          logoUrl: readFirstFileUrlConfig(
            configMap,
            ['auth.login.logo', 'site.logo'],
            LogoDark,
          ),
          faviconUrl: readFileUrlConfig(configMap['site.favicon']),
          siteName: readTextConfig(configMap['site.name'], DEFAULT_SITE_NAME),
          servicePhone: readFirstTextConfig(
            configMap,
            [
              'auth.login.contactPhone',
              'auth.login.service.phone',
              'auth.login.phone',
              'site.contact.phone',
              'site.service.phone',
              'site.phone',
              'site.telephone',
              'footer.contact.phone',
              'contact.phone',
            ],
            String(
              footerExtra.servicePhone ||
                footerExtra.contactPhone ||
                footerExtra.phone ||
                DEFAULT_SERVICE_PHONE,
            ),
          ),
          icpText: readTextConfig(
            configMap['footer.icp.text'],
            footerExtra.icpText,
          ),
          icpLink: readTextConfig(
            configMap['footer.icp.link'],
            footerExtra.icpLink,
          ),
          psbText: readTextConfig(
            configMap['footer.psb.text'],
            footerExtra.psbText,
          ),
          psbLink: readTextConfig(
            configMap['footer.psb.link'],
            footerExtra.psbLink,
          ),
          bannerImages: nextBannerImages,
          carouselAutoplay: bannerConfig.autoplay,
          carouselIntervalMs: bannerConfig.intervalMs || 3000,
        };

        setStaticResources(nextStaticResources);
        setDocumentFavicon(nextStaticResources.faviconUrl);
        setInitialState((s: any) => ({
          ...(s || {}),
          settings: {
            ...((s as any)?.settings || {}),
            title: nextStaticResources.siteName,
          },
        }));
      } catch (error) {
        console.warn('load login static resources failed:', error);
      }
    };

    void loadStaticResources();

    return () => {
      ignore = true;
    };
  }, []);

  // 移除缩放逻辑，改用响应式布局

  const handleSubmit = async (values: API.LoginParams) => {
    setSubmitting(true);
    try {
      setLoginError(null);
      setLogoutReasonText(undefined);
      if (devBypassAuth) {
        // ... bypass 逻辑，这里没动
        return;
      }
      // 登录
      const res = await login({
        account: type === 'mobile' ? values.mobile : values.account,
        password: type === 'mobile' ? values.captcha : values.password,
        loginType: 'PC',
      } as any);

      // 兼容不同登录接口返回中的 token 字段。
      const token =
        (res as any)?.token ??
        (res as any)?.tokenValue ??
        (res as any)?.data?.tokenValue ??
        (res as any)?.data?.token;

      // 没取到 token 时视为登录未完成，交给当前页面展示错误。
      if (typeof token !== 'string' || token.length === 0) {
        throw new Error('登录成功但未获取到 tokenValue');
      }

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
        str((res as any)?.name) ||
        str((res as any)?.userName) ||
        str(values.account) ||
        str(values.mobile);
      const nickName =
        str(userInfo?.nickName) ||
        str(userInfo?.nickname) ||
        str((res as any)?.nickName) ||
        str((res as any)?.nickname) ||
        name;
      const account =
        str(userInfo?.account) ||
        str((res as any)?.account) ||
        str(userInfo?.loginName) ||
        str((res as any)?.loginName) ||
        str(values.account) ||
        str(values.mobile);

      const avatar =
        str(userInfo?.avatar) ||
        str(userInfo?.headImg) ||
        str(userInfo?.avatarUrl) ||
        str(userInfo?.photo) ||
        str((res as any)?.avatar) ||
        str((res as any)?.headImg);

      setLoginUserInfo({
        ...(userInfo || {}),
        name,
        nickName,
        account,
        loginName: account,
        avatar,
        phone: str(userInfo?.phone) || str((res as any)?.phone),
      });

      setInitialState((s: any) => ({
        ...(s || {}),
        currentUser: {
          ...((s as any)?.currentUser || {}),
          ...(userInfo || {}),
          name,
          nickName,
          account,
          loginName: account,
          avatar,
          phone: str(userInfo?.phone) || str((res as any)?.phone),
        },
      }));

      setLoginError(null);
      markLoginPendingIdentity();

      const redirect =
        getRedirectFromSearch() || getPostLoginRedirect() || undefined;

      if (redirect) {
        setPostLoginRedirect(redirect);
        history.replace({
          pathname: '/user/character',
          search: new URLSearchParams({ redirect }).toString(),
        });
      } else {
        clearPostLoginRedirect();
        history.replace('/user/character');
      }
      return;
    } catch (error) {
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: '登录失败，请重试！',
      });
      setLoginError(
        normalizeLoginError(error, type, defaultLoginFailureMessage),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const appTitle =
    staticResources.siteName ||
    (typeof Settings.title === 'string' ? Settings.title : '') ||
    DEFAULT_SITE_NAME;
  const pageTitle = `${intl.formatMessage({
    id: 'menu.login',
    defaultMessage: '登录页',
  })}${appTitle ? ` - ${appTitle}` : ''}`;

  const bannerImages = useMemo(
    () =>
      staticResources.bannerImages.length > 0
        ? staticResources.bannerImages
        : DEFAULT_BANNER_IMAGES,
    [staticResources.bannerImages],
  );

  const cardTitle = appTitle ? `欢迎登录${appTitle}` : '欢迎登录随付达';
  const footerItems = [
    {
      key: 'icp',
      text: staticResources.icpText,
      link: staticResources.icpLink,
    },
    {
      key: 'psb',
      text: staticResources.psbText,
      link: staticResources.psbLink,
    },
  ].filter((item) => item.text || item.link);

  return (
    <div className="loginPage">
      <Helmet>
        <title>{pageTitle}</title>
        {staticResources.faviconUrl ? (
          <link rel="icon" href={staticResources.faviconUrl} />
        ) : null}
      </Helmet>
      <div className="bgCarousel">
        <Carousel
          ref={carouselRef}
          autoplay={staticResources.carouselAutoplay}
          autoplaySpeed={staticResources.carouselIntervalMs}
          effect="fade"
          dots={false}
          beforeChange={(_, next) => {
            setActiveSlide(next);
          }}
        >
          {bannerImages.map((src) => {
            return (
              <div className="bgSlide" key={src}>
                <img src={src} alt="" className="loginBgImage" />
              </div>
            );
          })}
        </Carousel>
      </div>
      <div className="loginOverlay u-flex-col">
        <Lang />
        <div className="header u-flex-between">
          <div className="brand u-flex-center">
            <img src={staticResources.logoUrl} alt="" className="brandLogo" />
          </div>
          <div className="service u-flex-center">
            <PhoneOutlined />
            <span>{staticResources.servicePhone}</span>
          </div>
        </div>

        <div className="content">
          <div className="loginPanel">
            <div className="loginCard u-flex">
              <div className="cardLeft u-flex-col u-flex-center">
                <div className="qrTitle">扫码登录</div>
                <div className="qrTips">
                  <span className="qrTipsText">请使用微信打开扫一扫登录</span>
                </div>
                <div className="qrCode u-flex-col u-flex-center">
                  <WechatOutlined />
                  <div className="qrPlaceholder">二维码</div>
                </div>
                <button
                  className="qrRefresh u-inline-flex-center"
                  type="button"
                  onClick={() => {
                    setQrRefreshSpinKey((prev) => prev + 1);
                    message.success('已刷新');
                  }}
                >
                  <span>刷新</span>
                  <ReloadOutlined
                    key={qrRefreshSpinKey}
                    className={
                      qrRefreshSpinKey > 0
                        ? 'qrRefreshIcon qrRefreshIconSpinning'
                        : 'qrRefreshIcon'
                    }
                  />
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
                    setLoginError(null);
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

                {!loginError && logoutReasonText && (
                  <Alert
                    style={{ marginBottom: 24 }}
                    type="warning"
                    showIcon
                    message={logoutReasonText}
                  />
                )}

                {loginError && <LoginMessage content={loginError.message} />}

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
                        name="account"
                        rules={[
                          {
                            required: true,
                            message: '请输入账号',
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
                              onClick={() => {
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

                  <div className="extraRow u-flex-between">
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
                      loading={submitting}
                    >
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </div>

        <div className="carouselDots u-flex-center">
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

        {footerItems.length > 0 ? (
          <div className="loginFooter u-flex-center">
            {footerItems.map((item, index) => {
              const content = item.text || item.link;
              if (!content) return null;
              return (
                <React.Fragment key={item.key}>
                  {index > 0 ? (
                    <span className="loginFooterDivider">|</span>
                  ) : null}
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="loginFooterLink"
                    >
                      {content}
                    </a>
                  ) : (
                    <span>{content}</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Login;
