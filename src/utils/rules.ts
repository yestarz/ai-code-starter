/**
 * 规则文件相关工具函数，负责路径解析、写入与备份。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { backupFileSync, ensureDirSync } from "./fs";
import { normalizePath } from "./path";

interface RuleTarget {
  fileName: string;
  globalDir: string;
}

const CLI_RULE_TARGETS: Record<string, RuleTarget> = {
  claude: {
    fileName: "CLAUDE.md",
    globalDir: ".claude",
  },
  codex: {
    fileName: "AGENTS.md",
    globalDir: ".codex",
  },
  gemini: {
    fileName: "GEMINI.md",
    globalDir: ".gemini",
  },
};

/**
 * 解析 CLI 命令，提取基础命令名用于匹配规则映射。
 */
function extractCliKey(cliCommand: string): string | null {
  const trimmed = cliCommand?.trim();
  if (!trimmed) {
    return null;
  }
  const [firstToken] = trimmed.split(/\s+/);
  if (!firstToken) {
    return null;
  }
  // 去除路径与可执行后缀影响
  const baseName = path.basename(firstToken).toLowerCase();
  return baseName.replace(/\.(exe|bat|cmd)$/u, "");
}

function resolveRuleTarget(cliCommand: string): RuleTarget | null {
  const key = extractCliKey(cliCommand);
  if (!key) {
    return null;
  }
  return CLI_RULE_TARGETS[key] ?? null;
}

export function getRuleFileName(cliCommand: string): string | null {
  const target = resolveRuleTarget(cliCommand);
  return target?.fileName ?? null;
}

export function getGlobalRuleDir(cliCommand: string): string | null {
  const target = resolveRuleTarget(cliCommand);
  if (!target) {
    return null;
  }
  return path.join(os.homedir(), target.globalDir);
}

/**
 * 写入全局规则文件并返回目标路径。
 */
export function writeGlobalRuleFile(cliCommand: string, content: string): string {
  const target = resolveRuleTarget(cliCommand);
  if (!target) {
    throw new Error("不支持的 CLI 工具");
  }
  const dir = path.join(os.homedir(), target.globalDir);
  ensureDirSync(dir);
  const filePath = path.join(dir, target.fileName);
  const backupPath = `${filePath}.bak`;
  backupFileSync(filePath, backupPath);
  fs.writeFileSync(filePath, content ?? "", "utf-8");
  return filePath;
}

/**
 * 写入项目规则文件并返回目标路径。
 */
export function writeProjectRuleFile(
  projectPath: string,
  cliCommand: string,
  content: string
): string {
  const target = resolveRuleTarget(cliCommand);
  if (!target) {
    throw new Error("不支持的 CLI 工具");
  }
  const normalizedProject = normalizePath(projectPath);
  if (!fs.existsSync(normalizedProject)) {
    throw new Error("项目路径不存在");
  }
  const stats = fs.statSync(normalizedProject);
  if (!stats.isDirectory()) {
    throw new Error("项目路径不是目录");
  }

  ensureDirSync(normalizedProject);
  const filePath = path.join(normalizedProject, target.fileName);
  const backupPath = `${filePath}.bak`;
  backupFileSync(filePath, backupPath);
  fs.writeFileSync(filePath, content ?? "", "utf-8");
  return filePath;
}
