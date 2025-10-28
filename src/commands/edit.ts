/**
 * 实现 acs edit 命令：编辑已登记的项目。
 */
import fs from "node:fs";
import path from "node:path";
import inquirer from "inquirer";
import { bold, gray, green } from "colorette";
import { readConfig, writeConfig } from "../config";
import { CliArguments, CommandContext, CommandResult } from "../types";
import { formatPathForDisplay, normalizePath } from "../utils/path";

export async function runEdit(
  _args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const config = readConfig();
  const projects = config.projects;
  const { t } = context;

  if (!projects.length) {
    context.logger.warn(t("edit.none"));
    return { code: 0 };
  }

  const choices = projects.map((project, index) => ({
    name: `${project.name} (${gray(formatPathForDisplay(project.path))})`,
    value: index,
  }));

  const { selectedIndex } = await inquirer.prompt<{ selectedIndex: number }>([
    {
      type: "list",
      name: "selectedIndex",
      message: t("edit.promptSelect"),
      choices,
    },
  ]);

  const target = projects[selectedIndex];
  if (!target) {
    throw new Error(t("edit.notFound"));
  }

  const { inputPath } = await inquirer.prompt<{ inputPath: string }>([
    {
      type: "input",
      name: "inputPath",
      message: t("edit.promptPath"),
      default: target.path,
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

  const normalizedPath = normalizePath(inputPath);

  const { inputName } = await inquirer.prompt<{ inputName: string }>([
    {
      type: "input",
      name: "inputName",
      message: t("edit.promptName"),
      default: target.name || path.basename(normalizedPath),
      validate(value: string) {
        return value.trim() ? true : t("errors.projectNameRequired");
      },
    },
  ]);

  const trimmedName = inputName.trim();

  if (trimmedName === target.name && normalizedPath === target.path) {
    context.logger.info(t("edit.noChanges"));
    return { code: 0 };
  }

  const conflictName = projects.find(
    (project, index) => index !== selectedIndex && project.name === trimmedName
  );
  const conflictPath = projects.find(
    (project, index) => index !== selectedIndex && project.path === normalizedPath
  );

  if (conflictName || conflictPath) {
    const message = conflictPath
      ? t("edit.duplicatePath")
      : t("edit.duplicateName");
    const { confirmUpdate } = await inquirer.prompt<{
      confirmUpdate: boolean;
    }>([
      {
        type: "confirm",
        name: "confirmUpdate",
        message,
        default: false,
      },
    ]);

    if (!confirmUpdate) {
      context.logger.info(t("edit.cancelled"));
      return { code: 0 };
    }
  }

  const nextProjects = [...projects];
  nextProjects[selectedIndex] = {
    name: trimmedName,
    path: normalizedPath,
  };

  writeConfig({ ...config, projects: nextProjects });

  context.logger.info(
    green(
      t("edit.success", {
        name: bold(trimmedName),
        path: formatPathForDisplay(normalizedPath),
      })
    )
  );

  if (context.verbose) {
    context.logger.debug(
      t("edit.debugUpdated", {
        previousName: target.name,
        previousPath: formatPathForDisplay(target.path),
        name: trimmedName,
        path: formatPathForDisplay(normalizedPath),
      })
    );
  }

  return { code: 0 };
}

