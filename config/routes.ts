/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        layout: false,
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        name: 'register-result',
        icon: 'smile',
        path: '/user/register-result',
        component: './user/register-result',
      },
      {
        name: 'register',
        icon: 'smile',
        path: '/user/register',
        component: './user/register',
      },
      {
        component: '404',
        path: '/user/*',
      },
    ],
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'dashboard',
    routes: [
      {
        path: '/dashboard',
        redirect: '/dashboard/analysis',
      },
      {
        name: 'analysis',
        icon: 'smile',
        path: '/dashboard/analysis',
        routes: [
          {
            path: '/dashboard/analysis',
            redirect: '/dashboard/analysis/sub1',
          },
          {
            name: '子菜单一',
            path: '/dashboard/analysis/sub1',
            component: './dashboard/analysis/sub1',
          },
          {
            name: '子菜单二',
            path: '/dashboard/analysis/sub2',
            component: './dashboard/analysis/sub2',
          },
        ],
      },
      {
        name: 'monitor',
        icon: 'smile',
        path: '/dashboard/monitor',
        routes: [
          {
            path: '/dashboard/monitor',
            redirect: '/dashboard/monitor/sub1',
          },
          {
            name: '子菜单一',
            path: '/dashboard/monitor/sub1',
            component: './dashboard/monitor/sub1',
          },
          {
            name: '子菜单二',
            path: '/dashboard/monitor/sub2',
            component: './dashboard/monitor/sub2',
          },
        ],
      },
      {
        name: 'workplace',
        icon: 'smile',
        path: '/dashboard/workplace',
        routes: [
          {
            path: '/dashboard/workplace',
            redirect: '/dashboard/workplace/sub1',
          },
          {
            name: '子菜单一',
            path: '/dashboard/workplace/sub1',
            component: './dashboard/workplace/sub1',
          },
          {
            name: '子菜单二',
            path: '/dashboard/workplace/sub2',
            component: './dashboard/workplace/sub2',
          },
        ],
      },
    ],
  },
  {
    path: '/form',
    icon: 'form',
    name: 'form',
    routes: [
      {
        path: '/form',
        redirect: '/form/basic-form',
      },
      {
        name: 'basic-form',
        icon: 'smile',
        path: '/form/basic-form',
        routes: [
          {
            path: '/form/basic-form',
            redirect: '/form/basic-form/sub1',
          },
          {
            name: '子菜单一',
            path: '/form/basic-form/sub1',
            component: './form/basic-form/sub1',
          },
          {
            name: '子菜单二',
            path: '/form/basic-form/sub2',
            component: './form/basic-form/sub2',
          },
        ],
      },
      {
        name: 'step-form',
        icon: 'smile',
        path: '/form/step-form',
        routes: [
          {
            path: '/form/step-form',
            redirect: '/form/step-form/sub1',
          },
          {
            name: '子菜单一',
            path: '/form/step-form/sub1',
            component: './form/step-form/sub1',
          },
          {
            name: '子菜单二',
            path: '/form/step-form/sub2',
            component: './form/step-form/sub2',
          },
        ],
      },
      {
        name: 'advanced-form',
        icon: 'smile',
        path: '/form/advanced-form',
        routes: [
          {
            path: '/form/advanced-form',
            redirect: '/form/advanced-form/sub1',
          },
          {
            name: '子菜单一',
            path: '/form/advanced-form/sub1',
            component: './form/advanced-form/sub1',
          },
          {
            name: '子菜单二',
            path: '/form/advanced-form/sub2',
            component: './form/advanced-form/sub2',
          },
        ],
      },
    ],
  },
  {
    path: '/list',
    icon: 'table',
    name: 'list',
    routes: [
      {
        path: '/list/search',
        name: 'search-list',
        icon: 'table',
        component: './list/search',
        routes: [
          {
            path: '/list/search',
            redirect: '/list/search/articles',
          },
          {
            name: 'articles',
            icon: 'smile',
            path: '/list/search/articles',
            component: './list/search/articles',
          },
          {
            name: 'projects',
            icon: 'smile',
            path: '/list/search/projects',
            component: './list/search/projects',
          },
          {
            name: 'applications',
            icon: 'smile',
            path: '/list/search/applications',
            component: './list/search/applications',
          },
        ],
      },
      {
        path: '/list',
        redirect: '/list/table-list',
      },
      {
        name: 'table-list',
        icon: 'smile',
        path: '/list/table-list',
        routes: [
          {
            path: '/list/table-list',
            redirect: '/list/table-list/sub1',
          },
          {
            name: '子菜单一',
            path: '/list/table-list/sub1',
            component: './table-list/sub1',
          },
          {
            name: '子菜单二',
            path: '/list/table-list/sub2',
            component: './table-list/sub2',
          },
        ],
      },
      {
        name: 'basic-list',
        icon: 'smile',
        path: '/list/basic-list',
        routes: [
          {
            path: '/list/basic-list',
            redirect: '/list/basic-list/sub1',
          },
          {
            name: '子菜单一',
            path: '/list/basic-list/sub1',
            component: './list/basic-list/sub1',
          },
          {
            name: '子菜单二',
            path: '/list/basic-list/sub2',
            component: './list/basic-list/sub2',
          },
        ],
      },
      {
        name: 'card-list',
        icon: 'smile',
        path: '/list/card-list',
        routes: [
          {
            path: '/list/card-list',
            redirect: '/list/card-list/sub1',
          },
          {
            name: '子菜单一',
            path: '/list/card-list/sub1',
            component: './list/card-list/sub1',
          },
          {
            name: '子菜单二',
            path: '/list/card-list/sub2',
            component: './list/card-list/sub2',
          },
        ],
      },
    ],
  },
  {
    path: '/profile',
    name: 'profile',
    icon: 'profile',
    routes: [
      {
        path: '/profile',
        redirect: '/profile/basic',
      },
      {
        name: 'basic',
        icon: 'smile',
        path: '/profile/basic',
        routes: [
          {
            path: '/profile/basic',
            redirect: '/profile/basic/sub1',
          },
          {
            name: '子菜单一',
            path: '/profile/basic/sub1',
            component: './profile/basic/sub1',
          },
          {
            name: '子菜单二',
            path: '/profile/basic/sub2',
            component: './profile/basic/sub2',
          },
        ],
      },
      {
        name: 'advanced',
        icon: 'smile',
        path: '/profile/advanced',
        routes: [
          {
            path: '/profile/advanced',
            redirect: '/profile/advanced/sub1',
          },
          {
            name: '子菜单一',
            path: '/profile/advanced/sub1',
            component: './profile/advanced/sub1',
          },
          {
            name: '子菜单二',
            path: '/profile/advanced/sub2',
            component: './profile/advanced/sub2',
          },
        ],
      },
    ],
  },
  {
    name: 'result',
    icon: 'CheckCircleOutlined',
    path: '/result',
    routes: [
      {
        path: '/result',
        redirect: '/result/success',
      },
      {
        name: 'success',
        icon: 'smile',
        path: '/result/success',
        routes: [
          {
            path: '/result/success',
            redirect: '/result/success/sub1',
          },
          {
            name: '子菜单一',
            path: '/result/success/sub1',
            component: './result/success/sub1',
          },
          {
            name: '子菜单二',
            path: '/result/success/sub2',
            component: './result/success/sub2',
          },
        ],
      },
      {
        name: 'fail',
        icon: 'smile',
        path: '/result/fail',
        routes: [
          {
            path: '/result/fail',
            redirect: '/result/fail/sub1',
          },
          {
            name: '子菜单一',
            path: '/result/fail/sub1',
            component: './result/fail/sub1',
          },
          {
            name: '子菜单二',
            path: '/result/fail/sub2',
            component: './result/fail/sub2',
          },
        ],
      },
    ],
  },
  {
    name: 'exception',
    icon: 'warning',
    path: '/exception',
    routes: [
      {
        path: '/exception',
        redirect: '/exception/403',
      },
      {
        name: '403',
        icon: 'smile',
        path: '/exception/403',
        routes: [
          {
            path: '/exception/403',
            redirect: '/exception/403/sub1',
          },
          {
            name: '子菜单一',
            path: '/exception/403/sub1',
            component: './exception/403/sub1',
          },
          {
            name: '子菜单二',
            path: '/exception/403/sub2',
            component: './exception/403/sub2',
          },
        ],
      },
      {
        name: '404',
        icon: 'smile',
        path: '/exception/404',
        routes: [
          {
            path: '/exception/404',
            redirect: '/exception/404/sub1',
          },
          {
            name: '子菜单一',
            path: '/exception/404/sub1',
            component: './exception/404/sub1',
          },
          {
            name: '子菜单二',
            path: '/exception/404/sub2',
            component: './exception/404/sub2',
          },
        ],
      },
      {
        name: '500',
        icon: 'smile',
        path: '/exception/500',
        routes: [
          {
            path: '/exception/500',
            redirect: '/exception/500/sub1',
          },
          {
            name: '子菜单一',
            path: '/exception/500/sub1',
            component: './exception/500/sub1',
          },
          {
            name: '子菜单二',
            path: '/exception/500/sub2',
            component: './exception/500/sub2',
          },
        ],
      },
    ],
  },
  {
    name: 'account',
    icon: 'user',
    path: '/account',
    routes: [
      {
        path: '/account',
        redirect: '/account/center',
      },
      {
        name: 'center',
        icon: 'smile',
        path: '/account/center',
        routes: [
          {
            path: '/account/center',
            redirect: '/account/center/sub1',
          },
          {
            name: '子菜单一',
            path: '/account/center/sub1',
            component: './account/center/sub1',
          },
          {
            name: '子菜单二',
            path: '/account/center/sub2',
            component: './account/center/sub2',
          },
        ],
      },
      {
        name: 'settings',
        icon: 'smile',
        path: '/account/settings',
        routes: [
          {
            path: '/account/settings',
            redirect: '/account/settings/sub1',
          },
          {
            name: '子菜单一',
            path: '/account/settings/sub1',
            component: './account/settings/sub1',
          },
          {
            name: '子菜单二',
            path: '/account/settings/sub2',
            component: './account/settings/sub2',
          },
        ],
      },
    ],
  },
  {
    path: '/',
    redirect: '/dashboard/analysis',
  },
  {
    component: '404',
    path: '/*',
  },
];
