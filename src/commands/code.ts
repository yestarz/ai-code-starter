/**
 * 实现 acs code 命令：选择项目并在其目录下执行指定 CLI。
 */
import fs from "node:fs";
import inquirer from "inquirer";
import { bold, gray, magenta } from "colorette";
import { getConfigPath, readConfig } from "../config";
import { CliArguments, CommandContext, CommandResult } from "../types";
import { formatPathForDisplay } from "../utils/path";
import { spawnCommand } from "../utils/spawn";

export async function runCode(
  _args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();

  if (!config.projects.length) {
    context.logger.warn("当前没有项目，请先通过 `acs add` 添加。");
    return { code: 1 };
  }

  if (!config.cli.length) {
    context.logger.warn(
      `CLI 列表为空，请编辑 ${getConfigPath()} 添加可用 CLI。`
    );
    return { code: 1 };
  }

  const projectChoices = config.projects.map((project) => {
    const exists = fs.existsSync(project.path);
    const display = `${project.name} (${gray(
      formatPathForDisplay(project.path)
    )})`;
    return {
      name: exists ? display : `${display} [路径不存在]`,
      value: project.path,
      disabled: exists ? false : "路径不存在",
    };
  });

  const { selectedProjectPath } = await inquirer.prompt<{
    selectedProjectPath: string;
  }>([
    {
      type: "list",
      name: "selectedProjectPath",
      message: "选择需要进入的项目",
      choices: projectChoices,
    },
  ]);

  const project = config.projects.find(
    (item) => item.path === selectedProjectPath
  );

  if (!project) {
    throw new Error("选择的项目不存在，可能配置已变更。");
  }

  const cliChoices = config.cli.map((tool) => ({
    name: `${tool.name} (${tool.command})`,
    value: tool,
  }));

  const { selectedCli } = await inquirer.prompt<{ selectedCli: typeof config.cli[0] }>([
    {
      type: "list",
      name: "selectedCli",
      message: "选择要运行的 CLI",
      choices: cliChoices,
    },
  ]);

  context.logger.info(
    `将在 ${bold(project.name)} 中执行 ${magenta(selectedCli.name)}`
  );

  const exitCode = await spawnCommand(selectedCli.command, {
    cwd: project.path,
    verbose: context.verbose,
  });

  return { code: exitCode };
}
