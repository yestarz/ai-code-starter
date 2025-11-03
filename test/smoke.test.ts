/**
 * 鍐掔儫娴嬭瘯锛氭ā鎷熺嫭绔嬬殑 HOME 鐩綍锛岄獙璇侀厤缃枃浠剁敓鎴愪笌鍒楄〃杈撳嚭銆? */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/utils/logger";
import { getConfigPath, readConfig, writeConfig } from "../src/config";
import { runList } from "../src/commands/list";
import { createTranslator } from "../src/i18n";

describe("acs CLI 鍐掔儫娴嬭瘯", () => {
  let tempHome: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "acs-smoke-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);
  });

  afterEach(() => {
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("棣栨璇诲彇浼氬垱寤洪粯璁ら厤缃紝骞惰兘鍒楀嚭鏂板姞椤圭洰", async () => {
    const translator = createTranslator("zh");
    const logger = createLogger(false, translator);
    const config = readConfig();
    expect(Array.isArray(config.projects)).toBe(true);
    expect(config.language).toBe("zh");
    expect(config.cli).toContainEqual({
      name: "CodeX",
      command: "codex",
      order: 1,
    });

    const configPath = getConfigPath();
    expect(fs.existsSync(configPath)).toBe(true);

    const sampleProjectDir = path.join(tempHome, "demo-project");
    fs.mkdirSync(sampleProjectDir, { recursive: true });

    writeConfig({
      ...config,
      projects: [
        {
          name: "demo-project",
          path: sampleProjectDir,
        },
      ],
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runList(
      { flags: { json: true }, positional: [] },
      { verbose: false, logger, language: "zh", t: translator }
    );

    expect(logSpy).toHaveBeenCalled();
    const printed = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(printed as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("demo-project");
    expect(path.resolve(parsed[0].path)).toBe(sampleProjectDir);
  });
});


