import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import inquirer from "inquirer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/commands/cli";
import { createLogger } from "../src/utils/logger";
import { createTranslator } from "../src/i18n";
import { readConfig, writeConfig } from "../src/config";

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

describe("acs cli 子命令", () => {
  let tempHome: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "acs-cli-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);
  });

  afterEach(() => {
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("list 子命令支持 --json 输出", async () => {
    const { context } = createTestContext();
    const initialConfig = readConfig();
    expect(initialConfig.cli.length).toBeGreaterThan(0);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runCli(
      { flags: { json: true }, positional: ["list"] },
      context
    );

    expect(result.code).toBe(0);
    expect(logSpy).toHaveBeenCalled();
    const printed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(Array.isArray(printed)).toBe(true);
    expect(printed.length).toBe(initialConfig.cli.length);
  });

  it("add 子命令可以新增 CLI", async () => {
    const { context } = createTestContext();
    const promptSpy = vi.spyOn(inquirer, "prompt");
    promptSpy.mockResolvedValueOnce({ name: "New CLI", command: "new-cli" });

    const result = await runCli({ flags: {}, positional: ["add"] }, context);

    expect(result.code).toBe(0);
    const config = readConfig();
    expect(config.cli).toContainEqual({ name: "New CLI", command: "new-cli" });
  });

  it("edit 子命令可修改现有 CLI", async () => {
    const { context } = createTestContext();
    const baseConfig = readConfig();
    writeConfig({
      ...baseConfig,
      cli: [
        { name: "Foo", command: "foo" },
        { name: "Bar", command: "bar" },
      ],
    });

    const promptSpy = vi.spyOn(inquirer, "prompt");
    promptSpy
      .mockResolvedValueOnce({ selectedIndex: 1 })
      .mockResolvedValueOnce({ name: "Baz", command: "baz" });

    const result = await runCli({ flags: {}, positional: ["edit"] }, context);

    expect(result.code).toBe(0);
    const config = readConfig();
    expect(config.cli[1]).toEqual({ name: "Baz", command: "baz" });
  });

  it("remove 子命令可删除 CLI", async () => {
    const { context } = createTestContext();
    const baseConfig = readConfig();
    writeConfig({
      ...baseConfig,
      cli: [
        { name: "Foo", command: "foo" },
        { name: "Bar", command: "bar" },
      ],
    });

    const promptSpy = vi.spyOn(inquirer, "prompt");
    promptSpy
      .mockResolvedValueOnce({ selectedIndex: 0 })
      .mockResolvedValueOnce({ confirm: true });

    const result = await runCli({ flags: {}, positional: ["remove"] }, context);

    expect(result.code).toBe(0);
    const config = readConfig();
    expect(config.cli).toHaveLength(1);
    expect(config.cli[0]).toEqual({ name: "Bar", command: "bar" });
  });

  it("remove 子命令支持 rm 别名", async () => {
    const { context } = createTestContext();
    const baseConfig = readConfig();
    writeConfig({
      ...baseConfig,
      cli: [
        { name: "Foo", command: "foo" },
        { name: "Bar", command: "bar" },
      ],
    });

    const promptSpy = vi.spyOn(inquirer, "prompt");
    promptSpy
      .mockResolvedValueOnce({ selectedIndex: 1 })
      .mockResolvedValueOnce({ confirm: true });

    const result = await runCli({ flags: {}, positional: ["rm"] }, context);

    expect(result.code).toBe(0);
    const config = readConfig();
    expect(config.cli).toHaveLength(1);
    expect(config.cli[0]).toEqual({ name: "Foo", command: "foo" });
  });
});
