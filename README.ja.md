# ACS - AI Code Starter

<div align="center">

![npm version](https://img.shields.io/npm/v/@yestarz/ai-code-starter)
![license](https://img.shields.io/npm/l/@yestarz/ai-code-starter)
![node version](https://img.shields.io/node/v/@yestarz/ai-code-starter)

マルチ言語対応のコマンドラインから、お気に入りの AI コーディングツールを任意のプロジェクトディレクトリで呼び出せます。

</div>

## 📖 概要
ACS は複数言語に対応した CLI で、プロジェクト一覧の管理と `CodeX`・`Claude Code`・`Gemini` などの AI ツール起動をまとめて行えます。`acs lang` で中国語・英語・日本語を即時に切り替えられます。

## ✨ 特長
- 🗂️ **プロジェクト管理**：よく使うディレクトリを素早く呼び出し
- 🔧 **AI ツール統合**：1 コマンドでお好みの CLI を起動
- 💻 **マルチプラットフォーム**対応（Windows / macOS / Linux）
- 🎯 **対話的な操作**で迷わず利用可能
- 🔒 **安全設計**：設定ファイルを自動バックアップ
- 🌍 **多言語 UI**：`acs lang` で `zh` / `en` / `ja` を切替

## 🚀 はじめに
### インストール
```bash
npm install -g @yestarz/ai-code-starter

# ソースからビルドする場合
git clone <repository-url>
cd ai-code-starter
npm install
npm run build
npm link
```

### 初回実行
以下のコマンドで自動的に `~/.acs/config.json` が生成されます：
```bash
acs ls
```

## 📋 コマンド
### 🔍 プロジェクト一覧
```bash
acs list
acs ls --json
```

### ➕ プロジェクト追加
```bash
acs add
```
- インタラクティブにパスを入力
- パスの存在チェック
- 重複登録を防止

### ❌ プロジェクト削除
```bash
acs remove
acs rm
```
- 複数選択で削除
- 確認ダイアログ
- 失敗時の自動ロールバック

### 🚀 AI ツール起動
```bash
acs code
```
1. プロジェクトを選択
2. CLI ツールを選択
3. プロジェクトディレクトリで実行

### 🌐 表示言語の変更
```bash
acs lang ja
acs lang
```
利用可能なコード: `zh` / `en` / `ja`。

## ⚙️ 設定ファイル
`~/.acs/config.json` の例：
```json
{
  "language": "ja",
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

## 💡 利用例
```bash
$ acs add
? プロジェクトのパスを入力 › /Users/dev/my-react-app
追加しました: my-react-app -> /Users/dev/my-react-app

$ acs ls
合計 1 件のプロジェクト:
1. my-react-app -> /Users/dev/my-react-app

$ acs lang zh
语言已切换为 中文
```

## 🔧 開発・テスト
```bash
npm run dev
npm run build
npm test
acs ls --verbose
```
