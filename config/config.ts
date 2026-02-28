// https://umijs.org/config/

import { join } from 'node:path';
import { defineConfig } from '@umijs/max';
import defaultSettings from './defaultSettings';
import proxy from './proxy';

import routes from './routes';

const { REACT_APP_ENV = 'dev' } = process.env;

/**
 * @name 使用公共路径
 * @description 部署时的路径，如果部署在非根目录下，需要配置这个变量
 * @doc https://umijs.org/docs/api/config#publicpath
 */
const PUBLIC_PATH: string = '/';

export default defineConfig({
  /**
   * @name 开启 hash 模式
   * @description 让 build 之后的产物包含 hash 后缀。通常用于增量发布和避免浏览器加载缓存。
   * @doc https://umijs.org/docs/api/config#hash
   */
  hash: true,

  publicPath: PUBLIC_PATH,

  /**
   * @name 路由的配置，不在路由中引入的文件不会编译
   * @description 只支持 path，component，routes，redirect，wrappers，title 的配置
   * @doc https://umijs.org/docs/guides/routes
   */
  routes,

  /**
   * @name moment 的国际化配置
   * @description 如果对国际化没有要求，打开之后能减少js的包大小
   * @doc https://umijs.org/docs/api/config#ignoremomentlocsale
   */
  ignoreMomentLocale: true,

  /**
   * @name 代理配置
   * @description 【修改】合并了原始 proxy 配置和微前端资源代理
   */
  proxy: {
    // 1. 保留你原有的 proxy 配置 (如果 proxy.ts 里有其他接口配置)
    ...(proxy[REACT_APP_ENV as keyof typeof proxy] || {}),

    // =============================================================
    // 🔥🔥【新增】微前端子应用代理 (解决跨域 + 资源 404)
    // =============================================================

    // 1. 子应用入口代理
    //   '/api-old-app': {
    //     target: 'http://192.168.1.201:8081',
    //     changeOrigin: true,
    //     pathRewrite: { '^/api-old-app': '' },
    //   },

    //   // 2. 静态资源全家桶代理 (把老项目可能用到的目录全都指过去)
    //   // 这样老项目请求 /Public/img/logo.png 就会被转发到 test.suifuda.com/Public/img/logo.png
    //   ...[
    //     '/Public',
    //     '/Retail',
    //     '/index.php',
    //     '/Admin',
    //     '/Terminalapi',
    //     '/Uploads',
    //     '/Vip',
    //     '/AggregationCode',
    //     '/AIScale',
    //     '/PointsMall',
    //     '/Currency',
    //     '/CashierRegister',
    //     '/Website',
    //     '/Ad',
    //     '/DyGroupBuying',
    //     '/Rich',
    //     '/XinYiPayment',
    //     '/SubLedger',
    //     '/LabelPrint',
    //     '/SelfCashRegister',
    //     '/Marketing',
    //     '/PointsCheck',
    //     '/BigWheel',
    //     '/Cashier',
    //     '/Report',
    //     '/AssistantApplet',
    //     '/DyShoppingMall',
    //     // 新增路径
    //     '/Sellapi',
    //     '/Pay',
    //     '/WxApi',
    //     '/Super',
    //     '/Agent',
    //     '/Main',
    //     '/CashierApi',
    //     '/SmallProgramApi',
    //     '/NotifyApi',
    //     '/Distribution',
    //     '/Make',
    //     '/ShopCoupon',
    //     '/PayCoupon',
    //     '/Blessing',
    //     '/RegularDiscount',
    //     '/MallPreview',
    //     '/AliShoppingMall',
    //     '/OpenInterface',
    //     '/IndependentCollection',
    //     '/DiyStore',
    //     '/Token',
    //     '/GoodsPackage',
    //     '/Communication',
    //     '/OpenApi',
    //     '/Table',
    //     '/StepReductions',
    //     '/QHSupplyChain',
    //     '/ShoppingCard',
    //     '/SpecialOffer',
    //     '/DivideAccounts',
    //     '/DataScreen',
    //     '/Invoice',
    //   ].reduce(
    //     (acc, path) => {
    //       acc[path] = { target: 'http://192.168.1.201:8081', changeOrigin: true };
    //       return acc;
    //     },
    //     {} as Record<string, { target: string; changeOrigin: boolean }>,
    //   ),

    //   // // 如果老项目有 /api 开头的请求，也代理过去
    //   // '/api': { target: 'https://api.map.baidu.com', changeOrigin: true },
  },

  /**
   * @name 快速热更新配置
   * @description 一个不错的热更新组件，更新时可以保留 state
   */
  fastRefresh: true,

  //============== 以下都是max的插件配置 ===============
  /**
   * @name 数据流插件
   * @@doc https://umijs.org/docs/max/data-flow
   */
  model: {},

  /**
   * 一个全局的初始数据流，可以用它在插件之间共享数据
   * @description 可以用来存放一些全局的数据，比如用户信息，或者一些全局的状态，全局初始状态在整个 Umi 项目的最开始创建。
   * @doc https://umijs.org/docs/max/data-flow#%E5%85%A8%E5%B1%80%E5%88%9D%E5%A7%8B%E7%8A%B6%E6%80%81
   */
  initialState: {},

  /**
   * @name layout 插件
   * @doc https://umijs.org/docs/max/layout-menu
   */
  layout: {
    locale: true,
    title: 'Ant Design',
    ...defaultSettings,
  },

  /**
   * @name moment2dayjs 插件
   * @description 将项目中的 moment 替换为 dayjs
   * @doc https://umijs.org/docs/max/moment2dayjs
   */
  moment2dayjs: {
    preset: 'antd',
    plugins: ['duration'],
  },

  /**
   * @name 国际化插件
   * @doc https://umijs.org/docs/max/i18n
   */
  locale: {
    // default zh-CN
    default: 'zh-CN',
    antd: true,
    // default true, when it is true, will use `navigator.language` overwrite default
    baseNavigator: true,
  },

  /**
   * @name antd 插件
   * @description 内置了 babel import 插件
   * @doc https://umijs.org/docs/max/antd#antd
   */
  antd: {
    appConfig: {},
    configProvider: {
      theme: {
        cssVar: true,
        token: {
          colorBgLayout: '#5F3237',
          fontFamily: 'AlibabaSans, sans-serif',
        },
      },
    },
  },

  /**
   * @name 网络请求配置
   * @description 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
   * @doc https://umijs.org/docs/max/request
   */
  request: {},

  /**
   * @name 权限插件
   * @description 基于 initialState 的权限插件，必须先打开 initialState
   * @doc https://umijs.org/docs/max/access
   */
  access: {},

  /**
   * @name qiankun 微前端插件
   * @description 配置主应用
   * @doc https://umijs.org/docs/max/micro-frontend
   */
  qiankun: {
    master: {
      apps: [
        {
          // 🔥注意：这个 name 必须和你 routes.ts 里的 microApp: 'jquery-app' 保持一致
          name: 'micro-app',

          // 🔥🔥【修改】这里不填 https://... 而是填上面的代理路径
          // 浏览器请求 /api-old-app/... -> Umi 转发给 test.suifuda.com/...
          entry: '//192.168.0.104:8002',
        },
      ],
      sandbox: {
        experimentalStyleIsolation: true,
      },
    },
  },

  /**
   * @name <head> 中额外的 script
   * @description 配置 <head> 中额外的 script
   */
  headScripts: [
    // 解决首次加载时白屏的问题
    { src: join(PUBLIC_PATH, 'scripts/loading.js'), async: true },
  ],

  //================ pro 插件配置 =================
  presets: ['umi-presets-pro'],
  mock: false,

  /**
   * @name 是否开启 mako
   * @description 使用 mako 极速研发
   * @doc https://umijs.org/docs/api/config#mako
   */
  mako: {},
  esbuildMinifyIIFE: true,
  requestRecord: {},
  exportStatic: {},
  define: {
    'process.env.CI': process.env.CI,
    __DEV_BYPASS_AUTH__: process.env.UMI_APP_BYPASS_AUTH === 'true',
    __API_BASE__: process.env.REACT_APP_API_BASE,
    __TENCENT_MAP_KEY__: process.env.REACT_APP_TENCENT_MAP_KEY,
  },
});
