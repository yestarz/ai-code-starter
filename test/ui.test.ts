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
    const result = await startUiServer({ port: 0 });
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
    expect(html).toContain("ACS 控制台");
    expect(html).toContain("项目管理");
    expect(html).toContain("CLI 工具管理");
  });

  it("supports creating, switching and deleting claude profiles", async () => {
    const createResponse = await fetch(`${baseUrl}/api/claude/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "work",
        model: "claude-work",
        env: {
          ANTHROPIC_AUTH_TOKEN: "sk-work",
          ANTHROPIC_BASE_URL: "https://api.example.com",
        },
        setCurrent: true,
      }),
    });
    const createResult = (await createResponse.json()) as {
      success: boolean;
      data: { ok: boolean };
    };
    expect(createResult.success).toBe(true);
    expect(createResult.data.ok).toBe(true);

    let claudeState = await fetch(`${baseUrl}/api/claude`).then((res) =>
      res.json()
    );
    expect(claudeState.success).toBe(true);
    expect(claudeState.data.current.name).toBe("work");
    expect(claudeState.data.current.model).toBe("claude-work");

    const id = Buffer.from("work", "utf8").toString("base64url");
    const switchResponse = await fetch(`${baseUrl}/api/claude/current`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const switchResult = (await switchResponse.json()) as {
      success: boolean;
      data: { ok: boolean };
    };
    expect(switchResult.success).toBe(true);
    expect(switchResult.data.ok).toBe(true);

    const deleteResponse = await fetch(`${baseUrl}/api/claude/profile/${id}`, {
      method: "DELETE",
    });
    const deleteResult = (await deleteResponse.json()) as {
      success: boolean;
      data: { ok: boolean };
    };
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.data.ok).toBe(true);

    claudeState = await fetch(`${baseUrl}/api/claude`).then((res) => res.json());
    expect(claudeState.success).toBe(true);
    expect(claudeState.data.configs).toHaveLength(0);
    expect(claudeState.data.current).toBeNull();

    const config = readConfig();
    expect(config.config.claude?.configs).toEqual({});
    expect(config.config.claude?.current).toBeUndefined();
  });
});
