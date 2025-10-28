# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ACS (AI Code Starter) 是一个跨平台的 CLI 工具，用于管理本地项目并一键启动 AI 编码工具（如 CodeX、Claude Code、Gemini 等）。该工具提供了统一的配置管理界面和多语言支持。

## 核心架构

### 配置系统

- **配置文件位置**: `~/.acs/config.json`
- **配置管理**: `src/config.ts` 负责所有配置的读取、写入、校验和备份
- **自动备份**: 所有写操作前会自动创建 `.bak` 文件，写失败时自动回滚
- **路径规范化**: 所有项目路径通过 `normalizePath()` 进行跨平台标准化处理
- **配置结构**:
  - `language`: 界面语言 (zh/en/ja)
  - `projects[]`: 项目列表
  - `cli[]`: CLI 工具配置
  - `config.claude`: Claude 配置管理（支持多配置切换）

### 国际化 (i18n)

- **实现位置**: `src/i18n.ts`
- **支持语言**: 中文(zh)、英语(en)、日语(ja)
- **翻译函数**: 使用 `Translator` 类型，通过 `createTranslator(language)` 创建
- **消息格式**: 支持模板变量替换，如 `"{name}: {message}"`
- **添加新文本**: 必须在 `messageCatalog` 的所有三种语言中同时添加对应的键值对

### 命令系统

- **入口**: `src/index.ts` - 负责命令解析、路由分发和错误处理
- **命令定义**: 每个命令在 `commandDefinitions` 数组中注册，包含名称、别名、描述键和处理函数
- **命令实现**: 位于 `src/commands/*.ts`，每个命令导出 `CommandHandler` 类型的函数
- **命令上下文**: `CommandContext` 包含 logger、translator、language 和 verbose 标志

主要命令:
- `list/ls`: 列出项目
- `add`: 添加项目
- `remove/rm`: 删除项目
- `code`: 选择项目并启动 CLI 工具
- `cli`: 管理 CLI 工具列表（list/add/edit/remove 子命令）
- `config`: 管理 AI 配置（当前仅支持 Claude）
- `lang`: 切换界面语言
- `ui`: 启动 Web 管理界面

### Web UI

- **服务器**: `src/ui/server.ts` - 单文件包含完整的 HTTP 服务器和内嵌 HTML/CSS/JS
- **默认端口**: 8888
- **架构**: 无需构建的纯 HTML + vanilla JS，后端提供 RESTful API
- **功能**: 项目管理、CLI 工具管理、Claude 配置管理（包括多环境切换）
- **API 路由**:
  - `/api/projects` - 项目 CRUD
  - `/api/cli/tools` - CLI 工具 CRUD
  - `/api/claude` - Claude 配置管理
  - `/api/claude/profile` - Claude 配置详情

### Claude 配置管理

- **配置切换**: 支持多个 Claude 配置 profile，可以快速切换
- **设置同步**: 切换配置时自动更新 `~/.claude/settings.json`
- **环境变量**: 支持为每个 profile 配置独立的环境变量（如 ANTHROPIC_BASE_URL、ANTHROPIC_AUTH_TOKEN）
- **模型配置**: 可为每个 profile 指定默认模型

### 工具模块

- **logger** (`src/utils/logger.ts`): 提供带颜色的日志输出
- **spawn** (`src/utils/spawn.ts`): 封装子进程执行，支持 verbose 模式
- **path** (`src/utils/path.ts`): 跨平台路径处理
- **fs** (`src/utils/fs.ts`): 文件系统操作封装
- **claude** (`src/utils/claude.ts`): Claude 设置文件管理

## 常用开发命令

```bash
# 开发模式（使用 tsx 直接运行 TypeScript）
npm run dev

# 构建生产版本（使用 tsup 打包为 CJS）
npm run build

# 运行测试（使用 vitest）
npm test

# 本地测试 CLI（构建后链接到全局）
npm run build && npm link

# 取消全局链接
npm unlink -g @yestarz/ai-code-starter
```

## 开发注意事项

### 添加新命令

1. 在 `src/commands/` 创建新文件，导出 `CommandHandler` 函数
2. 在 `src/index.ts` 的 `commandDefinitions` 数组中注册
3. 在 `src/i18n.ts` 的 `messageCatalog` 中为所有语言添加描述文本
4. 如果需要修改配置结构，更新 `src/config.ts` 中的 Zod schema

### 修改配置结构

1. 更新 `src/types.ts` 中的类型定义
2. 更新 `src/config.ts` 中的 Zod schema
3. 更新 `DEFAULT_CONFIG` 常量
4. 如果影响 Web UI，同步更新 `src/ui/server.ts` 中的 API 和前端代码

### 添加新的多语言文本

在 `src/i18n.ts` 的 `messageCatalog` 对象中，为 `zh`、`en`、`ja` 三个语言同时添加相同的键：

```typescript
const messageCatalog: MessageCatalog = {
  zh: { "your.new.key": "中文文本" },
  en: { "your.new.key": "English text" },
  ja: { "your.new.key": "日本語テキスト" },
};
```

### 错误处理

- 配置相关错误使用 `ConfigError` 类，包含 code 和 details
- 使用 `logger.error()` 输出错误信息，不直接使用 `console.error()`
- 命令返回 `CommandResult` 对象，包含 exit code 和可选消息

### 构建配置

- **tsup.config.ts**: 配置打包为 CommonJS 格式
- **banner**: 自动添加 `#!/usr/bin/env node` shebang
- **target**: Node.js 18+
- **minify**: 生产环境代码压缩
- **dts**: 生成类型声明文件

## Web UI 开发

Web UI 采用单文件架构，所有 HTML/CSS/JS 内嵌在 `src/ui/server.ts` 的 `UI_HTML` 常量中：

- 修改 UI 时直接编辑该字符串常量
- 前端使用 vanilla JavaScript（ES5 风格以确保兼容性）
- 使用 fetch API 与后端 REST API 通信
- 状态管理通过简单的 `store` 对象实现

## 测试

- 测试框架: vitest
- 测试文件: `test/*.test.ts`
- 主要测试覆盖: CLI 解析、配置管理、命令执行、语言切换

## 发布

- 包名: `@yestarz/ai-code-starter`
- 注册表: npm public
- bin 命令: `acs`
- 发布文件: 仅包含 `dist/` 目录
