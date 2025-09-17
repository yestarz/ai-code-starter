# Repository Guidelines

## 项目结构与模块组织
本仓库面向跨平台 CLI 开发，核心源码位于 `src/`。`src/index.ts` 定义主入口与命令分发；命令实现按功能拆分在 `src/commands/`；通用工具存放在 `src/utils/`，如日志与配置加载。公共类型由 `src/types.ts` 统一声明，`src/config.ts` 负责读取默认配置。测试位于 `test/`，目前包含 `smoke.test.ts` 覆盖主要执行路径。构建产物输出到 `dist/`（使用 `tsup` 自动生成），请勿手工修改。

## 构建、测试与开发命令
- `npm install`：安装依赖，确保本地环境与 CI 保持一致。
- `npm run dev`：使用 `tsx` 在本地直接运行 TypeScript 源码，适合调试。
- `npm run build`：调用 `tsup` 打包为 CommonJS，并生成类型声明。
- `npm test`：通过 `vitest` 跑全部测试，必要时附加 `--watch` 持续监听。

## 编码风格与命名规范
启用 TypeScript 严格模式，统一使用 ES Module 语法。推荐两个空格缩进，限制行宽 <=100 字符。函数与变量采用小驼峰命名，类与枚举使用大驼峰，常量保持全大写加下划线。提交前确保注释、日志使用简洁中文，避免冗余 `console` 输出；当前未集成自动格式化工具，建议在 IDE 中启用 Prettier 或等效方案。

## 测试规范
测试框架为 `vitest`，新增功能至少补充一个单元或集成测试。测试文件命名遵循 `*.test.ts` 并放置在 `test/`，可按命令模块建立子目录。保持关键路径覆盖率不低于 80%，同时覆盖 CLI 正常流与异常分支。运行测试前建议执行 `npm run build` 验证类型安全，避免接口漂移导致的隐性失败。

## 提交与合并请求指南
推荐遵循 Conventional Commits，例如 `feat: 支持批量创建任务`、`fix: 修正 Windows 路径解析`。提交信息需说明变更范围与动机。发起 Pull Request 时，请在描述中列出变更摘要、测试结果、潜在影响与相关 issue；涉及交互或输出改动应附 CLI 截图或示例命令输出。保持 PR 小而聚焦，必要时拆分多次提交以便审阅。

## 配置与安全提示
项目要求 Node.js >=18。敏感凭据通过环境变量注入，勿写入仓库；可提供 `.env.example` 共享占位配置。运行 CLI 建议在受控目录执行，操作前预览参数，执行高风险命令时优先使用 dry-run 或沙箱环境。
