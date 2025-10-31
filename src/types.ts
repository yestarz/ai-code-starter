/**
 * 定义工具所需的核心类型与命令返回结构。
 */
import type { Translator, Language } from "./i18n";
import type { Logger } from "./utils/logger";

export interface Project {
  name: string;
  path: string;
}

export interface CliTool {
  name: string;
  command: string;
  order?: number;
}

export interface ClaudeProfile {
  env?: Record<string, string>;
  model?: string;
}

export interface ClaudeConfig {
  current?: string;
  configs: Record<string, ClaudeProfile>;
}

export interface ProviderConfigs {
  claude?: ClaudeConfig;
  [key: string]: unknown;
}

export interface AcsConfig {
  projects: Project[];
  cli: CliTool[];
  language: Language;
  config: ProviderConfigs;
}

export interface CommandContext {
  verbose: boolean;
  logger: Logger;
  language: Language;
  t: Translator;
}

export interface CliArguments {
  flags: Record<string, string | boolean>;
  positional: string[];
}

export type CommandHandler = (
  args: CliArguments,
  context: CommandContext
) => Promise<CommandResult> | CommandResult;

export interface CommandResult {
  code: number;
  message?: string;
}
