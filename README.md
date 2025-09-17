# ACS - AI Code Starter

<div align="center">

![npm version](https://img.shields.io/npm/v/@yestarz/ai-code-starter)
![license](https://img.shields.io/npm/l/@yestarz/ai-code-starter)
![node version](https://img.shields.io/node/v/@yestarz/ai-code-starter)

快速启动项目并调用各种 AI 编码工具的统一入口。无需手动切换到项目目录，一条命令即可在任意项目下启动 `CodeX`、`Claude Code`、`Gemini Cli` 等 AI 工具。

</div>

## ✨ 功能特性

- 🗂️ **项目管理**：统一管理常用项目路径，快速切换工作目录
- 🔧 **CLI 集成**：一键调用各种 AI 编码助手（Codex、ClaudeCode、Gemini 等）
- 💻 **跨平台支持**：完美适配 Windows、macOS 和 Linux
- 🎯 **交互式操作**：友好的命令行交互界面，直观易用
- 🔒 **安全可靠**：自动备份配置文件，操作前二次确认
- ⚡ **高效便捷**：一条命令即可在指定项目下启动 AI 工具

## 🚀 快速开始

### 安装

```bash
# 全局安装
npm install -g @yestarz/ai-code-starter

# 或者克隆源码本地构建
git clone <repository-url>
cd ai-cli-starter
npm install
npm run build
npm link
```

### 首次使用

安装完成后，运行任意命令将自动创建配置文件：

```bash
acs ls
```

这将在 `~/.acs/config.json` 创建默认配置文件。

## 📋 命令指南

### 🔍 查看项目列表

```bash
# 查看所有项目
acs list
# 或使用别名
acs ls

# 输出 JSON 格式（适合脚本处理）
acs ls --json
```

### ➕ 添加新项目

```bash
acs add
```

交互式添加项目：
- 输入项目路径（支持相对/绝对路径）
- 自动检测路径有效性
- 从路径自动提取项目名
- 检测重复项目并提供确认选项

### ❌ 删除项目

```bash
acs remove
# 或使用别名
acs rm
```

安全删除流程：
- 多选要删除的项目
- 二次确认避免误操作
- 自动创建配置备份
- 操作失败时自动回滚

### 🚀 启动 AI 工具

```bash
acs code
```

智能工作流：
1. 选择目标项目
2. 选择 AI 编码工具
3. 自动切换到项目目录
4. 启动选定的 AI 工具
5. 完整继承输入输出，支持交互

## ⚙️ 配置文件

配置文件位于 `~/.acs/config.json`，结构如下：

```json
{
  "projects": [
    {
      "name": "my-web-app",
      "path": "/Users/username/code/my-web-app"
    },
    {
      "name": "api-server", 
      "path": "D:\\code\\projects\\api-server"
    }
  ],
  "cli": [
    {
      "name": "Codex",
      "command": "codex"
    },
    {
      "name": "Claude Code",
      "command": "claude"
    },
    {
      "name": "Gemini Cli",
      "command": "gemin"
    }
  ]
}
```

### 配置说明

- **projects**: 项目列表
  - `name`: 项目显示名称
  - `path`: 项目绝对路径（自动规范化）

- **cli**: AI 工具列表  
  - `name`: 工具显示名称
  - `command`: 执行命令（支持带参数）

## 💡 使用示例

### 典型工作流

```bash
# 1. 添加项目
$ acs add
? 请输入项目路径 › /Users/dev/my-react-app
✅ 添加成功：my-react-app -> /Users/dev/my-react-app

# 2. 查看项目列表
$ acs ls
共 1 个项目：
1. my-react-app -> /Users/dev/my-react-app

# 3. 在项目中启动 AI 工具
$ acs code
? 选择项目 › my-react-app (/Users/dev/my-react-app)
? 选择 CLI 工具 › Cursor
正在启动 Cursor...
```

### 批量管理

```bash
# 删除多个项目
$ acs rm
? 选择要删除的项目 › 
  ◯ project-1
  ◉ old-project
  ◉ temp-project
? 确认删除选中的 2 个项目？ › Yes
✅ 成功删除 2 个项目
```

## 🔧 开发与测试

### 开发环境

```bash
# 开发模式（热重载）
npm run dev

# 构建项目
npm run build

# 运行测试
npm test

# 启用详细日志
acs ls --verbose
```

### 测试覆盖

项目包含完整的单元测试和集成测试：
- ✅ 配置文件读写
- ✅ 项目增删查改
- ✅ 跨平台路径处理
- ✅ 错误处理与回滚
- ✅ 命令行参数解析

## ❓ 常见问题

### 安装问题

**Q: `npm link` 需要管理员权限怎么办？**
```bash
# Windows: 以管理员身份运行终端
# 或使用 npx 运行
npx @yestarz/ai-code-starter ls
```

**Q: 命令找不到怎么办？**
```bash
# 检查全局安装
npm list -g @yestarz/ai-code-starter

# 重新链接
npm unlink -g @yestarz/ai-code-starter
npm link
```

### 路径问题

**Q: Windows 路径格式如何输入？**

支持多种格式，工具会自动规范化：
- `C:\code\project` ✅
- `C:/code/project` ✅  
- `C:\\code\\project` ✅

**Q: 相对路径支持吗？**

支持，但会自动转换为绝对路径存储。

### 工具配置

**Q: CLI 列表为空怎么办？**

手动编辑配置文件添加 AI 工具：
```bash
# 打开配置文件
code ~/.acs/config.json

# 或查看配置文件位置
acs ls --verbose
```

**Q: 如何添加自定义 AI 工具？**

在 `cli` 数组中添加新条目：
```json
{
  "name": "My Custom AI",
  "command": "my-ai-tool --interactive"
}
```

## 📝 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'feat: 添加某个牛逼功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

<div align="center">

如果这个工具对你有帮助，请给个 ⭐ Star 支持一下！

Made with ❤️ for developers

</div>

