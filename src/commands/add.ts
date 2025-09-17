/**
 * 实现 acs add 命令：添加新的项目记录。
 */
import fs from "node:fs";
import path from "node:path";
import inquirer from "inquirer";
import { bold, green, yellow } from "colorette";
import { readConfig, writeConfig } from "../config";
import { CliArguments, CommandContext, CommandResult } from "../types";
import { formatPathForDisplay, normalizePath } from "../utils/path";

export async function runAdd(
  _args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();

  const { inputPath } = await inquirer.prompt<{ inputPath: string }>([
    {
      type: "input",
      name: "inputPath",
      message: "请输入项目路径",
      validate(value: string) {
        try {
          const normalized = normalizePath(value);
          if (!fs.existsSync(normalized)) {
            return "路径不存在，请重新输入";
          }
          if (!fs.statSync(normalized).isDirectory()) {
            return "目标不是目录";
          }
          return true;
        } catch (error) {
          return (error as Error).message;
        }
      },
    },
  ]);

  const absolutePath = normalizePath(inputPath);
  const projectName = path.basename(absolutePath);

  const sameName = config.projects.find((item) => item.name === projectName);
  const samePath = config.projects.find((item) => item.path === absolutePath);

  if (sameName || samePath) {
    const warningMessage = samePath
      ? "该路径已存在于配置中，确定仍要重复添加吗？"
      : "存在同名项目，是否继续？";
    const { confirmDuplicate } = await inquirer.prompt<{ confirmDuplicate: boolean }>([
      {
        type: "confirm",
        name: "confirmDuplicate",
        message: warningMessage,
        default: false,
      },
    ]);

    if (!confirmDuplicate) {
      context.logger.info("已取消添加操作");
      return { code: 0 };
    }
  }

  const nextConfig = {
    ...config,
    projects: [
      ...config.projects,
      {
        name: projectName,
        path: absolutePath,
      },
    ],
  };

  writeConfig(nextConfig);

  context.logger.info(
    green(
      `添加成功：${bold(projectName)} -> ${formatPathForDisplay(absolutePath)}`
    )
  );

  return { code: 0 };
}
