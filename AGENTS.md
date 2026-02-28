# AGENTS.md — React + Ant Design Pro / @umijs/max 项目规则（Codex 必读）

> 目标：让 Codex **不跑偏**（只改本仓库、最小改动、不乱加依赖）+ **不乱码**（UTF-8 全链路）。

---

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
