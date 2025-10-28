import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startUiServer } from "../src/ui/server";
import { readConfig } from "../src/config";

function waitForServerClose(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

describe("UI server", () => {
  let tempHome: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;
  let server: http.Server | undefined;
  let baseUrl: string;

  async function bootServer() {
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    const result = await startUiServer({ port: 0, logger: mockLogger as any });
    server = result.server;
    baseUrl = result.url;
  }

  beforeEach(async () => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "acs-ui-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);
    await bootServer();
  });

  afterEach(async () => {
    if (server) {
      await waitForServerClose(server);
      server = undefined;
    }
    if (homedirSpy) {
      homedirSpy.mockRestore();
    }
    fs.rmSync(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("serves the dashboard page", async () => {
    const response = await fetch(baseUrl);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("ACS Web 管理界面");
    expect(html).toContain("项目管理");
    expect(html).toContain("CLI 工具");
  });

  it("supports creating, switching and deleting claude profiles", async () => {
    // 添加配置
    const createResponse = await fetch(`${baseUrl}/api/config/claude/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "work",
        profile: {
          model: "claude-work",
          env: {
            ANTHROPIC_AUTH_TOKEN: "sk-work",
            ANTHROPIC_BASE_URL: "https://api.example.com",
          },
        },
      }),
    });
    const createResult = (await createResponse.json()) as {
      success: boolean;
      data: { name: string };
    };
    expect(createResult.success).toBe(true);
    expect(createResult.data.name).toBe("work");

    // 切换配置
    const switchResponse = await fetch(`${baseUrl}/api/config/claude/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: "work" }),
    });
    const switchResult = (await switchResponse.json()) as {
      success: boolean;
      data: { profile: string };
    };
    expect(switchResult.success).toBe(true);
    expect(switchResult.data.profile).toBe("work");

    // 检查当前配置
    let currentState = await fetch(`${baseUrl}/api/config/claude/current`).then(
      (res) => res.json()
    );
    expect(currentState.success).toBe(true);
    expect(currentState.data.name).toBe("work");
    expect(currentState.data.model).toBe("claude-work");

    // 删除配置
    const deleteResponse = await fetch(`${baseUrl}/api/config/claude/work`, {
      method: "DELETE",
    });
    const deleteResult = (await deleteResponse.json()) as {
      success: boolean;
      data: { name: string };
    };
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.data.name).toBe("work");

    // 检查配置列表
    const listState = await fetch(`${baseUrl}/api/config/claude/list`).then(
      (res) => res.json()
    );
    expect(listState.success).toBe(true);
    expect(listState.data).toHaveLength(0);

    const config = readConfig();
    expect(config.config.claude?.configs).toEqual({});
    expect(config.config.claude?.current).toBeUndefined();
  });
});
