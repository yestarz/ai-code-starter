现在要增加ai命令行工具的配置切换和管理功能，假设~/.acs/config.json的内容为：

```json
{
  "language": "zh",
  "projects": [
    {
      "name": "tea-api",
      "path": "D:\\code\\my\\tea-api"
    },
    {
      "name": "tea-admin",
      "path": "D:\\code\\my\\tea-admin"
    },
    {
      "name": "ai-cli-starter",
      "path": "D:\\code\\my\\ai-cli-starter"
    }
  ],
  "cli": [
    {
      "name": "OpenAI CodeX",
      "command": "codex --dangerously-bypass-approvals-and-sandbox"
    },
    {
      "name": "Claude Code",
      "command": "claude"
    }
  ],
  "config":{
	  "claude":{
		  "current":"duck",
		  "configs":{
			  "duck":{
				  "env": {
				  "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
				  "ANTHROPIC_BASE_URL": "https://jp.duckcoding.com",
				  "API_TIMEOUT_MS": "600000",
				  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
				  "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "32000"
			  },
			  "model": "claude-sonnet-4-5-20250929"
			  }
		  }
	  }
  }
}
```

现在需要实现以下几个命令：
acs config claude current：获取当前的claude配置，显示配置名称，ANTHROPIC_BASE_URL、ANTHROPIC_AUTH_TOKEN（打码）以及model

acs config claude list(ls)：显示所有的claude配置，显示配置名称，ANTHROPIC_BASE_URL、ANTHROPIC_AUTH_TOKEN（打码）以及model

acs config claude use [profile]：修改`~/.claude/settings.json`文件，只覆盖配置文件中有的属性

例如，当前`~/.claude/settings.json`配置文件的内容为：

```json
"env": {
      "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
      "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
      "API_TIMEOUT_MS": "600000",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
      "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "32000"
    },
    "model": "deepseek-chat",
    "permissions": {
      "allow": [],
      "deny": []
    },
    "statusLine": {
      "type": "command",
      "command": "npx -y ccstatusline@latest",
      "padding": 0
    }
```

那么只修改`env`和`model`属性（~/.acs/config.json中只配置了这两个属性），其他的`permissions`和`statusLine`不要动