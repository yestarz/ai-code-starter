/**
 * 文件系统辅助函数，封装常见的同步读写与备份操作。
 */
import fs from "node:fs";
import path from "node:path";

/**
 * 递归创建目录，若已存在则忽略。
 */
export function ensureDirSync(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 读取 JSON 文件，返回解析后的对象，失败时返回 null。
 */
export function readJsonFileSync<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * 格式化写入 JSON 文件，自动创建父目录。
 */
export function writeJsonFileSync(filePath: string, value: unknown): void {
  const dir = path.dirname(filePath);
  ensureDirSync(dir);
  const serialized = JSON.stringify(value, null, 2);
  fs.writeFileSync(filePath, `${serialized}\n`, "utf-8");
}

/**
 * 将源文件备份到目标路径，若源不存在则跳过。
 */
export function backupFileSync(sourcePath: string, backupPath: string): void {
  if (!fs.existsSync(sourcePath)) {
    return;
  }
  ensureDirSync(path.dirname(backupPath));
  fs.copyFileSync(sourcePath, backupPath);
}

/**
 * 用备份文件覆盖目标文件。
 */
export function restoreBackupSync(backupPath: string, targetPath: string): void {
  if (!fs.existsSync(backupPath)) {
    return;
  }
  fs.copyFileSync(backupPath, targetPath);
}

/**
 * 安全地删除文件，不存在时忽略。
 */
export function removeFileIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
  }
}
