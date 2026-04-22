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
const routes = [
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
        path: '/user/character',
        layout: false,
        name: 'character',
        component: './user/character',
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
    name: '系统首页',
    routes: [
      {
        path: '/dashboard',
        redirect: '/dashboard/index',
      },
      {
        path: '/dashboard/index',
        name: '系统首页',
        component: './dashboard/index',
      },

      {
        path: '/dashboard/settings',
        name: '个人中心',
        component: './dashboard/settings',
        hideInMenu: true,
      },
    ],
  },
  {
    name: '门店',
    path: '/form',
    routes: [
      {
        path: '/form',
        redirect: '/form/store-manage',
      },
      {
        name: '门店管理',
        path: '/form/store-manage',
        component: './form/index',
        backendPathUrls: ['/admin/org/v1/store/page'],
        hideInMenu: true,
      },
      {
        name: '添加门店',
        path: '/form/store-manage/create-single',
        component: './form/store-create/index',
        backendPathUrls: ['/admin/org/v1/store/add'],
        hideInMenu: true,
      },
      {
        name: '修改门店',
        path: '/form/store-manage/:id/edit',
        component: './form/store-create/index',
        backendPathUrls: [
          '/admin/org/v1/store/modify',
          '/admin/org/v1/store/{id}/detail',
        ],
        hideInMenu: true,
      },
      {
        name: '门店 DIY 权限',
        path: '/form/store-manage/:id/jurisdiction',
        component: './form/store-jurisdiction/index',
        hideInMenu: true,
      },
      {
        name: '所属行业',
        path: '/form/industry',
        component: './form/industry/index',
      },
      {
        name: '串码查询',
        path: '/form/sn-query',
        component: './form/sn-query/index',
      },
    ],
  },
  {
    name: '商品',
    path: '/list',
    component: './list',
  },
  {
    name: '应用',
    path: '/app',
    component: './iframe-view',
  },
  {
    name: '设备',
    path: '/device',
    component: './iframe-view',
  },
  {
    name: '权限',
    path: '/permission',
    component: './iframe-view',
  },
  {
    name: '仓储',
    path: '/warehouse',
    component: './iframe-view',
  },
  {
    path: '/profile',
    name: '进销存',
    component: './profile',
  },
  {
    name: '订单',
    path: '/result',
    component: './result',
  },
  {
    name: '会员',
    path: '/exception',
    component: './exception',
  },
  {
    name: '数据',
    path: '/account',
    component: './account',
  },
  {
    name: '财务',
    path: '/finance',
    component: './finance',
  },
  {
    name: '角色列表',
    path: '/permission/role-list',
    component: './set/role-permission',
    backendPathUrls: ['/Admin/AdminRoles/index/Admin/AdminRoles/getRoles'],
  },
  {
    name: '员工管理',
    path: '/permission/store-staff',
    component: './set/store-staff',
  },
  {
    name: '新增员工账号',
    path: '/permission/store-staff/create',
    component: './set/store-staff',
    hideInMenu: true,
  },
  {
    name: '修改员工账号',
    path: '/permission/store-staff/edit/:id',
    component: './set/store-staff',
    hideInMenu: true,
  },
  {
    name: '二维码模板',
    path: '/platform/qr-template',
    component: './form/store-qr-template/index',
    backendPathUrls: ['/device/qrcodeTemplate'],
    hideInMenu: true,
  },
  {
    name: '二维码列表',
    path: '/platform/qr-code',
    component: './form/store-qr-code/index',
    backendPathUrls: ['/device/qrcode'],
    hideInMenu: true,
  },
  {
    name: '云音响列表',
    path: '/device/speaker-list',
    component: './device/speaker-list/index',
    backendPathUrls: ['/device/speaker'],
    hideInMenu: true,
  },
  {
    name: '云音响品牌',
    path: '/device/speaker-brand',
    component: './device/speaker-brand/index',
    backendPathUrls: ['/device/speakerChannel'],
    hideInMenu: true,
  },
  {
    name: '打印机管理',
    path: '/device/printer',
    component: './device/printer/index',
    backendPathUrls: ['/device/printer'],
    hideInMenu: true,
  },
  {
    name: '终端列表',
    path: '/device/terminal',
    component: './device/terminal/index',
    backendPathUrls: ['/device/terminal'],
    hideInMenu: true,
  },
  {
    name: '商户列表',
    path: '/merchant/list',
    component: './merchant/list/index',
    backendPathUrls: ['/admin/org/v1/merchant/page'],
    hideInMenu: true,
  },
  {
    name: '新增商户',
    path: '/merchant/list/create',
    component: './merchant/create/index',
    backendPathUrls: ['/admin/org/v1/merchant/add'],
    hideInMenu: true,
  },
  {
    name: '修改商户',
    path: '/merchant/list/:id/edit',
    component: './merchant/create/index',
    backendPathUrls: [
      '/admin/org/v1/merchant/modify',
      '/admin/org/v1/merchant/{id}/detail',
    ],
    hideInMenu: true,
  },
  {
    name: '设备流转',
    path: '/device/transfer-record',
    component: './device/transfer-record/index',
    backendPathUrls: ['/device/transfer'],
    hideInMenu: true,
  },
  {
    path: '/set/role-permission',
    redirect: '/permission/role-list',
  },
  {
    name: '设置',
    path: '/set',
    component: './set',
  },
  {
    name: '存储配置',
    path: '/set/storage-config',
    component: './set/storage-config/index',
    backendPathUrls: [
      '/Retail/Storage/index',
      '/admin/attachment/v1/storageUploadSetting/detail',
      '/admin/attachment/v1/storageUploadSetting/save',
      '/admin/attachment/v1/cloudStorageConfig/page',
    ],
    hideInMenu: true,
  },
  {
    path: '/',
    redirect: '/dashboard/index',
  },
  {
    component: '404',
    path: '/*',
  },

  // qiankun子应用
  // {
  //   name: 'micro-app',
  //   icon: 'appstore',
  //   path: '/micro-app/*',
  //   component: './micro-app',
  // },
];

