# qiankun 微前端配置指南

## 主应用配置（已完成）

主应用已经配置完成，包括：

- ✅ 启用 qiankun 插件
- ✅ 注册子应用信息
- ✅ 创建微应用容器页面
- ✅ 配置路由和菜单

## 子应用配置步骤

### 1. 安装依赖

如果你的子应用也是 UmiJS 项目，需要安装 qiankun 插件：

```bash
npm install @umijs/plugin-qiankun -D
# 或
yarn add @umijs/plugin-qiankun -D
# 或
pnpm add @umijs/plugin-qiankun -D
```

### 2. 配置子应用（UmiJS）

在子应用的 `config/config.ts` 中添加配置：

```typescript
export default defineConfig({
  // ... 其他配置
  qiankun: {
    slave: {},
  },
  // 配置运行时的 publicPath
  runtimePublicPath: true,
});
```

### 3. 配置子应用（非 UmiJS）

如果子应用不是 UmiJS 项目，需要手动导出生命周期函数。

#### 3.1 修改 webpack 配置

```javascript
// webpack.config.js
module.exports = {
  output: {
    library: "subapp", // 与主应用注册的 name 一致
    libraryTarget: "umd",
    chunkLoadingGlobal: "webpackJsonp_subapp",
  },
};
```

#### 3.2 导出生命周期函数

在子应用的入口文件（如 `src/index.js`）中导出生命周期函数：

```javascript
let instance = null;

// 导出生命周期函数
export async function bootstrap() {
  console.log("[subapp] bootstrap");
}

export async function mount(props) {
  console.log("[subapp] mount", props);
  // 渲染子应用
  instance = ReactDOM.render(
    <App />,
    props.container
      ? props.container.querySelector("#root")
      : document.getElementById("root")
  );
}

export async function unmount(props) {
  console.log("[subapp] unmount", props);
  // 卸载子应用
  if (instance) {
    ReactDOM.unmountComponentAtNode(
      props.container
        ? props.container.querySelector("#root")
        : document.getElementById("root")
    );
    instance = null;
  }
}

// 独立运行时
if (!window.__POWERED_BY_QIANKUN__) {
  mount({});
}
```

### 4. 配置子应用端口

确保子应用运行在 `localhost:8001` 端口，或修改主应用中的配置：

在主应用的 `src/app.ts` 中修改：

```typescript
export const qiankun = {
  apps: [
    {
      name: "subapp",
      entry: "//localhost:你的端口", // 修改为实际端口
    },
  ],
  // ...
};
```

### 5. 处理跨域问题

子应用需要配置允许跨域访问。

#### UmiJS 子应用

在 `config/config.ts` 中添加：

```typescript
export default defineConfig({
  devServer: {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
```

#### Webpack 子应用

在 `webpack.config.js` 中添加：

```javascript
module.exports = {
  devServer: {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
};
```

#### Vite 子应用

在 `vite.config.ts` 中添加：

```typescript
export default defineConfig({
  server: {
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
```

### 6. 主子应用通信

#### 主应用向子应用传递数据

在主应用的 `src/app.ts` 中：

```typescript
export const qiankun = {
  apps: [
    {
      name: "subapp",
      entry: "//localhost:8001",
      props: {
        // 传递给子应用的数据
        token: "xxx",
        userInfo: {},
      },
    },
  ],
};
```

#### 子应用接收数据

在子应用的生命周期函数中接收：

```javascript
export async function mount(props) {
  console.log("主应用传递的数据:", props);
  const { token, userInfo } = props;
  // 使用数据
}
```

### 7. 路由配置

#### 主应用路由

主应用已配置路由 `/micro-app/*`，所有以 `/micro-app/` 开头的路由都会加载子应用。

#### 子应用路由

子应用需要配置 base 路径：

**UmiJS 子应用：**

```typescript
// config/config.ts
export default defineConfig({
  base: window.__POWERED_BY_QIANKUN__ ? "/micro-app" : "/",
  publicPath: window.__POWERED_BY_QIANKUN__ ? "/micro-app/" : "/",
});
```

**React Router 子应用：**

```javascript
<BrowserRouter basename={window.__POWERED_BY_QIANKUN__ ? "/micro-app" : "/"}>
  <App />
</BrowserRouter>
```

## 测试步骤

1. 启动主应用：

   ```bash
   npm run start:dev
   ```

2. 启动子应用（在子应用目录）：

   ```bash
   npm run start
   # 或
   npm run dev
   ```

3. 访问主应用：`http://localhost:8000`

4. 点击菜单中的"微应用"，查看子应用是否正常加载

## 常见问题

### 1. 子应用加载失败

- 检查子应用是否正常运行
- 检查端口是否正确
- 检查是否配置了跨域

### 2. 样式丢失

- 确保子应用配置了 `runtimePublicPath: true`
- 检查静态资源路径是否正确

### 3. 路由不匹配

- 检查子应用的 base 路径配置
- 确保主应用路由配置了通配符 `/*`

### 4. 子应用白屏

- 打开浏览器控制台查看错误信息
- 检查生命周期函数是否正确导出
- 检查 webpack 配置是否正确

## 参考文档

- [qiankun 官方文档](https://qiankun.umijs.org/)
- [UmiJS qiankun 插件文档](https://umijs.org/docs/max/micro-frontend)
