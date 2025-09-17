/**
 * 定义工具所需的核心类型与命令返回结构。
 */
import type { Logger } from "./utils/logger";

export interface Project {
  name: string;
  path: string;
}

export interface CliTool {
  name: string;
  command: string;
}

export interface AcsConfig {
  projects: Project[];
  cli: CliTool[];
}

export interface CommandContext {
  verbose: boolean;
  logger: Logger;
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
