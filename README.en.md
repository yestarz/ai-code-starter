# ACS - AI Code Starter

<div align="center">

![npm version](https://img.shields.io/npm/v/@yestarz/ai-code-starter)
![license](https://img.shields.io/npm/l/@yestarz/ai-code-starter)
![node version](https://img.shields.io/node/v/@yestarz/ai-code-starter)

A multi-language command-line hub that lets you launch your favorite AI coding assistants from any project folder.

</div>

## 📖 Overview
ACS centralizes project management and launches AI tools such as `CodeX`, `Claude Code`, and `Gemini` from a single CLI. Switch between Chinese, English, and Japanese interfaces instantly with `acs lang`.

## ✨ Features
- 🗂️ **Project management** for frequently used directories
- 🔧 **One-command launch** for multiple AI assistants
- 💻 **Cross-platform** (Windows, macOS, Linux)
- 🎯 **Interactive prompts** for guided workflows
- 🔒 **Safe operations** with automatic config backups
- 🌍 **Multi-language UI** via `acs lang` with `zh` / `en` / `ja`

## 🚀 Quick Start
### Install
```bash
npm install -g @yestarz/ai-code-starter

# or build from source
git clone <repository-url>
cd ai-code-starter
npm install
npm run build
npm link
```

### First Run
Running any command will create `~/.acs/config.json` automatically:
```bash
acs ls
```

## 📋 Command Guide
### 🔍 List projects
```bash
acs list
acs ls --json
```

### ➕ Add a project
```bash
acs add
```
- Interactive project path input
- Path existence validation
- Duplicate prevention

### ❌ Remove projects
```bash
acs remove
acs rm
```
- Multi-select removal
- Confirmation prompt
- Automatic rollback on failure

### 🚀 Launch an AI tool
```bash
acs code
```
1. Pick a project
2. Choose a CLI tool
3. The command runs in the project directory

### 🌐 Switch language
```bash
acs lang en   # switch directly
acs lang      # interactive picker
```
Available codes: `zh`, `en`, `ja`.

## ⚙️ Configuration
`~/.acs/config.json` example:
```json
{
  "language": "en",
  "projects": [
    {
      "name": "my-web-app",
      "path": "/Users/username/code/my-web-app"
    }
  ],
  "cli": [
    { "name": "CodeX", "command": "codex" },
    { "name": "Claude Code", "command": "claude" },
    { "name": "Gemini Cli", "command": "gemini" }
  ]
}
```
- `language`: active CLI language (defaults to `zh`)
- `projects`: tracked project list with normalized paths
- `cli`: available AI tools and their executable commands

## 💡 Example Flow
```bash
$ acs add
? Enter project path › /Users/dev/my-react-app
Added: my-react-app -> /Users/dev/my-react-app

$ acs ls
Total 1 project(s):
1. my-react-app -> /Users/dev/my-react-app

$ acs lang ja
言語を 日本語 に切り替えました
```

## 🔧 Development & Testing
```bash
npm run dev
npm run build
npm test
acs ls --verbose
```
