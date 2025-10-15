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
    const started = await startUiServer({ port: 0 });
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

    await api("/api/projects", {
      method: "POST",
      json: {
        path: projectDir,
      },
    });

    const projectList = await api<{ items: Array<{ id: string; name: string }> }>(
      "/api/projects"
    );
    expect(projectList.items).toHaveLength(1);
    const projectId = projectList.items[0].id;
    expect(projectList.items[0].name).toBe("demo");

    const projectDetail = await api<{
      name: string;
      displayPath: string;
      exists: boolean;
      isDirectory: boolean;
    }>(`/api/projects/${projectId}`);
    expect(projectDetail.exists).toBe(true);
    expect(projectDetail.isDirectory).toBe(true);

    await api("/api/projects", {
      method: "DELETE",
      json: { ids: [projectId] },
    });
    const projectListAfter = await api<{ items: unknown[] }>("/api/projects");
    expect(projectListAfter.items).toHaveLength(0);

    await api("/api/cli/tools", {
      method: "POST",
      json: {
        name: "test-run",
        command: 'node -p "1+1"',
      },
    });

    const cliList = await api<{ items: Array<{ id: string }> }>("/api/cli/tools");
    expect(cliList.items).toHaveLength(1);
    const cliId = cliList.items[0].id;

    const cliRun = await api<{ code: number; stdout: string; stderr: string }>(
      `/api/cli/tools/${cliId}/run`,
      { method: "POST" }
    );
    expect(cliRun.code).toBe(0);
    expect(cliRun.stdout.trim()).toBe("2");
    expect(cliRun.stderr).toBe("");

    await api("/api/cli/tools", {
      method: "DELETE",
      json: { ids: [cliId] },
    });
    const cliListAfter = await api<{ items: unknown[] }>("/api/cli/tools");
    expect(cliListAfter.items).toHaveLength(0);

    await api("/api/claude/profile", {
      method: "POST",
      json: {
        name: "dev",
        model: "claude-3-sonnet",
        env: {
          ANTHROPIC_BASE_URL: "https://example.dev",
          ANTHROPIC_AUTH_TOKEN: "abcd1234abcd",
        },
        setCurrent: true,
      },
    });

    const claudeData = await api<{
      current: {
        name: string;
        model?: string;
        env: Record<string, string>;
        maskedEnv: Record<string, string>;
      } | null;
      configs: Array<{ name: string }>;
    }>("/api/claude");
    expect(claudeData.configs).toHaveLength(1);
    expect(claudeData.current?.name).toBe("dev");
    expect(claudeData.current?.model).toBe("claude-3-sonnet");
    expect(claudeData.current?.maskedEnv.ANTHROPIC_AUTH_TOKEN).toMatch(
      /^abcd\*+abcd$/
    );

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
