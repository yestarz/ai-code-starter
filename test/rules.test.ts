import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getGlobalRuleDir,
  getRuleFileName,
  writeGlobalRuleFile,
  writeProjectRuleFile,
} from "../src/utils/rules";

describe("规则工具函数", () => {
  let tempHome: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "acs-rules-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);
  });

  afterEach(() => {
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  it("根据 CLI 命令映射规则文件", () => {
    expect(getRuleFileName("codex")).toBe("AGENTS.md");
    expect(getRuleFileName("claude --help")).toBe("CLAUDE.md");
    expect(getRuleFileName("Gemini ")).toBe("GEMINI.md");
    expect(getRuleFileName("unknown")).toBeNull();
    const globalDir = getGlobalRuleDir("codex");
    expect(globalDir).toBe(path.join(tempHome, ".codex"));
  });

  it("写入全局规则文件会自动备份原内容", () => {
    const targetPath = writeGlobalRuleFile("codex", "初始内容");
    expect(targetPath).toBe(path.join(tempHome, ".codex", "AGENTS.md"));
    expect(fs.readFileSync(targetPath, "utf-8")).toBe("初始内容");
    expect(fs.existsSync(`${targetPath}.bak`)).toBe(false);

    const updatedPath = writeGlobalRuleFile("codex", "更新后的内容");
    expect(updatedPath).toBe(targetPath);
    expect(fs.readFileSync(updatedPath, "utf-8")).toBe("更新后的内容");
    expect(fs.readFileSync(`${updatedPath}.bak`, "utf-8")).toBe("初始内容");
  });

  it("写入项目规则文件会校验路径并创建备份", () => {
    const missingProject = path.join(tempHome, "missing");
    expect(() =>
      writeProjectRuleFile(missingProject, "codex", "内容")
    ).toThrow("项目路径不存在");

    const projectDir = path.join(tempHome, "demo");
    fs.mkdirSync(projectDir, { recursive: true });

    const projectRulePath = writeProjectRuleFile(projectDir, "claude", "项目内容");
    expect(projectRulePath).toBe(path.join(projectDir, "CLAUDE.md"));
    expect(fs.readFileSync(projectRulePath, "utf-8")).toBe("项目内容");
    expect(fs.existsSync(`${projectRulePath}.bak`)).toBe(false);

    const rewrittenPath = writeProjectRuleFile(projectDir, "claude", "覆盖后内容");
    expect(rewrittenPath).toBe(projectRulePath);
    expect(fs.readFileSync(rewrittenPath, "utf-8")).toBe("覆盖后内容");
    expect(fs.readFileSync(`${rewrittenPath}.bak`, "utf-8")).toBe("项目内容");
  });
});
