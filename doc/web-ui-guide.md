# ACS Web UI 使用指南

## 概述

ACS Web UI 提供了一个基于浏览器的图形化界面，让你可以通过友好的界面管理项目、CLI 工具和 AI 配置，无需记忆命令行参数。

## 启动 Web UI

### 基本启动

```bash
acs ui
```

执行后会：
1. 启动本地 Web 服务器（默认端口 8888）
2. 自动在浏览器打开 `http://localhost:8888`
3. 保持服务运行直到你按 `Ctrl+C` 退出

### 自定义启动选项

```bash
# 指定端口
acs ui --port=9000

# 指定主机地址（允许局域网访问）
acs ui --host=0.0.0.0 --port=8888

# 禁止自动打开浏览器
acs ui --no-open

# 组合使用
acs ui --port=9000 --no-open
```

## 功能模块

### 1. 项目管理

在项目管理模块中，你可以：

- **查看项目列表**：以表格形式展示所有已添加的项目
- **搜索项目**：通过名称或路径快速查找项目
- **添加项目**：点击"添加项目"按钮，填写项目名称和路径
- **删除项目**：点击项目对应的"删除"按钮移除项目

#### 添加项目示例

1. 点击页面右上角的"➕ 添加项目"按钮
2. 在弹出的表单中填写：
   - 项目名称：`my-react-app`
   - 项目路径：`D:\code\my-react-app`
3. 点击"添加"按钮
4. 成功后会显示成功提示，并自动刷新列表

### 2. CLI 工具管理

在 CLI 工具管理模块中，你可以：

- **查看工具列表**：展示所有配置的 CLI 工具
- **搜索工具**：通过工具名称或命令快速查找
- **添加工具**：配置新的 CLI 工具
- **编辑工具**：修改现有工具的名称和命令
- **删除工具**：移除不需要的工具

#### 添加 CLI 工具示例

1. 点击"➕ 添加工具"按钮
2. 填写表单：
   - 工具名称：`Cursor AI`
   - 命令：`cursor`
3. 点击"添加"按钮

#### 编辑 CLI 工具

1. 点击工具对应的"✏️ 编辑"按钮
2. 修改名称或命令
3. 点击"保存"按钮

### 3. Claude 配置管理

在配置管理模块中，你可以：

- **查看当前配置**：以卡片形式展示当前使用的 Claude 配置
- **查看所有配置**：列出所有可用的配置 profile
- **切换配置**：一键切换到不同的配置
- **添加配置**：创建新的 Claude 配置 profile
- **删除配置**：移除不需要的配置

#### 当前配置展示

当前配置卡片会显示：
- ⭐ 配置名称（标记为当前）
- Base URL（完整显示）
- Auth Token（部分打码显示，如 `sk-5***...***9NY8`）
- Model 信息

#### 添加 Claude 配置

1. 点击"➕ 添加配置"按钮
2. 填写表单：
   - **配置名称**：`production`
   - **ANTHROPIC_BASE_URL**：`https://api.anthropic.com`
   - **ANTHROPIC_AUTH_TOKEN**：`sk-ant-...` （你的 API Token）
   - **Model**：`claude-3-5-sonnet-20241022`（可选）
3. 点击"添加"按钮

#### 切换配置

1. 在配置列表中找到目标配置
2. 点击对应的"🔄 使用"按钮
3. 系统会自动：
   - 更新 `~/.acs/config.json` 中的 `current` 字段
   - 同步配置到 `~/.claude/settings.json`
4. 切换成功后，当前配置卡片会更新

## 界面特性

### 实时搜索过滤

每个模块都提供了搜索框，输入关键字即可实时过滤数据：
- 项目模块：搜索项目名称或路径
- CLI 工具模块：搜索工具名称或命令
- 配置模块：搜索配置名称

### 响应式设计

