import {
  DownOutlined,
  LogoutOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Input, message } from 'antd';
import React, { useMemo, useState } from 'react';
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

export type HeaderIdentityDropdownProps = {
  currentOrgCode?: string;
  currentUser?: API.CurrentUser;
  loginContext?: any;
  onLogout: () => Promise<void>;
  setInitialState: (
    updater: (state: Record<string, any> | undefined) => Record<string, any>,
  ) => void;
};

const HeaderIdentityDropdown: React.FC<HeaderIdentityDropdownProps> = ({
  currentOrgCode,
  currentUser,
  loginContext,
  onLogout,
  setInitialState,
}) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [switchingOrgCode, setSwitchingOrgCode] = useState<string>();

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

  const accountName =
    loginContext?.userOrgNickName ||
    (currentUser as any)?.nickName ||
    currentUser?.name ||
    '用户';
  const accountNo =
    (currentUser as any)?.loginName ||
    currentUser?.userid ||
    currentUser?.phone ||
    '-';
  const accountRole =
    currentIdentity?.groupLabel || currentIdentity?.levelName || '未选择身份';
  const avatarSrc = currentUser?.avatar || HEADER_USER_AVATAR_SRC;
  const triggerLabel = accountName;

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
      dropdownRender={() => (
        <div
          className="header-identity-dropdown__panel"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="header-identity-dropdown__header">
            <Avatar
              size={40}
              src={avatarSrc}
              icon={<UserOutlined />}
              className="header-identity-dropdown__avatar"
            />
            <div className="header-identity-dropdown__account">
              <div className="header-identity-dropdown__name">
                {accountName}
              </div>
              <div className="header-identity-dropdown__meta">
                <span>{accountNo}</span>
                {/* <span>|</span>
                <span>{accountRole}</span> */}
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
