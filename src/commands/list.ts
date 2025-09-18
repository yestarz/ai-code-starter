/**
 * 实现 acs list/ls 命令：展示配置中的项目列表。
 */
import { bold, cyan, gray } from "colorette";
import { readConfig } from "../config";
import { CliArguments, CommandContext, CommandResult } from "../types";
import { formatPathForDisplay } from "../utils/path";

export async function runList(
  args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();
  const projects = config.projects;
  const { t } = context;

  if (args.flags.json) {
    console.log(JSON.stringify(projects, null, 2));
    return { code: 0 };
  }

  if (!projects.length) {
    console.log(gray(t("list.empty")));
    return { code: 0 };
  }

  console.log(bold(cyan(t("list.summary", { count: projects.length }))));
  projects.forEach((project, index) => {
    const entry = t("list.entry", {
      index: index + 1,
      name: bold(project.name),
      path: gray(formatPathForDisplay(project.path)),
    });
    console.log(entry);
  });

  if (context.verbose) {
    context.logger.debug(t("list.debugCount", { count: projects.length }));
  }

  return { code: 0 };
}