Web UI 采用响应式设计，支持：
- 桌面浏览器（推荐使用 Chrome、Edge、Firefox）
- 平板设备
- 移动设备浏览器

### 友好的错误提示

所有操作都会给出清晰的反馈：
- ✓ 成功提示（绿色）
- ✕ 错误提示（红色）
- ⚠ 警告提示（黄色）
- ℹ 信息提示（蓝色）

### 数据验证

表单提交前会进行验证：
- 必填字段检查
- 重复数据检测
- 格式合法性验证

## API 接口

Web UI 基于 RESTful API 构建，如果你需要自定义集成，可以直接调用这些接口：

### 项目管理 API

```bash
# 获取项目列表
GET /api/projects

# 添加项目
POST /api/projects
Content-Type: application/json
{"name": "project-name", "path": "/path/to/project"}

# 删除项目
DELETE /api/projects/:name
```

### CLI 工具管理 API

```bash
# 获取工具列表
GET /api/cli

# 添加工具
POST /api/cli
{"name": "tool-name", "command": "command"}

# 编辑工具
PUT /api/cli/:name
{"name": "new-name", "command": "new-command"}

# 删除工具
DELETE /api/cli/:name
```

### Claude 配置管理 API

```bash
# 获取当前配置
GET /api/config/claude/current

# 获取所有配置
GET /api/config/claude/list

# 切换配置
POST /api/config/claude/use
{"profile": "profile-name"}

# 添加配置
POST /api/config/claude/add
{"name": "profile-name", "profile": {...}}

# 编辑配置
PUT /api/config/claude/:name
{"profile": {...}}

# 删除配置
DELETE /api/config/claude/:name
```

所有 API 返回格式：
```json
{
  "success": true,
  "data": {...}
}
```

或错误时：
```json
{
  "success": false,
  "error": "错误描述"
}
```

## 技术栈

- **后端**：Node.js HTTP 服务器（纯净实现，无额外依赖）
- **前端**：原生 JavaScript + HTML + CSS
- **UI 框架**：Ant Design 风格（通过自定义 CSS 实现）
- **数据交互**：RESTful API + Fetch

## 安全说明

- Web UI 默认只监听本地回环地址（127.0.0.1），仅本机可访问
- 如需局域网访问，使用 `--host=0.0.0.0`，但请注意网络安全
- Claude Auth Token 在界面中会进行打码显示，保护敏感信息
- 所有配置变更会自动备份，失败时可回滚

## 故障排查

### 端口被占用

```bash
错误：端口 8888 已被占用
解决：acs ui --port=9000
```

### 浏览器无法自动打开

```bash
# 手动访问
http://localhost:8888

# 或使用 --no-open 选项避免报错
acs ui --no-open
```

### API 请求失败

1. 检查服务是否正常运行
2. 打开浏览器开发者工具查看网络请求
3. 查看终端输出的错误日志
4. 使用 `--verbose` 选项获取详细日志：`acs ui --verbose`

## 与 CLI 命令对比

| 功能 | CLI 命令 | Web UI 操作 |
|------|----------|-------------|
| 查看项目 | `acs list` | 打开"项目管理"标签页 |
| 添加项目 | `acs add` | 点击"添加项目"按钮 |
| 删除项目 | `acs remove` | 点击项目的"删除"按钮 |
| 查看 CLI 工具 | `acs cli list` | 打开"CLI 工具"标签页 |
| 添加工具 | `acs cli add` | 点击"添加工具"按钮 |
| 编辑工具 | `acs cli edit` | 点击工具的"编辑"按钮 |
| 查看 Claude 配置 | `acs config claude list` | 打开"配置管理"标签页 |
| 切换配置 | `acs config claude use <name>` | 点击配置的"使用"按钮 |

## 总结

ACS Web UI 提供了一个直观、美观的图形界面，让配置管理变得更加简单。无论你是喜欢命令行的开发者，还是更习惯图形界面的用户，ACS 都能满足你的需求。

