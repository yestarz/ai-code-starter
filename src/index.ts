/**
 * CLI 入口，负责解析命令、处理全局选项并分发到具体命令实现。
 */
import { bold, gray, red } from "colorette";
import pkg from "../package.json";
import { createLogger, type Logger } from "./utils/logger";
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
import { runLang } from "./commands/lang";
import { readConfig, ConfigError, type ConfigErrorIssue } from "./config";
import {
  createTranslator,
  type MessageKey,
  type Translator,
  type Language,
} from "./i18n";

interface CommandDefinition {
  name: string;
  aliases: string[];
  descriptionKey: MessageKey;
  handler: CommandHandler;
}

const commandDefinitions: CommandDefinition[] = [
  {
    name: "list",
    aliases: ["ls"],
    descriptionKey: "command.list.description",
    handler: runList,
  },
  {
    name: "remove",
    aliases: ["rm"],
    descriptionKey: "command.remove.description",
    handler: runRemove,
  },
  {
    name: "code",
    aliases: [],
    descriptionKey: "command.code.description",
    handler: runCode,
  },
  {
    name: "add",
    aliases: [],
    descriptionKey: "command.add.description",
    handler: runAdd,
  },
  {
    name: "lang",
    aliases: [],
    descriptionKey: "command.lang.description",
    handler: runLang,
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

function showHelp(translator: Translator): void {
  console.log(bold(`acs ${pkg.version}`));
  console.log(translator("help.usage"));
  console.log(translator("help.availableCommands"));
  commandDefinitions.forEach((command) => {
    const aliasDisplay = command.aliases.length
      ? gray(
          translator("help.alias", {
            aliases: command.aliases.join(", "),
          })
        )
      : "";
    console.log(
      `  ${bold(command.name)}${aliasDisplay} - ${translator(
        command.descriptionKey
      )}`
    );
  });
  console.log("");
  console.log(translator("help.commonOptions"));
  console.log(`  ${translator("help.option.verbose")}`);
  console.log(`  ${translator("help.option.json")}`);
  console.log(`  ${translator("help.option.help")}`);
}

function formatConfigIssues(
  issues: ConfigErrorIssue[],
  translator: Translator
): string {
  if (!issues.length) {
    return translator("errors.config.noDetails");
  }
  return issues
    .map((issue) =>
      translator("errors.config.issue", {
        path: issue.path || translator("errors.config.rootPath"),
        message: translator(issue.messageKey as MessageKey),
      })
    )
    .join("; ");
}

function handleConfigError(
  error: ConfigError,
  logger: Logger,
  translator: Translator
): void {
  const { details } = error;
  switch (error.code) {
    case "read_failed":
      logger.error(
        translator("errors.config.readFailed", { path: details?.path ?? "" })
      );
      break;
    case "invalid_format": {
      const formatted = details?.issues
        ? formatConfigIssues(details.issues, translator)
        : translator("errors.config.noDetails");
      logger.error(
        translator("errors.config.invalid", { errors: formatted })
      );
      break;
    }
    case "write_failed": {
      const message =
        details?.errorMessage ??
        (error.cause instanceof Error ? error.cause.message : "");
      logger.error(translator("errors.config.writeFailed", { message }));
      break;
    }
    default:
      logger.error(error.message);
  }
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

  let language: Language = "zh";
  let translator = createTranslator(language);
  let logger = createLogger(Boolean(verboseFlag), translator);

  try {
    const config = readConfig();
    language = config.language;
    translator = createTranslator(language);
    logger = createLogger(Boolean(verboseFlag), translator);
  } catch (error) {
    if (error instanceof ConfigError) {
      handleConfigError(error, logger, translator);
    } else {
      logger.error(
        translator("errors.commandFailed", {
          message: (error as Error).message,
        })
      );
    }
    process.exitCode = 1;
    return;
  }

  const context: CommandContext = {
    verbose: Boolean(verboseFlag),
    logger,
    language,
    t: translator,
  };

  if (versionFlag) {
    console.log(pkg.version);
    return;
  }

  if (!parsed.commandName || helpFlag) {
    showHelp(translator);
    return;
  }

  const command = findCommand(parsed.commandName);
  if (!command) {
    logger.error(
      translator("errors.unknownCommand", { name: parsed.commandName })
    );
    showHelp(translator);
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
    if (error instanceof ConfigError) {
      handleConfigError(error, logger, translator);
    } else {
      logger.error(
        translator("errors.commandFailed", {
          message: (error as Error).message,
        })
      );
    }
    if (context.verbose && error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const fallbackTranslator = createTranslator("zh");
  console.error(
    red(
      fallbackTranslator("errors.unhandled", {
        message: (error as Error).message,
      })
    )
  );
  process.exit(1);
});
