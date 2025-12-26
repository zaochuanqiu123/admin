import type { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  "navTheme": "light",
  "colorPrimary": "#1890ff",
  "layout": "mix",
  "contentWidth": "Fluid",
  "fixedHeader": false,
  "fixSiderbar": true,
  "pwa": true,
  "logo": "https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg",
  "token": {
    sider:{
      colorMenuBackground:'#fff',//menu 的背景颜色
      colorTextMenuItemHover: '#1677ff',//menuItem 的 hover 字体颜色
      colorBgMenuItemSelected:'#fff',//menuItem 的选中背景颜色
      colorBgMenuItemHover:'#fff',
      colorTextMenuActive:'#fff',
      colorBgMenuItemActive: 'transparent',
      colorTextMenuSelected:'#1677ff',
      colorTextMenuTitle:'colorTextHeading',
    },
    header:{
      colorTextMenuActive:'#1677ff',
    }
  },
  "siderMenuType": "sub",
  "splitMenus": true
}

export default Settings;

