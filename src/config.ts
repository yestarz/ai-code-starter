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
import { normalizePath } from "./utils/path";

const CONFIG_DIR_NAME = ".acs";
const CONFIG_FILE_NAME = "config.json";

const projectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空"),
  path: z.string().min(1, "项目路径不能为空"),
});

const cliSchema = z.object({
  name: z.string().min(1, "CLI 名称不能为空"),
  command: z.string().min(1, "CLI 命令不能为空"),
});

const configSchema = z.object({
  projects: z.array(projectSchema).default([]),
  cli: z.array(cliSchema).default([]),
});

const DEFAULT_CONFIG: AcsConfig = {
  projects: [],
  cli: [
    {
      name: "CodeX",
      command: "codex",
    },
    {
      name: "Claude Code",
      command: "claude",
    },
    {
      name: "Gemini Cli",
      command: "gemini",
    }
  ],
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
    writeJsonFileSync(filePath, DEFAULT_CONFIG);
  }

  const raw = readJsonFileSync<unknown>(filePath);
  if (!raw) {
    throw new Error(`配置文件 ${filePath} 无法读取，请手动检查`);
  }

  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`配置文件格式错误：${messages}`);
  }

  // 归一化路径，提升跨平台一致性
  const normalizedProjects: Project[] = parsed.data.projects.map((project) => ({
    ...project,
    path: normalizePath(project.path),
  }));

  return {
    projects: normalizedProjects,
    cli: parsed.data.cli,
  };
}

/**
 * 写入配置文件，写前自动备份，写失败时回滚。
 */
export function writeConfig(next: AcsConfig): void {
  const filePath = getConfigPath();
  const backupPath = resolveBackupFile();
  const data = configSchema.parse(next);
  backupFileSync(filePath, backupPath);
  try {
    writeJsonFileSync(filePath, data);
    removeFileIfExists(backupPath);
  } catch (error) {
    restoreBackupSync(backupPath, filePath);
    throw new Error(`写入配置失败：${(error as Error).message}`);
  }
}

export function getBackupPath(): string {
  return resolveBackupFile();
}

