import {
  CameraOutlined,
  DownOutlined,
  LogoutOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Input, message, Upload } from 'antd';
import React, { useMemo, useState } from 'react';
import { uploadAttachment } from '@/api/cloudStorage';
import { setLoginUserInfo } from '@/api/storage';
import { saveUserAvatar } from '@/api/user';
import HeaderDropdown from '@/components/HeaderDropdown';
import {
  getCurrentIdentityItem,
  getIdentityItemsFromStorage,
  groupIdentityItems,
  type IdentityItem,
  switchIdentityContext,
} from '@/utils/identity';
import './index.less';

const HEADER_USER_AVATAR_SRC =
  'https://api.dicebear.com/7.x/miniavs/svg?seed=antd-yangkun';

const withAvatarCacheKey = (avatar: string) => {
  if (!avatar || /^(data|blob):/.test(avatar)) return avatar;

  const cacheKey = String(Date.now());
  try {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    const url = new URL(avatar, origin);
    url.searchParams.set('_avatar_t', cacheKey);
    if (/^https?:\/\//.test(avatar) || avatar.startsWith('//')) {
      return url.toString();
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (_error) {
    const separator = avatar.includes('?') ? '&' : '?';
    return `${avatar}${separator}_avatar_t=${cacheKey}`;
  }
};

const preloadImage = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('头像图片加载失败'));
    image.src = src;
  });

const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

export type HeaderIdentityDropdownProps = {
  currentOrgCode?: string;
  currentUser?: API.CurrentUser;
  loginContext?: any;
  onLogout: () => Promise<void>;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
  setInitialState: (
    updater: (state: Record<string, any> | undefined) => Record<string, any>,
  ) => void;
};

