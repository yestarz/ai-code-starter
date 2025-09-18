# ACS - AI Code Starter

<div align="center">

![npm version](https://img.shields.io/npm/v/@yestarz/ai-code-starter)
![license](https://img.shields.io/npm/l/@yestarz/ai-code-starter)
![node version](https://img.shields.io/node/v/@yestarz/ai-code-starter)

多语言的统一命令行入口，帮助你在任何项目目录中快速唤起常用 AI 编码工具。

</div>

## 📑 目录 / Table of Contents / 目次
- [中文](#中文)
- [English](#english)
- [日本語](#日本語)

---

## 中文

### 简介
ACS 提供统一的 CLI 入口来管理本地项目，并一键启动 `CodeX`、`Claude Code`、`Gemini` 等 AI 编码工具。现在支持中文、英文、日语界面，可通过 `acs lang` 命令即时切换。

### ✨ 功能特性
- 🗂️ **项目管理**：集中管理常用项目路径，秒级切换目录
- 🔧 **CLI 集成**：一条命令唤起多种 AI 助手
- 💻 **跨平台支持**：兼容 Windows、macOS、Linux
- 🎯 **交互式体验**：友好的命令行询问流程
- 🔒 **安全可靠**：自动备份配置，出现异常可快速回滚
- 🌍 **多语言界面**：支持 `zh` / `en` / `ja`，`acs lang` 即时切换

### 🚀 快速开始
#### 安装
```bash
# 全局安装
npm install -g @yestarz/ai-code-starter

# 或者从源码构建
git clone <repository-url>
cd ai-code-starter
npm install
npm run build
npm link
```

#### 首次使用
运行任意命令会自动创建 `~/.acs/config.json`：
```bash
acs ls
```

### 📋 命令指南
#### 🔍 查看项目列表
```bash
acs list
acs ls --json # 输出 JSON 结果
```

#### ➕ 添加新项目
```bash
acs add
```
- 交互式输入项目路径
- 自动校验路径是否存在
- 避免重复记录

#### ❌ 删除项目
```bash
acs remove
acs rm
```
- 多选删除
- 二次确认
- 失败自动回滚

#### 🚀 启动 AI 工具
```bash
acs code
```
1. 选择项目
2. 选择 CLI 工具
3. 自动切换目录并执行命令

#### 🌐 切换显示语言
```bash
# 直接指定语言代码
acs lang en

# 或进入交互式选择
acs lang
```
支持 `zh`（中文）、`en`（English）、`ja`（日本語）。

### ⚙️ 配置文件
配置文件位于 `~/.acs/config.json`：
```json
{
  "language": "zh",
  "projects": [
    {
      "name": "my-web-app",
      "path": "/Users/username/code/my-web-app"
    }
  ],
  "cli": [
    {
      "name": "CodeX",
      "command": "codex"
    },
    {
      "name": "Claude Code",
      "command": "claude"
    },
    {
      "name": "Gemini Cli",
      "command": "gemini"
    }
  ]
}
```
- `language`：CLI 显示语言，默认 `zh`
- `projects`：项目列表，路径会自动规范化
- `cli`：可用的 AI 工具与其命令

### 💡 示例流程
```bash
$ acs add
? 请输入项目路径 › /Users/dev/my-react-app
✅ 添加成功：my-react-app -> /Users/dev/my-react-app

$ acs ls
共 1 个项目：
1. my-react-app -> /Users/dev/my-react-app

$ acs lang en
Language switched to English
```

### 🔧 开发与测试
```bash
npm run dev   # 开发模式
npm run build # 打包
npm test      # 运行测试
acs ls --verbose # 显示调试日志
```

---

## English

### Overview
ACS is a multi-language CLI that manages your project list and launches AI coding assistants such as `CodeX`, `Claude Code`, and `Gemini`. Use `acs lang` to switch between Chinese, English, and Japanese interfaces instantly.

### ✨ Features
- 🗂️ **Project management** for frequently used paths
- 🔧 **AI CLI integration** with one command
- 💻 **Cross-platform** support (Windows/macOS/Linux)
- 🎯 **Interactive prompts** for smooth workflows
- 🔒 **Safe operations** with automatic config backups
- 🌍 **Multi-language UI** via `acs lang`

### 🚀 Quick Start
#### Install
```bash
npm install -g @yestarz/ai-code-starter
# or build from source
```

#### First run
```bash
acs ls
```
The command initializes `~/.acs/config.json` if it does not exist.

### 📋 Command Guide
#### 🔍 List projects
```bash
acs list
acs ls --json
```

#### ➕ Add a project
```bash
acs add
```
Validates the path, prevents duplicates, and derives the project name automatically.

#### ❌ Remove projects
```bash
acs remove
acs rm
```
Multi-select with confirmation and automatic rollback.

#### 🚀 Launch an AI tool
```bash
acs code
```
Choose a project, select a CLI, and run it in the project directory.

#### 🌐 Switch language
```bash
acs lang en   # switch directly
acs lang      # interactive picker
```
Available codes: `zh`, `en`, `ja`.

### ⚙️ Configuration
`~/.acs/config.json` example:
```json
{
  "language": "en",
  "projects": [],
  "cli": [
    { "name": "CodeX", "command": "codex" },
    { "name": "Claude Code", "command": "claude" },
    { "name": "Gemini Cli", "command": "gemini" }
  ]
}
```
- `language`: current UI language (defaults to `zh`)
- `projects`: tracked project list
- `cli`: available AI tools and their executable commands

### 💡 Example
```bash
$ acs add
? Enter project path › /Users/dev/my-react-app
Added: my-react-app -> /Users/dev/my-react-app

$ acs lang ja
言語を 日本語 に切り替えました
```

### 🔧 Development & Testing
```bash
npm run dev
npm run build
npm test
acs ls --verbose
```

---

## 日本語

### 概要
ACS は複数言語対応の CLI で、プロジェクト一覧の管理と `CodeX`・`Claude Code`・`Gemini` などの AI ツール起動を一元化します。`acs lang` で日本語・英語・中国語を切り替えられます。

### ✨ 特長
- 🗂️ **プロジェクト管理**：よく使うディレクトリを素早く呼び出し
- 🔧 **AI ツール統合**：1 コマンドで好みの CLI を起動
- 💻 **マルチプラットフォーム**対応
- 🎯 **対話的な操作**で迷わず利用可能
- 🔒 **安全設計**：設定ファイルを自動バックアップ
- 🌍 **多言語 UI**：`acs lang` で即時切替

### 🚀 はじめに
#### インストール
```bash
npm install -g @yestarz/ai-code-starter
```

#### 初回実行
```bash
acs ls
```
実行すると `~/.acs/config.json` が生成されます。

### 📋 コマンド
#### 🔍 プロジェクト一覧
```bash
acs list
acs ls --json
```

#### ➕ プロジェクト追加
```bash
acs add
```
パスの検証と重複チェックを自動で行います。

#### ❌ プロジェクト削除
```bash
acs remove
acs rm
```
複数選択・確認ダイアログ・失敗時のロールバックに対応。

#### 🚀 AI ツール起動
```bash
acs code
```
プロジェクトと CLI を選択して実行します。

#### 🌐 表示言語の変更
```bash
acs lang ja
acs lang
```
利用可能: `zh` / `en` / `ja`。

### ⚙️ 設定ファイル
`~/.acs/config.json` の例：
```json
{
  "language": "ja",
  "projects": [],
  "cli": [
    { "name": "CodeX", "command": "codex" },
    { "name": "Claude Code", "command": "claude" },
    { "name": "Gemini Cli", "command": "gemini" }
  ]
}
```

### 💡 利用例
```bash
$ acs add
? プロジェクトのパスを入力 › /Users/dev/my-react-app
追加しました: my-react-app -> /Users/dev/my-react-app

$ acs lang zh
语言已切换为 中文
```

### 🔧 開発・テスト
```bash
npm run dev
npm run build
npm test
acs ls --verbose
```
