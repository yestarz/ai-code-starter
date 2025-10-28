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
      throw new Error(payload.error?.message ?? "请求失败");
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
    expect(claudeData.env.ANTHROPIC_AUTH_TOKEN).toMatch(/^abcd\*+abcd$/);

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
});
