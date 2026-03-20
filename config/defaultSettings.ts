import type { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
} = {
  navTheme: 'light',
  colorPrimary: '#1890ff',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  pwa: true,
  siderWidth: 239,
  token: {
    sider: {
      colorMenuBackground: 'var(--ant-color-bg-container)', //menu 的背景颜色
      colorTextMenuItemHover: 'var(--ant-color-primary)',
      colorBgMenuItemSelected: 'transparent', //menuItem 的选中背景颜色
      colorBgMenuItemHover: 'var(--ant-color-bg-text-hover)',
      colorTextMenuActive: 'var(--ant-color-text)',
      colorBgMenuItemActive: 'transparent',
      colorTextMenuSelected: 'var(--ant-color-primary)',
      colorTextMenuTitle: 'var(--ant-color-text)',
      colorTextMenu: 'var(--ant-color-text)',
    },
    header: {
      colorTextMenuActive: '#005bf8',
      heightLayoutHeader: 60,
      colorTextMenuSelected: '#005bf8',
      colorBgMenuItemHover: 'transparent',
    },
  },
  siderMenuType: 'sub',
  splitMenus: true,
};

export default Settings;
