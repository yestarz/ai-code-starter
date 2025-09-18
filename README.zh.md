# ACS - AI Code Starter

<div align="center">

![npm version](https://img.shields.io/npm/v/@yestarz/ai-code-starter)
![license](https://img.shields.io/npm/l/@yestarz/ai-code-starter)
![node version](https://img.shields.io/node/v/@yestarz/ai-code-starter)

多语言的统一命令行入口，帮助你在任何项目目录中快速唤起常用 AI 编码工具。

</div>

## 📖 简介
ACS 提供统一的 CLI 入口来管理本地项目，并一键启动 `CodeX`、`Claude Code`、`Gemini` 等 AI 编码工具。支持中文、英文、日语界面，可通过 `acs lang` 命令即时切换。

## ✨ 功能特性
- 🗂️ **项目管理**：集中管理常用项目路径，秒级切换目录
- 🔧 **CLI 集成**：一条命令唤起多种 AI 助手
- 💻 **跨平台支持**：兼容 Windows、macOS、Linux
- 🎯 **交互式体验**：友好的命令行询问流程
- 🔒 **安全可靠**：自动备份配置，出现异常可快速回滚
- 🌍 **多语言界面**：支持 `zh` / `en` / `ja`，`acs lang` 即时切换

## 🚀 快速开始
### 安装
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

### 首次使用
运行任意命令会自动创建 `~/.acs/config.json`：
```bash
acs ls
```

## 📋 命令指南
### 🔍 查看项目列表
```bash
acs list
acs ls --json # 输出 JSON 结果
```

### ➕ 添加新项目
```bash
acs add
```
- 交互式输入项目路径
- 自动校验路径是否存在
- 避免重复记录

### ❌ 删除项目
```bash
acs remove
acs rm
```
- 多选删除
- 二次确认
- 失败自动回滚

### 🚀 启动 AI 工具
```bash
acs code
```
1. 选择项目
2. 选择 CLI 工具
3. 自动切换目录并执行命令

### 🌐 切换显示语言
```bash
# 直接指定语言代码
acs lang en

# 或进入交互式选择
acs lang
```
支持 `zh`（中文）、`en`（English）、`ja`（日本語）。

## ⚙️ 配置文件
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

## 💡 示例流程
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

## 🔧 开发与测试
```bash
npm run dev   # 开发模式
npm run build # 打包
npm test      # 运行测试
acs ls --verbose # 显示调试日志
```