const HeaderIdentityDropdown: React.FC<HeaderIdentityDropdownProps> = ({
  currentOrgCode,
  currentUser,
  loginContext,
  onLogout,
  fetchUserInfo,
  setInitialState,
}) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [switchingOrgCode, setSwitchingOrgCode] = useState<string>();
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const identityItems = useMemo(
    () => getIdentityItemsFromStorage(),
    [currentOrgCode],
  );
  const currentIdentity = useMemo(
    () => getCurrentIdentityItem(currentOrgCode, identityItems),
    [currentOrgCode, identityItems],
  );
  const filteredIdentityItems = useMemo(() => {
    const searchValue = keyword.trim().toLowerCase();
    if (!searchValue) return identityItems;
    return identityItems.filter((item) =>
      [item.name, item.desc, item.levelName, item.groupLabel]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(searchValue)),
    );
  }, [identityItems, keyword]);
  const groupedIdentityItems = useMemo(
    () => groupIdentityItems(filteredIdentityItems),
    [filteredIdentityItems],
  );

  const loginUserName =
    currentUser?.name ||
    (currentUser as any)?.userName ||
    (currentUser as any)?.nickName ||
    '用户';

  // 名字下方展示账号（account），不展示手机号
  const accountNo = (currentUser as any)?.account || currentUser?.userid || '-';

  const currentOrgName =
    currentIdentity?.name ||
    loginContext?.userOrgName ||
    loginContext?.orgName ||
    loginContext?.userOrgNickName ||
    '未选择机构';
  const accountRole =
    currentIdentity?.groupLabel || currentIdentity?.levelName || '未选择身份';
  const avatarSrc =
    (currentUser as any)?.avatar ||
    currentUser?.avatar ||
    HEADER_USER_AVATAR_SRC;
  const triggerLabel = currentOrgName;

  /** 处理头像文件上传 */
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
      // 上传附件，获取 attachmentId
      const attachment = await uploadAttachment({ file, categoryId: 1 });
      const attachmentId = attachment?.id;
      if (!attachmentId) {
        message.error('上传失败，请重试');
        return false;
      }

      // 保存头像（传 attachmentId）
      await saveUserAvatar(String(attachmentId));

      const freshUser = await fetchUserInfo?.();
      if (!freshUser) {
        message.error('头像已保存，刷新用户信息失败');
        return false;
      }

      const latestAvatar = freshUser.avatar || (freshUser as any)?.avatarUrl;
      if (!latestAvatar) {
        message.error('头像已保存，但未获取到最新头像');
        return false;
      }

      const displayAvatar = withAvatarCacheKey(latestAvatar);
      try {
        await preloadImage(displayAvatar);
      } catch (_error) {
        message.error('头像已保存，但头像图片加载失败');
        return false;
      }

      const nextUser = {
        ...(currentUser || {}),
        ...freshUser,
        avatar: displayAvatar,
        avatarUrl: displayAvatar,
      };
      setLoginUserInfo(nextUser);
      setInitialState((s: any) => ({
        ...s,
        currentUser: {
          ...(s?.currentUser || {}),
          ...nextUser,
        },
      }));
      await waitForNextPaint();
      message.success('头像已更新');
    } catch (error: any) {
      console.error('avatar upload failed:', error);
      message.error(error?.message || '头像上传失败，请重试');
    } finally {
      setAvatarUploading(false);
    }
    return false; // 阻止 Upload 默认行为
  };

  const handleOpenProfileCenter = () => {
    setOpen(false);
    history.push('/dashboard/settings');
  };

  const handleLogoutClick = async () => {
    setOpen(false);
    await onLogout();
  };

  const handleIdentityClick = async (item: IdentityItem) => {
    const nextOrgCode = String(item.orgCode || '').trim();
    if (!nextOrgCode || nextOrgCode === String(currentOrgCode || '').trim()) {
      setOpen(false);
      return;
    }

    setOpen(false);
    setKeyword('');
    const hide = message.loading('正在切换身份...', 0);
    setSwitchingOrgCode(nextOrgCode);
    try {
      const switched = await switchIdentityContext(item, setInitialState);
      if (switched) {
        message.success(`已切换至${item.name}`);
      }
    } finally {
      hide();
      setSwitchingOrgCode(undefined);
    }
  };

  return (
    <HeaderDropdown
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setKeyword('');
        }
      }}
      trigger={['click']}
      placement="bottomRight"
      overlayClassName="header-identity-dropdown__overlay"
      popupRender={() => (
        <div
          className="header-identity-dropdown__panel"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="header-identity-dropdown__header">
            {/* 头像区域 —— 悬停时显示上传相机图标 */}
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleAvatarUpload}
              disabled={avatarUploading}
            >
              <div
                className="header-identity-dropdown__avatar-wrap"
                onMouseEnter={() => setAvatarHovered(true)}
                onMouseLeave={() => setAvatarHovered(false)}
              >
                <Avatar
                  size={40}
                  src={avatarSrc}
                  icon={<UserOutlined />}
                  className="header-identity-dropdown__avatar"
                />
                {(avatarHovered || avatarUploading) && (
                  <div className="header-identity-dropdown__avatar-overlay">
                    <CameraOutlined />
                  </div>
                )}
              </div>
            </Upload>

            <div className="header-identity-dropdown__account">
              <div className="header-identity-dropdown__name">
                {loginUserName}
              </div>
              <div className="header-identity-dropdown__meta">
                {/* 展示账号，不展示手机号 */}
                <span>{accountNo}</span>
              </div>
            </div>
            <div className="header-identity-dropdown__actions">
              <button
                type="button"
                className="header-identity-dropdown__action-pill"
                onClick={handleOpenProfileCenter}
              >
                个人中心
              </button>
              <button
                type="button"
                className="header-identity-dropdown__action-pill"
                onClick={() => void handleLogoutClick()}
              >
                <LogoutOutlined />
                退出登录
              </button>
            </div>
          </div>
          <div className="header-identity-dropdown__role-row">
            <span className="header-identity-dropdown__role-badge">
              {accountRole}
            </span>
          </div>

          <div className="header-identity-dropdown__divider" />

          <Input
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索"
            prefix={<SearchOutlined />}
            className="header-identity-dropdown__search"
          />

          <div className="header-identity-dropdown__groups">
            {groupedIdentityItems.length > 0 ? (
              groupedIdentityItems.map((group) => (
                <div
                  key={group.groupKey}
                  className="header-identity-dropdown__group"
                >
                  <div className="header-identity-dropdown__group-title">
                    {group.label}
                  </div>
                  <div className="header-identity-dropdown__group-items">
                    {group.items.map((item) => {
                      const itemOrgCode = String(item.orgCode || '').trim();
                      const isActive =
                        itemOrgCode &&
                        itemOrgCode === String(currentOrgCode || '').trim();
                      const isSwitching =
                        !!switchingOrgCode && switchingOrgCode === itemOrgCode;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`header-identity-dropdown__item${
                            isActive ? ' is-active' : ''
                          }${isSwitching ? ' is-loading' : ''}`}
                          disabled={isSwitching}
                          onClick={() => void handleIdentityClick(item)}
                        >
                          <span className="header-identity-dropdown__item-name">
                            {item.name}
                          </span>
                          {item.desc ? (
                            <span className="header-identity-dropdown__item-desc">
                              {item.desc}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="header-identity-dropdown__empty">
                暂无匹配身份
              </div>
            )}
          </div>
        </div>
      )}
    >
      <span className="header-identity-dropdown__trigger">
        <Avatar size={30} src={avatarSrc} icon={<UserOutlined />} />
        <span className="header-identity-dropdown__trigger-name">
          {triggerLabel}
        </span>
        <DownOutlined className="header-identity-dropdown__trigger-arrow" />
      </span>
    </HeaderDropdown>
  );
};

export default HeaderIdentityDropdown;
