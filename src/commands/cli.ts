/**
 * 实现 acs cli 命令：管理 CLI 工具清单。
 */
import inquirer from "inquirer";
import { bold, cyan, gray, green } from "colorette";
import { readConfig, writeConfig } from "../config";
import { CliArguments, CommandContext, CommandResult } from "../types";
import { type MessageKey } from "../i18n";

interface CliSubcommandDefinition {
  name: string;
  aliases: string[];
  descriptionKey: MessageKey;
  handler: (
    args: CliArguments,
    context: CommandContext
  ) => Promise<CommandResult> | CommandResult;
}

function showCliHelp(context: CommandContext): void {
  const { t } = context;
  console.log(t("cli.help.usage"));
  console.log(t("cli.help.availableCommands"));
  subcommands.forEach((command) => {
    const aliasDisplay = command.aliases.length
      ? gray(
          t("help.alias", {
            aliases: command.aliases.join(", "),
          })
        )
      : "";
    console.log(
      `  ${bold(command.name)}${aliasDisplay} - ${t(command.descriptionKey)}`
    );
  });
}

function findCliSubcommand(name: string): CliSubcommandDefinition | undefined {
  return subcommands.find(
    (command) =>
      command.name === name || command.aliases.some((alias) => alias === name)
  );
}

async function handleList(
  args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();
  const tools = config.cli;
  const { t } = context;

  if (args.flags.json) {
    console.log(JSON.stringify(tools, null, 2));
    return { code: 0 };
  }

  if (!tools.length) {
    console.log(gray(t("cli.list.empty")));
    return { code: 0 };
  }

  const sortedTools = [...tools].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.name.localeCompare(b.name);
  });

  console.log(bold(cyan(t("cli.list.summary", { count: tools.length }))));
  sortedTools.forEach((tool, index) => {
    const orderInfo = tool.order !== undefined ? ` [${tool.order}]` : "";
    const entry = t("cli.list.entry", {
      index: index + 1,
      name: bold(tool.name + orderInfo),
      command: gray(tool.command),
    });
    console.log(entry);
  });

  if (context.verbose) {
    context.logger.debug(t("cli.list.debugCount", { count: tools.length }));
  }

  return { code: 0 };
}

async function handleAdd(
  _args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();
  const { t } = context;

  const { name, command, order } = await inquirer.prompt<{
    name: string;
    command: string;
    order: string;
  }>([
    {
      type: "input",
      name: "name",
      message: t("cli.add.promptName"),
      validate(value: string) {
        return value.trim() ? true : t("cli.add.validateName");
      },
    },
    {
      type: "input",
      name: "command",
      message: t("cli.add.promptCommand"),
      validate(value: string) {
        return value.trim() ? true : t("cli.add.validateCommand");
      },
    },
    {
      type: "input",
      name: "order",
      message: t("cli.add.promptOrder"),
      default: "0",
      filter(value: string) {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num;
      },
      validate(value: number) {
        return Number.isInteger(value) && value >= 0
          ? true
          : t("cli.add.validateOrder");
      },
    },
  ]);

  const trimmedName = name.trim();
  const trimmedCommand = command.trim();

  const sameName = config.cli.find((tool) => tool.name === trimmedName);
  const sameCommand = config.cli.find(
    (tool) => tool.command === trimmedCommand
  );

  if (sameName || sameCommand) {
    const message = sameCommand
      ? t("cli.add.duplicateCommand")
      : t("cli.add.duplicateName");
    const { confirmDuplicate } = await inquirer.prompt<{
      confirmDuplicate: boolean;
    }>([
      {
        type: "confirm",
        name: "confirmDuplicate",
        message,
        default: false,
      },
    ]);

    if (!confirmDuplicate) {
      context.logger.info(t("cli.add.cancelled"));
      return { code: 0 };
    }
  }

  const nextConfig = {
    ...config,
    cli: [
      ...config.cli,
      {
        name: trimmedName,
        command: trimmedCommand,
        order,
      },
    ],
  };

  writeConfig(nextConfig);

  context.logger.info(
    green(
      t("cli.add.success", {
        name: bold(trimmedName),
        command: trimmedCommand,
      })
    )
  );

  return { code: 0 };
}

