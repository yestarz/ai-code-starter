import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runConfig } from "../src/commands/config";
import { readConfig, writeConfig } from "../src/config";
import { createLogger } from "../src/utils/logger";
import { createTranslator } from "../src/i18n";

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

describe("acs config claude 命令", () => {
  let tempHome: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "acs-config-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);
  });

  afterEach(() => {
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function seedClaudeConfig() {
    const baseConfig = readConfig();
    writeConfig({
      ...baseConfig,
      config: {
        ...baseConfig.config,
        claude: {
          current: "duck",
          configs: {
            duck: {
              env: {
                ANTHROPIC_AUTH_TOKEN: "sk-abc123456789",
                ANTHROPIC_BASE_URL: "https://duck.example.com",
              },
              model: "claude-duck",
            },
            goose: {
              env: {
                ANTHROPIC_AUTH_TOKEN: "sk-goose987654321",
                ANTHROPIC_BASE_URL: "https://goose.example.com",
              },
              model: "claude-goose",
            },
          },
        },
      },
    });
  }

  it("list 命令可输出所有配置并标记当前项", async () => {
    seedClaudeConfig();
    const { context } = createTestContext();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runConfig(
      { flags: {}, positional: ["claude", "list"] },
      context
    );

    expect(result.code).toBe(0);
    const printedLines = logSpy.mock.calls.map((call) => call[0] as string);
    expect(
      printedLines.some((line) => line.includes("Claude 配置共 2 个"))
    ).toBe(true);
    expect(
      printedLines.some((line) => line.includes("duck") && line.includes("★"))
    ).toBe(true);
    expect(
      printedLines.some((line) =>
        line.includes("ANTHROPIC_BASE_URL: https://goose.example.com")
      )
    ).toBe(true);
  });

  it("current 命令展示当前配置详情", async () => {
    seedClaudeConfig();
    const { context } = createTestContext();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runConfig(
      { flags: {}, positional: ["claude", "current"] },
      context
    );

    expect(result.code).toBe(0);
    const printedLines = logSpy.mock.calls.map((call) => call[0] as string);
    expect(
      printedLines.some((line) => line.includes("当前 Claude 配置：duck"))
    ).toBe(true);
    expect(
      printedLines.some((line) =>
        line.includes("ANTHROPIC_AUTH_TOKEN: sk-a*******6789")
      )
    ).toBe(true);
  });

  it("use 命令会写入设置文件并更新当前配置", async () => {
    seedClaudeConfig();
    const { context } = createTestContext();

    const settingsPath = path.join(tempHome, ".claude", "settings.json");
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          env: {
            ANTHROPIC_AUTH_TOKEN: "sk-old",
            ANTHROPIC_BASE_URL: "https://old.example.com",
            API_TIMEOUT_MS: "1000",
          },
          model: "old-model",
          permissions: { allow: ["read"], deny: [] },
        },
        null,
        2
      )
    );

    const result = await runConfig(
      { flags: {}, positional: ["claude", "use", "goose"] },
      context
    );

    expect(result.code).toBe(0);

    const updatedSettings = JSON.parse(
      fs.readFileSync(settingsPath, "utf-8")
    ) as Record<string, unknown>;
    expect(updatedSettings.permissions).toEqual({
      allow: ["read"],
      deny: [],
    });
    expect(updatedSettings.env).toEqual({
      ANTHROPIC_AUTH_TOKEN: "sk-goose987654321",
      ANTHROPIC_BASE_URL: "https://goose.example.com",
    });
    expect(updatedSettings.model).toBe("claude-goose");

    const config = readConfig();
    expect(config.config.claude?.current).toBe("goose");
  });
});
