import type { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
} = {
  navTheme: 'light',
  colorPrimary: '#1677FF',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  pwa: false,
  siderWidth: 239,
  token: {
    sider: {
      colorMenuBackground: 'var(--ant-color-bg-container)', //menu 的背景颜色
      colorTextMenuItemHover: 'var(--pc-color-primary)',
      colorBgMenuItemSelected: 'var(--pc-sider-active-bg)', //menuItem 的选中背景颜色
      colorBgMenuItemHover: 'var(--pc-sider-hover-bg)',
      colorTextMenuActive: 'var(--ant-color-text)',
      colorBgMenuItemActive: 'var(--pc-sider-hover-bg)',
      colorTextMenuSelected: 'var(--pc-color-primary)',
      colorTextMenuTitle: 'var(--ant-color-text)',
      colorTextMenu: 'var(--ant-color-text)',
    },
    header: {
      colorTextMenuActive: 'var(--pc-color-primary)',
      heightLayoutHeader: 60,
      colorTextMenuSelected: 'var(--pc-color-primary)',
      colorBgMenuItemHover: 'transparent',
    },
  },
  siderMenuType: 'sub',
  splitMenus: true,
};

export default Settings;
