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

  if (args.flags.json) {
    console.log(JSON.stringify(projects, null, 2));
    return { code: 0 };
  }

  if (!projects.length) {
    console.log(gray("暂无项目。可通过 `acs add` 添加新的项目。"));
    return { code: 0 };
  }

  console.log(bold(cyan(`共 ${projects.length} 个项目：`)));
  projects.forEach((project, index) => {
    console.log(
      `${index + 1}. ${bold(project.name)} -> ${gray(
        formatPathForDisplay(project.path)
      )}`
    );
  });

  if (context.verbose) {
    context.logger.debug(`当前配置包含 ${projects.length} 条记录`);
  }

  return { code: 0 };
}
