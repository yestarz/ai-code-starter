/**
 * 提供跨平台路径解析与展示工具，确保 Windows 与类 Unix 输出一致。
 */
import os from "node:os";
import path from "node:path";

/**
 * 将包含 ~ 或混合分隔符的路径转换为绝对路径。
 */
export function normalizePath(input: string): string {
  const trimmed = input.trim();
  const expanded = trimmed.startsWith("~")
    ? path.join(os.homedir(), trimmed.slice(1))
    : trimmed;
  const withNativeSeparators = expanded.replace(/[/\\]+/g, path.sep);
  return path.resolve(withNativeSeparators);
}

/**
 * 将绝对路径转换为用于日志的统一展示格式。
 */
export function formatPathForDisplay(absolutePath: string): string {
  return absolutePath.replace(/\\/g, "/");
}
