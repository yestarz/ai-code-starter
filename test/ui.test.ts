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
    const result = await startUiServer({ port: 0, host: "127.0.0.1" });
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
    expect(html).toContain("ACS 配置中心");
    expect(html).toContain("配置列表");
  });

  it("supports creating, switching and deleting claude profiles", async () => {
    const createResponse = await fetch(`${baseUrl}/api/claude/profile`, {
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
        setCurrent: true,
      }),
    });
    const createResult = (await createResponse.json()) as {
      success: boolean;
      data: { current: string | null };
    };
    expect(createResult.success).toBe(true);
    expect(createResult.data.current).toBe("work");

    let config = readConfig();
    expect(config.config.claude?.configs.work?.model).toBe("claude-work");

    const switchResponse = await fetch(`${baseUrl}/api/claude/current`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "work" }),
    });
    const switchResult = (await switchResponse.json()) as {
      success: boolean;
      data: { current: string | null };
    };
    expect(switchResult.success).toBe(true);
    expect(switchResult.data.current).toBe("work");

    const deleteResponse = await fetch(
      `${baseUrl}/api/claude/profile/work`,
      { method: "DELETE" }
    );
    const deleteResult = (await deleteResponse.json()) as {
      success: boolean;
      data: { current: string | null };
    };
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.data.current).toBeNull();

    config = readConfig();
    expect(config.config.claude).toBeUndefined();
  });
});
