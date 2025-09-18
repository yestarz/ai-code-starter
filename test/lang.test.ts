import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runLang } from "../src/commands/lang";
import { createLogger } from "../src/utils/logger";
import { createTranslator } from "../src/i18n";
import { readConfig } from "../src/config";

describe("acs lang 命令", () => {
  let tempHome: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "acs-lang-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);
  });

  afterEach(() => {
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("直接传入语言代码时应更新配置", async () => {
    const translator = createTranslator("zh");
    const logger = createLogger(false, translator);
    const context = {
      verbose: false,
      logger,
      language: "zh" as const,
      t: translator,
    };

    const result = await runLang(
      { flags: {}, positional: ["en"] },
      context
    );

    expect(result.code).toBe(0);
    const config = readConfig();
    expect(config.language).toBe("en");
  });

  it("无效语言代码会返回错误", async () => {
    const translator = createTranslator("zh");
    const logger = createLogger(false, translator);
    const errorSpy = vi.spyOn(logger, "error");

    const result = await runLang(
      { flags: {}, positional: ["fr"] },
      {
        verbose: false,
        logger,
        language: "zh",
        t: translator,
      }
    );

    expect(result.code).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    const config = readConfig();
    expect(config.language).toBe("zh");
  });
});
