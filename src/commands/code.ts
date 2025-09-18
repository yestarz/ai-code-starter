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
  const { t } = context;

  if (!config.projects.length) {
    context.logger.warn(t("code.noProjects"));
    return { code: 1 };
  }

  if (!config.cli.length) {
    context.logger.warn(t("code.noCli", { path: getConfigPath() }));
    return { code: 1 };
  }

  const projectChoices = config.projects.map((project) => {
    const exists = fs.existsSync(project.path);
    const display = `${project.name} (${gray(
      formatPathForDisplay(project.path)
    )})`;
    return {
      name: exists ? display : `${display}${t("code.projectMissingSuffix")}`,
      value: project.path,
      disabled: exists ? false : t("code.projectMissingLabel"),
    };
  });

  const { selectedProjectPath } = await inquirer.prompt<{
    selectedProjectPath: string;
  }>([
    {
      type: "list",
      name: "selectedProjectPath",
      message: t("code.promptProject"),
      choices: projectChoices,
    },
  ]);

  const project = config.projects.find(
    (item) => item.path === selectedProjectPath
  );

  if (!project) {
    throw new Error(t("code.projectMissing"));
  }

  const cliChoices = config.cli.map((tool) => ({
    name: `${tool.name} (${tool.command})`,
    value: tool,
  }));

  const { selectedCli } = await inquirer.prompt<{ selectedCli: typeof config.cli[0] }>([
    {
      type: "list",
      name: "selectedCli",
      message: t("code.promptCli"),
      choices: cliChoices,
    },
  ]);

  context.logger.info(
    t("code.execute", {
      project: bold(project.name),
      cli: magenta(selectedCli.name),
    })
  );

  const exitCode = await spawnCommand(selectedCli.command, {
    cwd: project.path,
    verbose: context.verbose,
    translator: t,
  });

  return { code: exitCode };
}
