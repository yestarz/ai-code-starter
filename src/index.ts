/**
 * CLI 入口，负责解析命令、处理全局选项并分发到具体命令实现。
 */
import { bold, cyan, gray, red } from "colorette";
import pkg from "../package.json";
import { createLogger } from "./utils/logger";
import {
  CliArguments,
  CommandContext,
  CommandHandler,
  CommandResult,
} from "./types";
import { runList } from "./commands/list";
import { runRemove } from "./commands/remove";
import { runCode } from "./commands/code";
import { runAdd } from "./commands/add";

interface CommandDefinition {
  name: string;
  aliases: string[];
  description: string;
  handler: CommandHandler;
}

const commandDefinitions: CommandDefinition[] = [
  {
    name: "list",
    aliases: ["ls"],
    description: "列出已登记的项目",
    handler: runList,
  },
  {
    name: "remove",
    aliases: ["rm"],
    description: "删除一个或多个项目",
    handler: runRemove,
  },
  {
    name: "code",
    aliases: [],
    description: "在项目目录下执行指定 CLI",
    handler: runCode,
  },
  {
    name: "add",
    aliases: [],
    description: "添加新的项目记录",
    handler: runAdd,
  },
];

interface ParsedArguments extends CliArguments {
  commandName?: string;
}

function coerceFlagValue(value: string): string | boolean {
  const lowered = value.toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;
  return value;
}

function parseCli(rawArgs: string[]): ParsedArguments {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let commandName: string | undefined;
  let afterDoubleDash = false;

  for (const arg of rawArgs) {
    if (afterDoubleDash) {
      positional.push(arg);
      continue;
    }

    if (arg === "--") {
      afterDoubleDash = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const [rawKey, rawValue] = arg.slice(2).split("=", 2);
      if (rawKey.startsWith("no-")) {
        flags[rawKey.slice(3)] = false;
        continue;
      }
      flags[rawKey] =
        rawValue === undefined ? true : coerceFlagValue(rawValue);
      continue;
    }

    if (arg.startsWith("-")) {
      const letters = arg.slice(1).split("");
      letters.forEach((letter) => {
        flags[letter] = true;
      });
      continue;
    }

    if (!commandName) {
      commandName = arg;
    } else {
      positional.push(arg);
    }
  }

  return { commandName, flags, positional };
}

function findCommand(name: string): CommandDefinition | undefined {
  return commandDefinitions.find(
    (command) =>
      command.name === name || command.aliases.some((alias) => alias === name)
  );
}

function showHelp(): void {
  console.log(bold(`acs ${pkg.version}`));
  console.log("用法：acs <命令> [选项]");
  console.log("可用命令：");
  commandDefinitions.forEach((command) => {
    const aliasDisplay = command.aliases.length
      ? gray(` (别名: ${command.aliases.join(", ")})`)
      : "";
    console.log(`  ${bold(command.name)}${aliasDisplay} - ${command.description}`);
  });
  console.log("\n常用选项：");
  console.log("  --verbose/-v  输出调试信息");
  console.log("  --json        列表命令输出原始 JSON");
  console.log("  --help/-h     查看帮助信息");
}

async function executeCommand(
  command: CommandDefinition,
  args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  return command.handler(args, context);
}

async function main(): Promise<void> {
  const [, , ...argv] = process.argv;
  const parsed = parseCli(argv);
  const verboseFlag = parsed.flags.verbose === true || parsed.flags.v === true;
  const helpFlag = parsed.flags.help === true || parsed.flags.h === true;
  const versionFlag = parsed.flags.version === true;

  const logger = createLogger(Boolean(verboseFlag));
  const context: CommandContext = {
    verbose: Boolean(verboseFlag),
    logger,
  };

  if (versionFlag) {
    console.log(pkg.version);
    return;
  }

  if (!parsed.commandName || helpFlag) {
    showHelp();
    return;
  }

  const command = findCommand(parsed.commandName);
  if (!command) {
    logger.error(`未知命令：${parsed.commandName}`);
    showHelp();
    process.exitCode = 1;
    return;
  }

  try {
    const commandArgs: CliArguments = {
      flags: parsed.flags,
      positional: parsed.positional,
    };
    const result = await executeCommand(command, commandArgs, context);
    if (result.message) {
      console.log(result.message);
    }
    process.exitCode = result.code;
  } catch (error) {
    logger.error(`命令执行失败：${(error as Error).message}`);
    if (context.verbose && error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(red(`未捕获的错误：${(error as Error).message}`));
  process.exit(1);
});
