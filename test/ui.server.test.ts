import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startUiServer } from "../src/ui/server";
import { readConfig } from "../src/config";

describe("acs ui 服务端", () => {
  let tempHome: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;
  let server: http.Server | undefined;
  let baseUrl: string;

  beforeEach(async () => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "acs-ui-test-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    const started = await startUiServer({ port: 0, logger: mockLogger as any });
    server = started.server;
    baseUrl = started.url;
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      server = undefined;
    }
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  async function api<T>(
    pathname: string,
    init?: RequestInit & { json?: unknown }
  ): Promise<T> {
    let requestInit: RequestInit = init ?? {};
    if (init?.json !== undefined) {
      requestInit = {
        ...init,
        body: JSON.stringify(init.json),
        headers: {
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      };
    }
    const response = await fetch(new URL(pathname, baseUrl), requestInit);
    const payload = await response.json();
    if (!payload.success) {
      const errorMessage =
        typeof payload.error === "string"
          ? payload.error
          : payload.error?.message ?? "请求失败";
      throw new Error(errorMessage);
    }
    return payload.data as T;
  }

  it("支持项目、CLI 与 Claude 的核心流程", async () => {
    const projectDir = path.join(tempHome, "demo");
    fs.mkdirSync(projectDir, { recursive: true });

    // 添加项目
    await api("/api/projects", {
      method: "POST",
      json: {
        name: "demo",
        path: projectDir,
      },
    });

    // 获取项目列表
    const projectList = await api<Array<{ name: string; path: string }>>(
      "/api/projects"
    );
    expect(projectList).toHaveLength(1);
    expect(projectList[0].name).toBe("demo");

    // 删除项目
    await api("/api/projects/demo", {
      method: "DELETE",
    });
    const projectListAfter = await api<unknown[]>("/api/projects");
    expect(projectListAfter).toHaveLength(0);

    // 添加 CLI 工具
    await api("/api/cli", {
      method: "POST",
      json: {
        name: "test-run",
        command: 'node -e "console.log(1+1)"',
      },
    });

    // 获取 CLI 工具列表
    const cliList = await api<Array<{ name: string; command: string }>>(
      "/api/cli"
    );
    const createdTool = cliList.find((item) => item.name === "test-run");
    expect(createdTool).toBeDefined();

    // 删除 CLI 工具
    await api("/api/cli/test-run", {
      method: "DELETE",
    });
    const cliListAfter = await api<Array<{ name: string }>>("/api/cli");
    expect(cliListAfter.some((item) => item.name === "test-run")).toBe(false);

    // 添加 Claude 配置
    await api("/api/config/claude/add", {
      method: "POST",
      json: {
        name: "dev",
        profile: {
          model: "claude-3-sonnet",
          env: {
            ANTHROPIC_BASE_URL: "https://example.dev",
            ANTHROPIC_AUTH_TOKEN: "abcd1234abcd",
          },
        },
      },
    });

    // 切换到该配置
    await api("/api/config/claude/use", {
      method: "POST",
      json: { profile: "dev" },
    });

    // 检查当前配置
    const claudeData = await api<{
      name: string;
      model: string;
      env: { ANTHROPIC_AUTH_TOKEN: string; ANTHROPIC_BASE_URL: string };
    }>("/api/config/claude/current");
    expect(claudeData.name).toBe("dev");
    expect(claudeData.model).toBe("claude-3-sonnet");
    // Token 应该被打码
    expect(claudeData.env.ANTHROPIC_AUTH_TOKEN).toMatch(/^ab\*+cd$/);

    const config = readConfig();
    expect(config.config.claude?.current).toBe("dev");

    const settingsPath = path.join(tempHome, ".claude", "settings.json");
    expect(fs.existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as {
      env?: Record<string, string>;
      model?: string;
    };
    expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBe("abcd1234abcd");
    expect(settings.env?.ANTHROPIC_BASE_URL).toBe("https://example.dev");
    expect(settings.model).toBe("claude-3-sonnet");
  });

  it("项目编辑时会校验目标路径存在", async () => {
    const originDir = path.join(tempHome, "origin");
    fs.mkdirSync(originDir, { recursive: true });

    await api("/api/projects", {
      method: "POST",
      json: {
        name: "origin",
        path: originDir,
      },
    });

    const missingDir = path.join(tempHome, "missing");

    await expect(
      api("/api/projects/origin", {
        method: "PUT",
        json: {
          name: "origin",
          path: missingDir,
        },
      })
    ).rejects.toThrow("项目路径不存在");

    const config = readConfig();
    const stored = config.projects.find((item) => item.name === "origin");
    expect(stored?.path).toBe(path.resolve(originDir));
  });

  it("支持规则 CRUD 与应用流程", async () => {
    const projectDir = path.join(tempHome, "workspace");
    fs.mkdirSync(projectDir, { recursive: true });
    const encodedRuleName = encodeURIComponent("工程规范");

    // 新增规则
    await api("/api/rules", {
      method: "POST",
      json: { name: "工程规范", rule: "# 初始内容" },
    });

    let rules = await api<Array<{ name: string; rule: string }>>("/api/rules");
    expect(rules).toHaveLength(1);
    expect(rules[0].rule).toContain("初始");

    // 更新规则内容
    await api(`/api/rules/${encodedRuleName}`, {
      method: "PUT",
      json: { name: "工程规范", rule: "# 更新后的内容" },
    });

    // 全局应用
    const globalApply = await api<{
      targetPath: string;
    }>("/api/rules/apply", {
      method: "POST",
      json: {
        ruleName: "工程规范",
        cliCommand: "codex",
        scope: "global",
      },
    });
    const globalPath = path.join(tempHome, ".codex", "AGENTS.md");
    expect(globalApply.targetPath).toBe(globalPath);
    expect(fs.readFileSync(globalPath, "utf-8")).toBe("# 更新后的内容");

    // 再次更新并应用以触发备份
    await api(`/api/rules/${encodedRuleName}`, {
      method: "PUT",
      json: { name: "工程规范", rule: "# 第二次内容" },
    });
    await api("/api/rules/apply", {
      method: "POST",
      json: {
        ruleName: "工程规范",
        cliCommand: "codex",
        scope: "global",
      },
    });
    expect(fs.readFileSync(`${globalPath}.bak`, "utf-8")).toBe("# 更新后的内容");
    expect(fs.readFileSync(globalPath, "utf-8")).toBe("# 第二次内容");

    // 应用到项目
    const projectApply = await api<{
      targetPath: string;
    }>("/api/rules/apply", {
      method: "POST",
      json: {
        ruleName: "工程规范",
        cliCommand: "claude",
        scope: "project",
        projectPath: projectDir,
      },
    });
    const projectFile = path.join(projectDir, "CLAUDE.md");
    expect(projectApply.targetPath).toBe(projectFile);
    expect(fs.readFileSync(projectFile, "utf-8")).toBe("# 第二次内容");

    // 再次应用到项目以生成备份
    await api(`/api/rules/${encodedRuleName}`, {
      method: "PUT",
      json: { name: "工程规范", rule: "# 第三次内容" },
    });
    await api("/api/rules/apply", {
      method: "POST",
      json: {
        ruleName: "工程规范",
        cliCommand: "claude",
        scope: "project",
        projectPath: projectDir,
      },
    });
    expect(fs.readFileSync(`${projectFile}.bak`, "utf-8")).toBe("# 第二次内容");
    expect(fs.readFileSync(projectFile, "utf-8")).toBe("# 第三次内容");

    const missingProject = path.join(tempHome, "missing-project");
    await expect(
      api("/api/rules/apply", {
        method: "POST",
        json: {
          ruleName: "工程规范",
          cliCommand: "claude",
          scope: "project",
          projectPath: missingProject,
        },
      })
    ).rejects.toThrow("项目路径不存在");

    // 删除规则
    await api(`/api/rules/${encodedRuleName}`, {
      method: "DELETE",
    });
    rules = await api<Array<{ name: string }>>("/api/rules");
    expect(rules).toHaveLength(0);

    const config = readConfig();
    expect(config.rules).toHaveLength(0);
  });
});
