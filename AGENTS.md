# AGENTS.md — React + Ant Design Pro / @umijs/max 项目规则（Codex 必读）

> 目标：让 Codex **不跑偏**（只改本仓库、最小改动、不乱加依赖）+ **不乱码**（UTF-8 全链路）。

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

### 4.6 按钮样式统一规则

1. 新页面里的 Ant Design `Button` 默认使用组件自身的中等尺寸，不允许为了“统一”在业务页面里写死 `height: 32px`、`height: 40px`、固定 `padding`、固定 `min-width` 或固定 `line-height`。
2. 普通按钮视觉上保持圆形/胶囊按钮：统一由 `src/styles/overrides.less` 给普通 `.ant-btn` 设置 `border-radius: 999px`，业务页面不要重复写圆角。
3. 主按钮、查询按钮、保存按钮、新增/添加/创建按钮优先只使用 Ant Design 属性控制层级，例如 `type="primary"`、`danger`、`disabled`、`loading`；颜色、hover/focus/active 交给 Ant Design token，不在页面样式里写死 `background` / `border-color` / `color`。
4. 特殊按钮可以单独保留尺寸，但必须有明确场景和局部类名，不能污染普通按钮：
   - 登录页提交按钮是特殊按钮，固定走 `src/pages/user/login/index.less` 的 `.submitBtn.ant-btn`，保持登录页自己的 42px 高度和 8px 圆角，不能被全局胶囊按钮规则影响。
   - 顶部 route tag、头部圆形操作按钮、更多按钮等属于头部特殊组件，保留现有 32px 圆形/标签样式，不按普通业务按钮处理。
   - 图标穿梭/箭头类按钮如果是固定正方形操作位，可以保留局部宽高，但必须限定在弹窗/组件内部选择器。
5. “关联角色”这类添加辅助按钮使用虚线边框、透明背景、主题主色文字；不要给它写固定高度，默认跟 Ant Design Button 尺寸走。
6. `Button type="link"`、表格行内操作链接、普通文本链接继续按 link token 走，不套普通胶囊按钮样式。
7. 后续如果同类按钮继续增多，优先抽离成公共类或公共组件；禁止在各页面复制粘贴一套按钮高度、圆角、颜色。

### 4.7 Loading 规范

1. 全局 loading 只用于应用初始化、权限菜单加载、路由级阻塞场景。
2. 页面首屏且结构明确时，使用骨架屏，不再叠加全局 loading。
3. 列表查询、卡片刷新、tab 切换等局部请求，使用区域级 loading。
4. 保存、删除、提交等用户操作，使用按钮 loading，并禁止重复点击。
5. 同一层级同一时刻只允许一种 loading 表现，禁止重复套用。
6. 首次进入和再次刷新必须区分：首次可骨架，刷新优先局部 loading。
7. 能局部反馈就不要全局反馈，能按钮反馈就不要页面反馈。
8. loading、empty、error 三态必须互斥，禁止“加载中显示空态”或“报错时伪装成空态”。
9. 再次刷新默认保留旧内容，不允许请求一开始就清空列表/卡片再闪回。
10. 每个异步请求必须绑定唯一 loading 归属，禁止同一请求同时驱动按钮、区域、页面多个 loading。

#### 新页面落地要求

1. 列表页至少拆分 `initialLoading` 和 `refreshing`，禁止只用一个 `loading` 同时覆盖首屏和刷新。
2. 首屏骨架优先放在内容区或卡片区，不要给整个页面再套一层 Spin。
3. 区域级 loading 优先给表格、卡片、图表本体，不要给外层页面容器再包一层 Spin。
4. 查询按钮、保存按钮、删除按钮的 loading 只能绑定当前操作，不得顺带驱动列表或整页 loading。
5. 请求失败时：
   - 首次无数据：显示 error 态。
   - 已有旧数据：保留旧数据，只提示错误，不清空内容。
6. 弹窗内遵循同样规则：
   - 搜索类操作优先区域级 loading。
   - 提交类操作优先按钮或 `confirmLoading`。
   - 禁止一个弹窗内同时按钮 loading + 区域 loading 指向同一次请求。
7. 接口消息透出默认要求：
   - 只要是表单提交、弹窗确认、按钮触发的增删改查、状态切换、绑定/解绑、批量操作，成功和失败都必须优先提示后端返回的 `message / msg / errorMessage`。
   - 禁止仅提示固定文案后吞掉真实后端信息；后端有返回时必须原样透给用户。
   - 页面侧默认复用统一消息提取逻辑，避免每个页面各自手写一套。
   - 如果操作类接口当前需要在成功后读取后端 `message`，API 层不要直接丢弃完整响应。
8. 新页面如果出现重复的骨架、区域 loading、错误态结构，优先抽成公共组件后再继续铺页面。

### 4.8 设备列表页约定

1. `/device/*` 下新增管理页，优先复用现有设备页结构：`ExpandableFilterCard` + `content-card` 表格区 + `PageSectionSkeleton`。
2. 设备列表页的业务主按钮、行内操作按钮，必须统一走 `PermissionButton` 或 `PermissionVisible`，禁止直接写裸按钮绕过按钮码。
3. 页面内统一声明 `XXX_PERMS` 常量集中管理按钮码，命名和后端资源路径保持一致，例如打印机场景使用 `admin:device:printer:*`。
4. 设备 iframe 映射页面新增路由时，`backendPathUrls` 必须补真实后端模块路径；打印机管理固定使用 `/device/printer`。
5. 设备列表页视觉风格统一对齐现有 `speaker-list` / `speaker-brand`：筛选卡片、主按钮、表格圆角卡片、暗黑模式适配都优先复用同一套写法。

