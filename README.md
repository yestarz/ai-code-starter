# ACS - AI Code Starter

<div align="center">

![npm version](https://img.shields.io/npm/v/@yestarz/ai-code-starter)
![license](https://img.shields.io/npm/l/@yestarz/ai-code-starter)
![node version](https://img.shields.io/node/v/@yestarz/ai-code-starter)

</div>

ACS 提供统一的 CLI 入口来管理本地项目，并一键启动 `CodeX`、`Claude Code`、`Gemini` 等 AI 编码工具

## 🌐 Documentation
- [中文文档](README.zh.md)
- [English Documentation](README.en.md)
- [日本語ドキュメント](README.ja.md)

### ✨ 功能特性
- 🗂️ **项目管理**：集中管理常用项目路径，秒级切换目录
- 🔧 **CLI 集成**：一条命令唤起多种 AI 助手
- 🎨 **图形界面**：基于 Ant Design 的 Web 管理界面，操作更直观
- 💻 **跨平台支持**：兼容 Windows、macOS、Linux
- 🎯 **交互式体验**：友好的命令行询问流程
- 🔒 **安全可靠**：自动备份配置，出现异常可快速回滚
- 🌍 **多语言界面**：支持 `zh` / `en` / `ja`，`acs lang` 即时切换

### 🆕 2.0.0 版本亮点
- 新增 `acs ui` 命令，内置可视化配置中心，在浏览器中完成项目与工具管理
- 支持表单校验、即时保存与同步刷新，配置体验更顺滑
- 扩展 UI 交互提示与状态展示，帮助快速定位配置问题

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

#### 🎨 启动图形界面
```bash
acs ui
# 或指定端口和主机
acs ui --port=9000 --host=0.0.0.0
```
- 自动在浏览器打开 Web 管理界面（默认 http://localhost:8888）
- 支持项目管理、CLI 工具管理、Claude 配置管理，并可实时保存到本地配置文件
- 使用 `--no-open` 参数禁止自动打开浏览器
- 提供美观的 Ant Design 风格界面
- 页面内置表单校验、状态提示与同步刷新，所有 CLI 功能均可通过图形界面配置完成

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
