import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import inquirer from "inquirer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runEdit } from "../src/commands/edit";
import { readConfig, writeConfig } from "../src/config";
import { createTranslator } from "../src/i18n";
import { createLogger } from "../src/utils/logger";

function createTestContext() {
  const translator = createTranslator("zh");
  const logger = createLogger(false, translator);
  return {
    context: {
      verbose: false,
      logger,
      language: "zh" as const,
      t: translator,
    },
  };
}

describe("acs edit 命令", () => {
  let tempHome: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "acs-edit-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);
  });

  afterEach(() => {
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("可以更新已登记项目的名称与路径", async () => {
    const { context } = createTestContext();
    const baseConfig = readConfig();

    const originalDir = path.join(tempHome, "project-one");
    const otherDir = path.join(tempHome, "project-two");
    const nextDir = path.join(tempHome, "renamed-project");
    fs.mkdirSync(originalDir, { recursive: true });
    fs.mkdirSync(otherDir, { recursive: true });
    fs.mkdirSync(nextDir, { recursive: true });

    writeConfig({
      ...baseConfig,
      projects: [
        { name: "Project One", path: originalDir },
        { name: "Project Two", path: otherDir },
      ],
    });

    const promptSpy = vi.spyOn(inquirer, "prompt");
    promptSpy
      .mockResolvedValueOnce({ selectedIndex: 0 })
      .mockResolvedValueOnce({ inputPath: nextDir })
      .mockResolvedValueOnce({ inputName: "Renamed Project" });

    const result = await runEdit({ flags: {}, positional: [] }, context);

    expect(result.code).toBe(0);
    const updated = readConfig();
    expect(updated.projects[0]).toEqual({
      name: "Renamed Project",
      path: path.resolve(nextDir),
    });
    expect(updated.projects[1]).toEqual({
      name: "Project Two",
      path: path.resolve(otherDir),
    });
  });
});