### 4.9 页面高度与导航对齐规范

1. 新增管理页、列表详情页、左右分栏页时，页面主体卡片底部必须和左侧导航卡片视觉高度对齐，不能出现内容卡片明显短一截或底部留白不一致。
2. 当前主布局内容区有 `16px` padding，页面如果需要占满内容区剩余高度，优先使用 `min-height: calc(100vh - 96px)` 作为页面根容器高度基线，而不是随意写 `calc(100vh - xxxpx)`。
3. 有“筛选卡片 + 下方内容卡片”的页面，根容器必须用纵向 flex：筛选卡片固定高度，下方列表/详情区域 `flex: 1` 自动撑满剩余空间。
4. 左右分栏页面必须先区分职责：如果左右都是并列内容卡片，可以由同一个 grid/flex 行拉伸对齐；如果左侧只是列表、导航、步骤或筛选入口，左侧列表卡片要独立计算高度并内部滚动，底部可以按页面可用高度对齐系统侧边栏/导航卡片底部，但禁止通过左右 grid/flex 拉伸把它和右侧详情卡片绑定在一起。右侧详情卡片按自己的内容和滚动规则处理，不能反向决定左侧列表高度。
5. 带左侧步骤/左侧列表/固定筛选区的页面必须固定页面外壳：根容器 `height: calc(100vh - 96px)` + `overflow: hidden`，只允许右侧内容区、列表区或表单区内部滚动；禁止让整页跟着滚动导致左侧导航或步骤区失去意义。
6. 固定外壳页面必须隐藏浏览器级滚动条，只保留业务内容容器内部滚动；进入页面时可给 `html`/`body` 加页面级 class，离开时必须清理，禁止影响其他页面。不要只写 `body { overflow: hidden; }`，还要检查 `#root`、`.ant-pro-layout`、`.ant-pro-layout-container`、`.ant-pro-layout-content` 等真实滚动/撑高容器；外层内容区要 `overflow: hidden`，具体卡片、表格、详情或表单区才允许 `overflow-y: auto`。
7. 新增/编辑这类长表单页面，标题栏和操作按钮固定在顶部，左侧步骤固定，表单主体单独 `overflow-y: auto`；滚动时不能把左侧步骤和顶部操作一起滚走。左右布局容器只负责摆放，不能用左右 grid/flex 拉伸绑定步骤卡片和表单卡片高度；右侧表单区要像列表页左侧卡片一样独立按页面可用高度计算。
8. flex/grid 固定高度页面要把高度链路写完整：外层 `flex: 1; height: 0; min-height: 0; overflow: hidden`，真正滚动的卡片/表单 `height: 100%; min-height: 0; overflow-y: auto`。如果滚动容器内部用纵向 flex 堆卡片，卡片必须 `flex: 0 0 auto`，禁止被 flex 压缩后导致“看起来超出但不能滚”。禁止为了解决不能滚而放开浏览器、ProLayout 或页面根容器滚动。
9. hover、选中、禁用、空态、操作按钮位置都要和截图/现有页面保持一致；这类小细节属于验收项，不是后续优化项。

### 4.10 主题变量与语义色边界

1. 默认强调态才跟全局主题主色走，包括：主按钮、当前选中、普通 hover/active、侧边栏当前菜单、顶部 route tag、用户下拉当前身份、首页图表主色等。
2. 自定义样式必须优先使用 Ant Design CSS 变量或项目变量：
   - 主色：`var(--ant-color-primary)` / `var(--ant-color-primary-bg)` / `var(--ant-color-primary-hover)`
   - 文本：`var(--ant-color-text)` / `var(--ant-color-text-secondary)` / `var(--ant-color-text-tertiary)`
   - 背景：`var(--ant-color-bg-container)` / `var(--ant-color-bg-layout)` / `var(--ant-color-bg-elevated)`
   - 边框：`var(--ant-color-border)` / `var(--ant-color-border-secondary)` / `var(--ant-color-split)`
   - 项目别名优先使用 `src/global.less` 内的 `--pc-*` 变量，例如 `--pc-color-link`、`--pc-sider-panel-bg`
3. 禁止在页面里写死主色值，例如 `#1677ff`、`#1890ff`、`#4096ff`。如果是默认强调态，用 `primary` token；如果是链接，用 link token；如果是业务语义色，用对应语义 token。
4. 危险/成功/警告不能跟主题主色走，必须保留语义：
   - 危险：`var(--ant-color-error)` / `var(--ant-color-error-bg)` / `var(--ant-color-error-border)`
   - 成功：`var(--ant-color-success)` / `var(--ant-color-success-bg)` / `var(--ant-color-success-border)`
   - 警告：`var(--ant-color-warning)` / `var(--ant-color-warning-bg)` / `var(--ant-color-warning-border)`
5. `Button type="link"`、普通文本链接、表格行内普通操作链接固定走 link token：`var(--pc-color-link)` / `var(--pc-color-link-hover)` / `var(--pc-color-link-active)`，不要跟 `colorPrimary` 变。危险链接必须继续用 `danger` 或 `error` token。
6. 显式 `Tag color="blue/green/red/orange/success/warning/error"` 属于业务分类/状态色，不能强行改成主题主色。只有没有语义、表示“当前选中/默认强调”的自定义 tag 才允许走 `primary` token。
7. 暗黑模式只在 `src/styles/theme-dark.less` 里补充 `body.theme-black-mode` 覆盖，仍然遵循同样边界：默认强调态走主色弱背景，危险/成功/警告/link 保持各自 token。
8. 如果发现某块切主题色不变，先判断它是不是“默认强调态”。是，再改成 `primary` token；不是，不要为了统一视觉而污染语义色。

---

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
