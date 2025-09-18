export type Language = "zh" | "en" | "ja";

type MessageCatalog = Record<Language, Record<string, string>>;

export type MessageValues = Record<string, string | number>;

export type Translator = (key: MessageKey, values?: MessageValues) => string;

const messageCatalog: MessageCatalog = {
  zh: {
    "command.list.description": "列出已登记的项目",
    "command.remove.description": "删除一个或多个项目",
    "command.code.description": "在项目目录下执行指定 CLI",
    "command.add.description": "添加新的项目记录",
    "command.lang.description": "选择 CLI 显示语言",
    "help.usage": "用法：acs <命令> [选项]",
    "help.availableCommands": "可用命令：",
    "help.alias": "（别名: {aliases}）",
    "help.commonOptions": "常用选项：",
    "help.option.verbose": "--verbose/-v  输出调试信息",
    "help.option.json": "--json        列表命令输出原始 JSON",
    "help.option.help": "--help/-h     查看帮助信息",
    "errors.unknownCommand": "未知命令：{name}",
    "errors.commandFailed": "命令执行失败：{message}",
    "errors.unhandled": "未捕获的错误：{message}",
    "errors.config.readFailed": "配置文件 {path} 无法读取，请手动检查",
    "errors.config.invalid": "配置文件格式错误：{errors}",
    "errors.config.writeFailed": "写入配置失败：{message}",
    "errors.config.noDetails": "未提供详细信息",
    "errors.config.rootPath": "配置根",
    "errors.config.issue": "{path}: {message}",
    "errors.projectNameRequired": "项目名称不能为空",
    "errors.projectPathRequired": "项目路径不能为空",
    "errors.cliNameRequired": "CLI 名称不能为空",
    "errors.cliCommandRequired": "CLI 命令不能为空",
    "list.empty": "暂无项目。可通过 `acs add` 添加新的项目。",
    "list.summary": "共 {count} 个项目：",
    "list.entry": "{index}. {name} -> {path}",
    "list.debugCount": "当前配置包含 {count} 条记录",
    "remove.none": "当前没有可删除的项目",
    "remove.promptSelect": "选择要删除的项目",
    "remove.promptConfirm": "确认删除 {count} 个项目吗？",
    "remove.cancelledNoSelection": "未选择任何项目，操作已取消",
    "remove.cancelled": "已取消删除操作",
    "remove.success": "已删除 {count} 个项目：{names}",
    "remove.debugDetails": "删除的项目详情：{details}",
    "add.promptPath": "请输入项目路径",
    "add.validate.notExists": "路径不存在，请重新输入",
    "add.validate.notDirectory": "目标不是目录",
    "add.validate.unexpected": "验证路径时出现错误：{message}",
    "add.duplicatePath": "该路径已存在于配置中，确定仍要重复添加吗？",
    "add.duplicateName": "存在同名项目，是否继续？",
    "add.cancelled": "已取消添加操作",
    "add.success": "添加成功：{name} -> {path}",
    "code.noProjects": "当前没有项目，请先通过 `acs add` 添加。",
    "code.noCli": "CLI 列表为空，请编辑 {path} 添加可用 CLI。",
    "code.promptProject": "选择需要进入的项目",
    "code.projectMissing": "选择的项目不存在，可能配置已变更。",
    "code.promptCli": "选择要运行的 CLI",
    "code.execute": "将在 {project} 中执行 {cli}",
    "code.projectMissingSuffix": " [路径不存在]",
    "code.projectMissingLabel": "路径不存在",
    "spawn.verbose": "执行命令: {command}{args}{location}",
    "spawn.signal": "子进程因信号 {signal} 终止",
    "spawn.missingCommand": "未提供可执行命令",
    "lang.prompt": "选择 CLI 显示语言",
    "lang.invalid": "不支持的语言：{input}。可选值：{supported}",
    "lang.already": "当前已使用 {language}",
    "lang.updated": "语言已切换为 {language}",
    "lang.choiceCurrent": "（当前）",
    "language.zh": "中文",
    "language.en": "英语",
    "language.ja": "日语",
    "logger.debugLabel": "调试",
  },
  en: {
    "command.list.description": "List registered projects",
    "command.remove.description": "Remove one or more projects",
    "command.code.description": "Run a CLI inside the project directory",
    "command.add.description": "Add a new project entry",
    "command.lang.description": "Select CLI language",
    "help.usage": "Usage: acs <command> [options]",
    "help.availableCommands": "Available commands:",
    "help.alias": "(alias: {aliases})",
    "help.commonOptions": "Common options:",
    "help.option.verbose": "--verbose/-v  Enable verbose logging",
    "help.option.json": "--json        Print raw JSON for list",
    "help.option.help": "--help/-h     Show this help message",
    "errors.unknownCommand": "Unknown command: {name}",
    "errors.commandFailed": "Command failed: {message}",
    "errors.unhandled": "Unhandled error: {message}",
    "errors.config.readFailed": "Failed to read config file {path}. Please check it manually.",
    "errors.config.invalid": "Invalid config file format: {errors}",
    "errors.config.writeFailed": "Failed to write config: {message}",
    "errors.config.noDetails": "No additional details",
    "errors.config.rootPath": "root",
    "errors.config.issue": "{path}: {message}",
    "errors.projectNameRequired": "Project name is required",
    "errors.projectPathRequired": "Project path is required",
    "errors.cliNameRequired": "CLI name is required",
    "errors.cliCommandRequired": "CLI command is required",
    "list.empty": "No projects yet. Run `acs add` to register one.",
    "list.summary": "Total {count} project(s):",
    "list.entry": "{index}. {name} -> {path}",
    "list.debugCount": "Config contains {count} record(s)",
    "remove.none": "There are no projects to remove.",
    "remove.promptSelect": "Select projects to remove",
    "remove.promptConfirm": "Remove {count} project(s)?",
    "remove.cancelledNoSelection": "No project selected. Operation cancelled.",
    "remove.cancelled": "Removal cancelled.",
    "remove.success": "Removed {count} project(s): {names}",
    "remove.debugDetails": "Removed project details: {details}",
    "add.promptPath": "Enter project path",
    "add.validate.notExists": "Path not found. Please try again.",
    "add.validate.notDirectory": "The target is not a directory.",
    "add.validate.unexpected": "Failed to validate the path: {message}",
    "add.duplicatePath": "This path already exists in the config. Add it again?",
    "add.duplicateName": "A project with the same name exists. Continue?",
    "add.cancelled": "Add operation cancelled.",
    "add.success": "Added: {name} -> {path}",
    "code.noProjects": "No projects available. Run `acs add` first.",
    "code.noCli": "CLI list is empty. Edit {path} to add available tools.",
    "code.promptProject": "Select a project",
    "code.projectMissing": "Selected project is missing. The config may have changed.",
    "code.promptCli": "Select a CLI to run",
    "code.execute": "Running {cli} inside {project}",
    "code.projectMissingSuffix": " [missing]",
    "code.projectMissingLabel": "missing",
    "spawn.verbose": "Executing: {command}{args}{location}",
    "spawn.signal": "Child process exited due to signal {signal}",
    "spawn.missingCommand": "No executable command provided",
    "lang.prompt": "Choose CLI language",
    "lang.invalid": "Unsupported language: {input}. Supported values: {supported}",
    "lang.already": "{language} is already active.",
    "lang.updated": "Language switched to {language}",
    "lang.choiceCurrent": "(current)",
    "language.zh": "Chinese",
    "language.en": "English",
    "language.ja": "Japanese",
    "logger.debugLabel": "debug",
  },
  ja: {
    "command.list.description": "登録済みのプロジェクトを一覧表示",
    "command.remove.description": "プロジェクトを削除",
    "command.code.description": "プロジェクトディレクトリで CLI を実行",
    "command.add.description": "新しいプロジェクトを追加",
    "command.lang.description": "CLI の表示言語を選択",
    "help.usage": "使い方: acs <コマンド> [オプション]",
    "help.availableCommands": "利用可能なコマンド:",
    "help.alias": "（別名: {aliases}）",
    "help.commonOptions": "主なオプション:",
    "help.option.verbose": "--verbose/-v  詳細ログを表示",
    "help.option.json": "--json        list コマンドで JSON を出力",
    "help.option.help": "--help/-h     ヘルプを表示",
    "errors.unknownCommand": "不明なコマンドです: {name}",
    "errors.commandFailed": "コマンドの実行に失敗しました: {message}",
    "errors.unhandled": "未処理のエラー: {message}",
    "errors.config.readFailed": "設定ファイル {path} を読み込めません。手動で確認してください。",
    "errors.config.invalid": "設定ファイルの形式が正しくありません: {errors}",
    "errors.config.writeFailed": "設定ファイルの書き込みに失敗しました: {message}",
    "errors.config.noDetails": "詳細情報はありません",
    "errors.config.rootPath": "ルート",
    "errors.config.issue": "{path}: {message}",
    "errors.projectNameRequired": "プロジェクト名は必須です",
    "errors.projectPathRequired": "プロジェクトパスは必須です",
    "errors.cliNameRequired": "CLI 名は必須です",
    "errors.cliCommandRequired": "CLI コマンドは必須です",
    "list.empty": "プロジェクトがありません。`acs add` で追加してください。",
    "list.summary": "合計 {count} 件のプロジェクト:",
    "list.entry": "{index}. {name} -> {path}",
    "list.debugCount": "設定には {count} 件のレコードが含まれています",
    "remove.none": "削除できるプロジェクトがありません",
    "remove.promptSelect": "削除するプロジェクトを選択",
    "remove.promptConfirm": "{count} 件のプロジェクトを削除しますか?",
    "remove.cancelledNoSelection": "プロジェクトが選択されていません。操作を中止しました。",
    "remove.cancelled": "削除を中止しました",
    "remove.success": "{count} 件のプロジェクトを削除しました: {names}",
    "remove.debugDetails": "削除したプロジェクトの詳細: {details}",
    "add.promptPath": "プロジェクトのパスを入力",
    "add.validate.notExists": "パスが見つかりません。再入力してください。",
    "add.validate.notDirectory": "ディレクトリではありません。",
    "add.validate.unexpected": "パスの検証に失敗しました: {message}",
    "add.duplicatePath": "このパスは既に登録されています。続行しますか?",
    "add.duplicateName": "同名のプロジェクトが存在します。続行しますか?",
    "add.cancelled": "追加を中止しました",
    "add.success": "追加しました: {name} -> {path}",
    "code.noProjects": "プロジェクトがありません。まず `acs add` を実行してください。",
    "code.noCli": "CLI リストが空です。{path} を編集してツールを追加してください。",
    "code.promptProject": "プロジェクトを選択",
    "code.projectMissing": "選択したプロジェクトが見つかりません。設定が変更された可能性があります。",
    "code.promptCli": "実行する CLI を選択",
    "code.execute": "{project} で {cli} を実行します",
    "code.projectMissingSuffix": " [パスが存在しません]",
    "code.projectMissingLabel": "パスが存在しません",
    "spawn.verbose": "実行中: {command}{args}{location}",
    "spawn.signal": "子プロセスがシグナル {signal} により終了しました",
    "spawn.missingCommand": "実行可能なコマンドが指定されていません",
    "lang.prompt": "CLI の表示言語を選択",
    "lang.invalid": "サポートされていない言語です: {input}。利用可能: {supported}",
    "lang.already": "{language} はすでに利用中です",
    "lang.updated": "言語を {language} に切り替えました",
    "lang.choiceCurrent": "（現在）",
    "language.zh": "中国語",
    "language.en": "英語",
    "language.ja": "日本語",
    "logger.debugLabel": "デバッグ",
  },
};

export type MessageKey = keyof typeof messageCatalog.zh;

function resolveTemplate(language: Language, key: MessageKey): string {
  const catalog = messageCatalog[language];
  return catalog[key] ?? messageCatalog.zh[key] ?? key;
}

function formatTemplate(template: string, values?: MessageValues): string {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (fullMatch, token) => {
    if (Object.prototype.hasOwnProperty.call(values, token)) {
      const value = values[token];
      return value === undefined || value === null ? "" : String(value);
    }
    return fullMatch;
  });
}

export function translate(
  language: Language,
  key: MessageKey,
  values?: MessageValues
): string {
  const template = resolveTemplate(language, key);
  return formatTemplate(template, values);
}

export function createTranslator(language: Language): Translator {
  return (key, values) => translate(language, key, values);
}

export function isSupportedLanguage(value: string | undefined | null): value is Language {
  if (!value) {
    return false;
  }
  return (messageCatalog as MessageCatalog)[value as Language] !== undefined;
}

export const supportedLanguages: Language[] = Object.keys(messageCatalog) as Language[];

export function getLanguageDisplayName(language: Language, translator: Translator): string {
  return translator(`language.${language}` as MessageKey);
}