async function handleEdit(
  _args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();
  const tools = config.cli;
  const { t } = context;

  if (!tools.length) {
    context.logger.warn(t("cli.edit.none"));
    return { code: 0 };
  }

  const choices = tools.map((tool, index) => ({
    name: `${tool.name} (${tool.command})`,
    value: index,
  }));

  const { selectedIndex } = await inquirer.prompt<{
    selectedIndex: number;
  }>([
    {
      type: "list",
      name: "selectedIndex",
      message: t("cli.edit.promptSelect"),
      choices,
    },
  ]);

  const target = tools[selectedIndex];
  if (!target) {
    throw new Error(t("cli.edit.notFound"));
  }

  const { name, command, order } = await inquirer.prompt<{
    name: string;
    command: string;
    order: string;
  }>([
    {
      type: "input",
      name: "name",
      message: t("cli.edit.promptName"),
      default: target.name,
      validate(value: string) {
        return value.trim() ? true : t("cli.edit.validateName");
      },
    },
    {
      type: "input",
      name: "command",
      message: t("cli.edit.promptCommand"),
      default: target.command,
      validate(value: string) {
        return value.trim() ? true : t("cli.edit.validateCommand");
      },
    },
    {
      type: "input",
      name: "order",
      message: t("cli.edit.promptOrder"),
      default: String(target.order ?? 0),
      filter(value: string) {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num;
      },
      validate(value: number) {
        return Number.isInteger(value) && value >= 0
          ? true
          : t("cli.edit.validateOrder");
      },
    },
  ]);

  const trimmedName = name.trim();
  const trimmedCommand = command.trim();

  const currentOrder = target.order ?? 0;
  if (
    trimmedName === target.name &&
    trimmedCommand === target.command &&
    order === currentOrder
  ) {
    context.logger.info(t("cli.edit.noChanges"));
    return { code: 0 };
  }

  const conflictName = tools.find(
    (tool, index) => index !== selectedIndex && tool.name === trimmedName
  );
  const conflictCommand = tools.find(
    (tool, index) => index !== selectedIndex && tool.command === trimmedCommand
  );

  if (conflictName || conflictCommand) {
    const message = conflictCommand
      ? t("cli.edit.duplicateCommand")
      : t("cli.edit.duplicateName");
    const { confirmDuplicate } = await inquirer.prompt<{
      confirmDuplicate: boolean;
    }>([
      {
        type: "confirm",
        name: "confirmDuplicate",
        message,
        default: false,
      },
    ]);

    if (!confirmDuplicate) {
      context.logger.info(t("cli.edit.cancelled"));
      return { code: 0 };
    }
  }

  const nextCli = [...tools];
  nextCli[selectedIndex] = {
    name: trimmedName,
    command: trimmedCommand,
    order,
  };

  writeConfig({ ...config, cli: nextCli });

  context.logger.info(
    green(
      t("cli.edit.success", {
        name: bold(trimmedName),
        command: trimmedCommand,
      })
    )
  );

  if (context.verbose) {
    context.logger.debug(
      t("cli.edit.debugUpdated", {
        previousName: target.name,
        previousCommand: target.command,
        previousOrder: currentOrder,
        name: trimmedName,
        command: trimmedCommand,
        order,
      })
    );
  }

  return { code: 0 };
}

async function handleRemove(
  _args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();
  const tools = config.cli;
  const { t } = context;

  if (!tools.length) {
    context.logger.warn(t("cli.remove.none"));
    return { code: 0 };
  }

  const choices = tools.map((tool, index) => ({
    name: `${tool.name} (${tool.command})`,
    value: index,
  }));

  const { selectedIndex } = await inquirer.prompt<{
    selectedIndex: number;
  }>([
    {
      type: "list",
      name: "selectedIndex",
      message: t("cli.remove.promptSelect"),
      choices,
    },
  ]);

  const target = tools[selectedIndex];
  if (!target) {
    throw new Error(t("cli.remove.notFound"));
  }

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: "confirm",
      name: "confirm",
      message: t("cli.remove.confirm", { name: target.name }),
      default: false,
    },
  ]);

  if (!confirm) {
    context.logger.info(t("cli.remove.cancelled"));
    return { code: 0 };
  }

  const remaining = tools.filter((_, index) => index !== selectedIndex);
  writeConfig({ ...config, cli: remaining });

  context.logger.info(
    green(
      t("cli.remove.success", {
        name: bold(target.name),
      })
    )
  );

  if (context.verbose) {
    context.logger.debug(
      t("cli.remove.debugRemaining", { count: remaining.length })
    );
  }

  return { code: 0 };
}

const subcommands: CliSubcommandDefinition[] = [
  {
    name: "list",
    aliases: ["ls"],
    descriptionKey: "cli.command.list.description",
    handler: handleList,
  },
  {
    name: "add",
    aliases: [],
    descriptionKey: "cli.command.add.description",
    handler: handleAdd,
  },
  {
    name: "edit",
    aliases: [],
    descriptionKey: "cli.command.edit.description",
    handler: handleEdit,
  },
  {
    name: "remove",
    aliases: ["rm"],
    descriptionKey: "cli.command.remove.description",
    handler: handleRemove,
  },
];

export async function runCli(
  args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const { t } = context;
  const helpFlag = args.flags.help === true || args.flags.h === true;

  if (!args.positional.length || helpFlag) {
    showCliHelp(context);
    return { code: 0 };
  }

  const [rawSubcommand, ...rest] = args.positional;
  const subcommand = findCliSubcommand(rawSubcommand);

  if (!subcommand) {
    context.logger.error(
      t("cli.unknownSubcommand", { name: rawSubcommand })
    );
    showCliHelp(context);
    return { code: 1 };
  }

  const subArgs: CliArguments = {
    flags: args.flags,
    positional: rest,
  };

  return subcommand.handler(subArgs, context);
}
