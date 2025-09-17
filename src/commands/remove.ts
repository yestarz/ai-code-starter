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

  if (!projects.length) {
    context.logger.warn("当前没有可删除的项目");
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
      message: "选择要删除的项目",
      choices,
    },
  ]);

  if (!selectedPaths.length) {
    context.logger.warn("未选择任何项目，操作已取消");
    return { code: 0 };
  }

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: "confirm",
      name: "confirm",
      message: `确认删除 ${selectedPaths.length} 个项目吗？`,
      default: false,
    },
  ]);

  if (!confirm) {
    context.logger.info("已取消删除操作");
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
      `已删除 ${removedProjects.length} 个项目：${removedProjects
        .map((item) => item.name)
        .join(", ")}`
    )
  );

  if (context.verbose) {
    const removedNames = removedProjects
      .map((item) => `${item.name}(${formatPathForDisplay(item.path)})`)
      .join(", ");
    context.logger.debug(`删除的项目详情：${removedNames}`);
  }

  return { code: 0 };
}