type RouteItem = {
  path?: string;
  redirect?: string;
  component?: string;
  routes?: RouteItem[];
  [key: string]: any;
};

function isAbsolutePath(p: string) {
  return p.startsWith('/');
}

function joinPath(base: string, next: string) {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const n = next.startsWith('/') ? next.slice(1) : next;
  return `${b}/${n}`;
}

function normalizeRedirect(redirect: string, parentPath?: string) {
  if (isAbsolutePath(redirect)) return redirect;
  if (!parentPath) return redirect;
  if (redirect.startsWith('./')) return joinPath(parentPath, redirect.slice(2));
  return joinPath(parentPath, redirect);
}

function findFirstReachablePath(
  children: RouteItem[],
  parentPath?: string,
): string | undefined {
  for (const child of children) {
    if (typeof child.redirect === 'string' && child.redirect) {
      return normalizeRedirect(child.redirect, child.path ?? parentPath);
    }
    if (typeof child.path === 'string' && child.path && child.component) {
      return child.path;
    }
    if (Array.isArray(child.routes) && child.routes.length > 0) {
      const found = findFirstReachablePath(
        child.routes,
        child.path ?? parentPath,
      );
      if (found) return found;
    }
  }
  return undefined;
}

function ensureIndexRedirect(
  children: RouteItem[],
  parentPath: string,
  target: string,
) {
  if (!target || target === parentPath) return children;

  const idx = children.findIndex((c) => c?.path === parentPath);
  const redirectRoute: RouteItem = {
    ...(idx >= 0 ? children[idx] : {}),
    path: parentPath,
    redirect: target,
  };

  const next = idx >= 0 ? children.filter((_, i) => i !== idx) : [...children];
  next.unshift(redirectRoute);
  return next;
}

function patchRoutes(list: RouteItem[], parentPath?: string): RouteItem[] {
  return list.map((route) => {
    const next: RouteItem = { ...route };

    if (typeof next.redirect === 'string' && next.redirect) {
      next.redirect = normalizeRedirect(next.redirect, parentPath);
    }

    if (Array.isArray(next.routes) && next.routes.length > 0) {
      next.routes = patchRoutes(next.routes, next.path ?? parentPath);

      if (typeof next.path === 'string' && next.path) {
        const target = findFirstReachablePath(next.routes, next.path);
        if (target) {
          next.routes = ensureIndexRedirect(next.routes, next.path, target);
        }
      }
    }

    return next;
  });
}

export default patchRoutes(routes);
