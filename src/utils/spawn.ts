/**
 * 统一的子进程执行封装，处理跨平台命令拆分与日志。
 */
import crossSpawn from "cross-spawn";
import { formatPathForDisplay } from "./path";
import type { Translator } from "../i18n";

export interface SpawnOptions {
  cwd?: string;
  verbose?: boolean;
  translator?: Translator;
}

interface ParsedCommand {
  command: string;
  args: string[];
}

/**
 * 将命令行字符串拆分为命令与参数，支持简单的引号场景。
 */
export function parseCommand(
  commandLine: string,
  translator?: Translator
): ParsedCommand {
  const tokens = commandLine
    .trim()
    .match(/(?:[^\s"']+|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')+/g) ?? [];
  const cleaned = tokens.map((token) =>
    token
      .replace(/^"|"$/g, "")
      .replace(/^'|'$/g, "")
      .replace(/\\(["'])/g, "$1")
  );
  const [command, ...args] = cleaned;
  if (!command) {
    const message = translator
      ? translator("spawn.missingCommand")
      : "未提供可执行命令";
    throw new Error(message);
  }
  return { command, args };
}

/**
 * 直接执行命令字符串。
 */
export function spawnCommand(commandLine: string, options: SpawnOptions = {}): Promise<number> {
  const parsed = parseCommand(commandLine, options.translator);
  return spawnWithArgs(parsed.command, parsed.args, options);
}

/**
 * 执行命令并返回退出码。
 */
export function spawnWithArgs(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<number> {
  const { cwd, verbose, translator } = options;
  if (verbose) {
    const location = cwd ? ` @ ${formatPathForDisplay(cwd)}` : "";
    const argsText = args.length ? ` ${args.join(" ")}` : "";
    const message = translator
      ? translator("spawn.verbose", {
          command,
          args: argsText,
          location,
        })
      : `执行命令: ${command}${argsText}${location}`;
    console.log(message.trim());
  }

  return new Promise((resolve, reject) => {
    const child = crossSpawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (signal) {
        const message = translator
          ? translator("spawn.signal", { signal })
          : `子进程因信号 ${signal} 终止`;
        console.warn(message);
      }
      resolve(code ?? 0);
    });
  });
}
