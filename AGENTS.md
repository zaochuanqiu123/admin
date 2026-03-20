# AGENTS.md — React + Ant Design Pro / @umijs/max 项目规则（Codex 必读）

> 目标：让 Codex **不跑偏**（只改本仓库、最小改动、不乱加依赖）+ **不乱码**（UTF-8 全链路）。

---

### 4.6 新增/添加主按钮统一规则

1. 页面里凡是“新增 / 添加 / 创建”这类主操作按钮，默认统一对齐 `src/pages/set/role-permission/index.less` 里的 `.role-permission-create-btn.ant-btn` 视觉样式。
2. 禁止在业务页面里各自再写一套新增按钮样式；如果页面里已经存在同类按钮，优先直接复用统一类名或统一封装。
3. 统一样式基线：
   - `height: 40px`
   - `padding: 0 22px`
   - `border: none`
   - `border-radius: 999px`
   - `background: var(--ant-color-primary)`
   - `box-shadow: none`
   - `font-weight: 500`
   - `hover/focus` 使用 `var(--ant-color-primary-hover, var(--ant-color-primary))`
4. 如果是页面主按钮，但文案不是“新增/添加/创建”，只有在视觉层级与该按钮一致时才允许复用这套样式。
5. 后续如果同类按钮继续增多，优先抽离成公共类或公共组件，不允许继续复制粘贴样式。

## 0) Stack / 技术栈

- React 19 + Ant Design 5 + @ant-design/pro-components
- Build: @umijs/max (Max)
- Lint/Format: Biome + TypeScript (tsc)
- Terminal: **VS Code Integrated Terminal ONLY**（PowerShell 7 / `pwsh`）

---

## 1) Non-negotiable Rules（禁止跑偏）

1. **仅在当前 VS Code 工作区/本仓库内工作**。禁止 scaffold 新项目、禁止切到别的目录改文件。
2. **最小改动原则**：能局部改就不做大重构；禁止随意调整目录结构/路由结构。
3. **禁止引入新体系**：不新增 UI 框架 / 路由方案 / 状态管理体系 / 样式体系。
4. **禁止随意新增依赖**：如必须新增，先解释必要性 + 替代方案，并征得同意后再加。
5. **遵循本仓库现有模式**：pages/components/utils/hooks、umi/max 约定、qiankun 等。

---

## 2) Commands（必须使用这些脚本）

- Install：`npm i`
- Dev（推荐）：`npm run dev`（== start:dev）
- Dev（绕过登录/鉴权）：`npm run start:dev:bypass`
- Build：`npm run build`
- Preview：`npm run preview`
- Lint（必须通过）：`npm run lint`（biome lint + tsc）
- Test：`npm test` / `npm run test:coverage`

---

## 3) Execution Policy（命令执行约束）

- 所有命令 **只能** 在 VS Code 集成终端执行，且必须是 **PowerShell 7（pwsh）**。
- 所有命令 **只能** 在项目根目录执行（必须存在 `package.json`）。

---

## 4) Styling Rules（样式规范）

### 4.1 文件结构

```
src/
  styles/
    utilities.less    ← mixin + 少量原子类
    layout.less       ← 框架层布局（header/sider/content）
    overrides.less    ← antd 组件强制覆盖（带 [force] 注释）
    theme-dark.less   ← 暗黑模式（body.theme-black-mode）
  global.less         ← 只做 @import + 字体声明
  pages/
    */index.less      ← 业务页面样式（语义化类名）
```

### 4.2 核心原则

1. **Token First**：优先用 antd CSS 变量（`var(--ant-color-bg-container)`），避免硬编码颜色/尺寸
2. **Less 变量 + 语义化类名**：业务样式用 `.dashboard-card-head { gap: 12px; }` 而非原子类
3. **Mixin 复用**：高频模式提取成 mixin（如 `.mixin-flex-center()`），不输出 class
4. **少量原子类**：仅对 JSX 高频场景输出 `u-` 前缀类（如 `.u-ellipsis`），不做 Tailwind 式全量库
5. **`!important` 白名单**：仅在必要场景保留，必须加 `[force]` 注释说明原因和版本
   6 **新增页面**自定义的组件要用自定义的样式覆盖 官方的组件必须用官方的变量暗黑模式。

### 4.3 禁止事项

- ❌ 不引入 Tailwind CSS 或其他原子化框架
- ❌ 不在 mixin 里写 `!important`（调用方自己决定）
- ❌ 不过度原子化（`gap`/`margin`/`font-size` 保持语义化）
- ❌ 不随意新增 `!important`（必须先尝试加权选择器，如 `body .ant-layout-sider`）
- ❌ 不在业务页面直接覆盖 antd 组件（应在 `overrides.less` 统一处理）

### 4.4 新增页面样式时

1. 在 `pages/*/index.less` 里用语义化类名（如 `.product-card`）
2. 颜色/背景用 `var(--ant-color-*)`，圆角用 `16px`（项目设计规范）
3. 高频 flex 布局调用 `.mixin-flex-center()` 或 `.mixin-flex-between()`
4. 需要 `!important` 时先问自己：能否用 `body .xxx` 提权？能否改 `defaultSettings.ts` token？
5. 暗黑模式适配在 `theme-dark.less` 里统一处理，用 `body.theme-black-mode` 前缀
6. 保持风格统一 比如 ![alt text](image.png) 图片这种都要按照图片这种风格 来实现 全部关于这块的都要统一。

### 4.5 验收标准

- 新增选择器嵌套深度 ≤ 3 层
- `!important` 数量不增加（当前 19 个，已达标）
- 编译通过 `npm run build`从
- 核心页面视觉回归无异常

---
