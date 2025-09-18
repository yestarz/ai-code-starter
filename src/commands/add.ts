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
  const { t } = context;

  const { inputPath } = await inquirer.prompt<{ inputPath: string }>([
    {
      type: "input",
      name: "inputPath",
      message: t("add.promptPath"),
      validate(value: string) {
        try {
          const normalized = normalizePath(value);
          if (!fs.existsSync(normalized)) {
            return t("add.validate.notExists");
          }
          if (!fs.statSync(normalized).isDirectory()) {
            return t("add.validate.notDirectory");
          }
          return true;
        } catch (error) {
          return t("add.validate.unexpected", {
            message: (error as Error).message,
          });
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
      ? t("add.duplicatePath")
      : t("add.duplicateName");
    const { confirmDuplicate } = await inquirer.prompt<{ confirmDuplicate: boolean }>([
      {
        type: "confirm",
        name: "confirmDuplicate",
        message: warningMessage,
        default: false,
      },
    ]);

    if (!confirmDuplicate) {
      context.logger.info(t("add.cancelled"));
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
      t("add.success", {
        name: bold(projectName),
        path: formatPathForDisplay(absolutePath),
      })
    )
  );

  return { code: 0 };
}
