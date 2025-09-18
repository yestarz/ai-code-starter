/**
 * 实现 acs remove/rm 命令：交互式删除一个或多个项目。
 */
import inquirer from "inquirer";
import { bold, gray, green } from "colorette";
import { readConfig, writeConfig } from "../config";
import { CliArguments, CommandContext, CommandResult } from "../types";
import { formatPathForDisplay } from "../utils/path";

export async function runRemove(
  _args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();
  const { projects } = config;
  const { t } = context;

  if (!projects.length) {
    context.logger.warn(t("remove.none"));
    return { code: 0 };
  }

  const choices = projects.map((project) => ({
    name: `${project.name} (${gray(formatPathForDisplay(project.path))})`,
    value: project.path,
  }));

  const { selectedPaths } = await inquirer.prompt<{ selectedPaths: string[] }>([
    {
      type: "checkbox",
      name: "selectedPaths",
      message: t("remove.promptSelect"),
      choices,
    },
  ]);

  if (!selectedPaths.length) {
    context.logger.warn(t("remove.cancelledNoSelection"));
    return { code: 0 };
  }

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: "confirm",
      name: "confirm",
      message: t("remove.promptConfirm", { count: selectedPaths.length }),
      default: false,
    },
  ]);

  if (!confirm) {
    context.logger.info(t("remove.cancelled"));
    return { code: 0 };
  }

  const removedProjects = projects.filter((project) =>
    selectedPaths.includes(project.path)
  );
  const remaining = projects.filter(
    (project) => !selectedPaths.includes(project.path)
  );

  writeConfig({ ...config, projects: remaining });
  context.logger.info(
    green(
      t("remove.success", {
        count: removedProjects.length,
        names: removedProjects.map((item) => item.name).join(", "),
      })
    )
  );

  if (context.verbose) {
    const removedNames = removedProjects
      .map((item) => `${item.name}(${formatPathForDisplay(item.path)})`)
      .join(", ");
    context.logger.debug(t("remove.debugDetails", { details: removedNames }));
  }

  return { code: 0 };
}
