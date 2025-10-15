
基于现有的 ACS CLI 工具，实现`acs ui`命令，执行后自动打开`http://localhost:8888`，允许用户通过 Web 界面调用和执行 ACS 的各种命令（如 `acs list`、`acs cli` 等），提供更友好、美观的图形化操作体验。

### 项目目标
- 提供 Web 界面替代命令行操作
- 支持所有现有 ACS 命令的 Web 化调用

## 功能需求


#### 1.1 项目管理模块
- **项目列表展示**：调用 `acs list` 命令，以表格形式展示所有项目
- **项目详情查看**：显示项目名称、路径、创建时间等信息
- **项目添加**：通过表单添加新项目，调用 `acs add` 命令
- **项目删除**：支持单个或批量删除项目，调用 `acs remove` 命令
- **项目搜索过滤**：支持按名称、路径等条件搜索项目

#### 1.2 CLI 工具管理模块
- **工具列表管理**：调用 `acs cli list` 显示所有 CLI 工具
- **工具添加**：通过表单添加新的 CLI 工具，调用 `acs cli add`
- **工具编辑**：修改现有工具的名称和命令，调用 `acs cli edit`
- **工具删除**：删除不需要的工具，调用 `acs cli remove`
- **工具执行**：在 Web 界面中直接执行配置的 CLI 工具

#### 1.3 配置管理模块

##### 1.3.1 Claude 配置管理（重点功能）
- **当前配置查看**：调用 `acs config claude current` 显示当前 Claude 配置
  - 显示配置名称
  - 显示 ANTHROPIC_BASE_URL（完整地址）
  - 显示 ANTHROPIC_AUTH_TOKEN（打码显示）
  - 显示 model 信息
- **配置列表管理**：调用 `acs config claude list` 显示所有 Claude 配置
  - 以表格形式展示所有配置
  - 支持配置搜索和过滤
  - 显示每个配置的详细信息（打码敏感信息）
- **配置切换**：调用 `acs config claude use [profile]` 切换配置
  - 下拉选择框选择目标配置
  - 一键切换，实时生效
  - 切换后自动更新 `~/.claude/settings.json` 文件
- **配置编辑**：通过 Web 界面编辑 Claude 配置
  - 支持添加新的配置 profile
  - 支持修改现有配置的环境变量和模型
  - 支持删除不需要的配置
  - 配置保存后自动同步到 `~/.acs/config.json`

