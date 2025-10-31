/**
 * 负责配置文件读取、写入、校验与备份回滚逻辑。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  backupFileSync,
  ensureDirSync,
  readJsonFileSync,
  removeFileIfExists,
  restoreBackupSync,
  writeJsonFileSync,
} from "./utils/fs";
import { AcsConfig, Project } from "./types";
import type { Language } from "./i18n";
import { normalizePath } from "./utils/path";

const CONFIG_DIR_NAME = ".acs";
const CONFIG_FILE_NAME = "config.json";

const languageSchema = z.enum(["zh", "en", "ja"]).default("zh");

const projectSchema = z.object({
  name: z.string().min(1, "errors.projectNameRequired"),
  path: z.string().min(1, "errors.projectPathRequired"),
});

const cliSchema = z.object({
  name: z.string().min(1, "errors.cliNameRequired"),
  command: z.string().min(1, "errors.cliCommandRequired"),
  order: z.number().int().nonnegative().optional(),
});

const claudeProfileSchema = z
  .object({
    env: z.record(z.string(), z.string()).optional(),
    model: z.string().min(1, "errors.claude.modelRequired").optional(),
  })
  .passthrough();

const claudeConfigSchema = z
  .object({
    current: z.string().min(1, "errors.claude.currentRequired").optional(),
    configs: z
      .record(
        z.string().min(1, "errors.claude.profileNameRequired"),
        claudeProfileSchema
      )
      .default({}),
  })
  .transform((value) => ({
    current: value.current,
    configs: value.configs ?? {},
  }));

const providerConfigSchema = z
  .object({
    claude: claudeConfigSchema.optional(),
  })
  .passthrough()
  .default({});

const configSchema = z.object({
  language: languageSchema,
  projects: z.array(projectSchema).default([]),
  cli: z.array(cliSchema).default([]),
  config: providerConfigSchema,
});

export type ConfigErrorCode = "read_failed" | "invalid_format" | "write_failed";

export interface ConfigErrorIssue {
  path: string;
  messageKey: string;
}

export interface ConfigErrorDetails {
  path?: string;
  issues?: ConfigErrorIssue[];
  cause?: unknown;
  errorMessage?: string;
}

export class ConfigError extends Error {
  public cause?: unknown;

  constructor(
    public code: ConfigErrorCode,
    public details: ConfigErrorDetails = {}
  ) {
    super(code);
    this.name = "ConfigError";
    if (details.cause) {
      this.cause = details.cause;
    }
  }
}

const DEFAULT_LANGUAGE: Language = "zh";

const DEFAULT_CONFIG: AcsConfig = {
  language: DEFAULT_LANGUAGE,
  projects: [],
  cli: [
    {
      name: "CodeX",
      command: "codex",
      order: 1,
    },
    {
      name: "Claude Code",
      command: "claude",
      order: 2,
    },
    {
      name: "Gemini Cli",
      command: "gemini",
      order: 3,
    },
  ],
  config: {},
};

function resolveConfigDir(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

function resolveConfigFile(): string {
  return path.join(resolveConfigDir(), CONFIG_FILE_NAME);
}

function resolveBackupFile(): string {
  return `${resolveConfigFile()}.bak`;
}

/**
 * 返回配置文件的绝对路径，若目录不存在则自动创建。
 */
export function getConfigPath(): string {
  const configDir = resolveConfigDir();
  ensureDirSync(configDir);
  return resolveConfigFile();
}

/**
 * 读取配置文件并进行结构校验，必要时自动初始化。
 */
export function readConfig(): AcsConfig {
  const filePath = getConfigPath();
  if (!fs.existsSync(filePath)) {
    try {
      writeJsonFileSync(filePath, DEFAULT_CONFIG);
    } catch (error) {
      throw new ConfigError("write_failed", {
        path: filePath,
        cause: error,
        errorMessage: (error as Error).message,
      });
    }
  }

  const raw = readJsonFileSync<unknown>(filePath);
  if (!raw) {
    throw new ConfigError("read_failed", { path: filePath });
  }

  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const issues: ConfigErrorIssue[] = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      messageKey: issue.message,
    }));
    throw new ConfigError("invalid_format", { path: filePath, issues });
  }

  // 归一化路径，提升跨平台一致性
  const normalizedProjects: Project[] = parsed.data.projects.map((project) => ({
    ...project,
    path: normalizePath(project.path),
  }));

  return {
    language: parsed.data.language,
    projects: normalizedProjects,
    cli: parsed.data.cli,
    config: parsed.data.config,
  };
}

/**
 * 写入配置文件，写前自动备份，写失败时回滚。
 */
export function writeConfig(next: AcsConfig): void {
  const filePath = getConfigPath();
  const backupPath = resolveBackupFile();
  let data: AcsConfig;
  try {
    data = configSchema.parse(next);
  } catch (error) {
    const zodError = error as z.ZodError;
    const issues: ConfigErrorIssue[] = zodError.issues.map((issue) => ({
      path: issue.path.join("."),
      messageKey: issue.message,
    }));
    throw new ConfigError("invalid_format", { path: filePath, issues, cause: error });
  }
  backupFileSync(filePath, backupPath);
  try {
    writeJsonFileSync(filePath, data);
    removeFileIfExists(backupPath);
  } catch (error) {
    restoreBackupSync(backupPath, filePath);
    throw new ConfigError("write_failed", {
      path: filePath,
      cause: error,
      errorMessage: (error as Error).message,
    });
  }
}

export function getBackupPath(): string {
  return resolveBackupFile();
}

