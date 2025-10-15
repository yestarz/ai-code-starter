import http from "node:http";
import { URL } from "node:url";
import { readConfig, writeConfig } from "../config";
import { AcsConfig, ClaudeConfig, ClaudeProfile } from "../types";
import { applyClaudeProfileToSettings } from "../utils/claude";
import type { Logger } from "../utils/logger";

export const DEFAULT_UI_PORT = 8888;

const UI_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ACS 配置中心</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: "Inter", "PingFang SC", "Segoe UI", sans-serif;
      --bg: #f8fafc;
      --fg: #0f172a;
      --card: #ffffff;
      --border: rgba(15, 23, 42, 0.1);
      --accent: #2563eb;
      --accent-soft: rgba(37, 99, 235, 0.12);
      --danger: #dc2626;
      --success: #15803d;
      --muted: #64748b;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--fg);
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 32px 24px;
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      color: #fff;
      box-shadow: 0 18px 44px rgba(37, 99, 235, 0.35);
    }

    header h1 {
      margin: 0;
      font-size: 28px;
    }

    header p {
      margin: 12px 0 0;
      max-width: 680px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.85);
    }

    main {
      flex: 1;
      padding: 24px;
      display: grid;
      gap: 24px;
      grid-template-columns: minmax(320px, 1fr) minmax(360px, 1fr);
    }

    @media (max-width: 960px) {
      main {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--card);
      border-radius: 18px;
      box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .card-header h2 {
      margin: 0;
      font-size: 20px;
    }

    .ghost-button {
      border: none;
      background: var(--accent-soft);
      color: var(--accent);
      padding: 8px 16px;
      border-radius: 999px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .ghost-button:hover {
      transform: translateY(-1px);
    }

    .profile-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: box-shadow 0.2s ease, border 0.2s ease;
    }

    .profile-card.current {
      border-color: rgba(37, 99, 235, 0.45);
      box-shadow: 0 16px 36px rgba(37, 99, 235, 0.18);
    }

    .profile-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .profile-head h3 {
      margin: 0;
      font-size: 18px;
    }

    .badge {
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(37, 99, 235, 0.15);
      color: var(--accent);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .profile-meta {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }

    .env-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }

    .env-item {
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
    }

    .env-item span {
      font-weight: 600;
      color: var(--muted);
    }

    .env-item code {
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
      color: var(--fg);
      overflow-wrap: anywhere;
    }

    .profile-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .profile-actions button {
      border: none;
      border-radius: 10px;
      padding: 8px 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .profile-actions button.primary {
      background: var(--accent);
      color: #fff;
    }

    .profile-actions button.secondary {
      background: rgba(15, 23, 42, 0.06);
      color: var(--fg);
    }

    .profile-actions button.danger {
      background: rgba(220, 38, 38, 0.12);
      color: var(--danger);
    }

    .profile-actions button:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 22px rgba(15, 23, 42, 0.12);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
    }

    input[type="text"],
    input[type="url"] {
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 14px;
      background: rgba(255, 255, 255, 0.92);
      color: var(--fg);
    }

    input:focus {
      outline: 2px solid rgba(37, 99, 235, 0.35);
      outline-offset: 2px;
    }

    .env-editor {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .env-row {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .env-row button {
      border: none;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(220, 38, 38, 0.12);
      color: var(--danger);
      font-weight: 600;
      cursor: pointer;
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .form-actions button {
      border: none;
      border-radius: 999px;
      padding: 10px 18px;
      font-weight: 600;
      cursor: pointer;
    }

    .form-actions button.primary {
      background: var(--accent);
      color: #fff;
    }

    .form-actions button.secondary {
      background: rgba(15, 23, 42, 0.08);
      color: var(--fg);
    }

    .status-bar {
      padding: 16px 24px;
      border-top: 1px solid rgba(15, 23, 42, 0.1);
      background: rgba(15, 23, 42, 0.02);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 14px;
      color: var(--muted);
    }

    .status-bar span.success {
      color: var(--success);
    }

    .status-bar span.error {
      color: var(--danger);
    }

    .empty {
      padding: 32px;
      text-align: center;
      border: 1px dashed var(--border);
      border-radius: 16px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.6);
    }
  </style>
</head>
<body>
  <header>
    <h1>ACS 配置中心</h1>
    <p>通过界面管理 ~/.acs/config.json，支持查看、编辑、删除以及切换 Claude CLI 配置。</p>
  </header>
  <main>
    <section class="card" aria-label="配置列表">
      <div class="card-header">
        <h2>配置列表</h2>
        <button id="refreshButton" class="ghost-button" type="button">刷新</button>
      </div>
      <div id="profileList"></div>
    </section>
    <section class="card" aria-label="配置编辑">
      <div class="card-header">
        <h2 id="formTitle">新增配置</h2>
        <button id="newProfileButton" class="ghost-button" type="button">新建</button>
      </div>
      <form id="profileForm">
        <label>
          配置名称
          <input id="profileName" type="text" placeholder="例如：work" autocomplete="off" required />
        </label>
        <label>
          默认模型
          <input id="profileModel" type="text" placeholder="例如：claude-3-5-sonnet" autocomplete="off" />
        </label>
        <div class="env-editor">
          <div class="card-header" style="padding: 0;">
            <h2 style="font-size:16px; margin:0;">环境变量</h2>
            <button id="addEnv" class="ghost-button" type="button">新增变量</button>
          </div>
          <div id="envList"></div>
        </div>
        <label class="checkbox-field">
          <input id="setCurrent" type="checkbox" />
          <span>保存后设为当前配置</span>
        </label>
        <div class="form-actions">
          <button class="primary" type="submit">保存</button>
          <button class="secondary" id="cancelEdit" type="button">重置</button>
        </div>
      </form>
    </section>
  </main>
  <div class="status-bar" id="statusBar">
    <span id="statusMain">等待操作…</span>
    <span id="statusDetail"></span>
  </div>
  <script>
    (function () {
      const state = {
        current: null,
        profiles: {},
        editing: null
      };

      const profileList = document.getElementById("profileList");
      const refreshButton = document.getElementById("refreshButton");
      const newProfileButton = document.getElementById("newProfileButton");
      const form = document.getElementById("profileForm");
      const formTitle = document.getElementById("formTitle");
      const nameInput = document.getElementById("profileName");
      const modelInput = document.getElementById("profileModel");
      const envList = document.getElementById("envList");
      const addEnvButton = document.getElementById("addEnv");
      const setCurrentInput = document.getElementById("setCurrent");
      const cancelButton = document.getElementById("cancelEdit");
      const statusMain = document.getElementById("statusMain");
      const statusDetail = document.getElementById("statusDetail");

      function setStatus(message, tone) {
        statusMain.textContent = message;
        statusMain.className = tone === "success" ? "success" : tone === "error" ? "error" : "";
      }

      function setDetail(message, tone) {
        statusDetail.textContent = message || "";
        statusDetail.className = tone === "success" ? "success" : tone === "error" ? "error" : "";
      }

      function maskSensitive(key, value) {
        if (!value) {
          return "-";
        }
        const lowered = key.toLowerCase();
        if (lowered.includes("token") || lowered.includes("secret") || lowered.includes("key")) {
          if (value.length <= 4) {
            return "*".repeat(value.length);
          }
          const head = value.slice(0, 4);
          const tail = value.slice(-4);
          const middle = Math.max(value.length - 8, 0);
          return head + "*".repeat(middle) + tail;
        }
        return value;
      }

      function clearEnvRows() {
        while (envList.firstChild) {
          envList.removeChild(envList.firstChild);
        }
      }

      function createEnvRow(key, value) {
        const row = document.createElement("div");
        row.className = "env-row";

        const keyInput = document.createElement("input");
        keyInput.type = "text";
        keyInput.placeholder = "变量名";
        keyInput.value = key || "";
        keyInput.className = "env-key";

        const valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.placeholder = "变量值";
        valueInput.value = value || "";
        valueInput.className = "env-value";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "移除";
        removeButton.addEventListener("click", function () {
          row.remove();
          if (!envList.children.length) {
            addEnvRow("", "");
          }
        });

        row.appendChild(keyInput);
        row.appendChild(valueInput);
        row.appendChild(removeButton);
        return row;
      }

      function addEnvRow(key, value) {
        envList.appendChild(createEnvRow(key, value));
      }

      function collectEnv() {
        const result = {};
        const rows = envList.querySelectorAll(".env-row");
        rows.forEach(function (row) {
          const key = row.querySelector(".env-key").value.trim();
          const value = row.querySelector(".env-value").value;
          if (key) {
            result[key] = value;
          }
        });
        return result;
      }

      function renderProfiles() {
        profileList.innerHTML = "";
        const names = Object.keys(state.profiles);
        if (!names.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "暂无配置，使用右侧表单创建一个吧。";
          profileList.appendChild(empty);
          return;
        }
        names.sort();
        names.forEach(function (name) {
          const profile = state.profiles[name] || {};
          const card = document.createElement("article");
          card.className = "profile-card" + (state.current === name ? " current" : "");

          const head = document.createElement("div");
          head.className = "profile-head";
          const title = document.createElement("h3");
          title.textContent = name;
          head.appendChild(title);
          if (state.current === name) {
            const badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = "当前";
            head.appendChild(badge);
          }
          card.appendChild(head);

          const model = document.createElement("p");
          model.className = "profile-meta";
          model.textContent = profile.model ? "模型：" + profile.model : "未设置默认模型";
          card.appendChild(model);

          const env = profile.env || {};
          const keys = Object.keys(env);
          if (!keys.length) {
            const placeholder = document.createElement("p");
            placeholder.className = "profile-meta";
            placeholder.textContent = "未配置环境变量";
            card.appendChild(placeholder);
          } else {
            const list = document.createElement("ul");
            list.className = "env-list";
            keys.sort();
            keys.forEach(function (key) {
              const item = document.createElement("li");
              item.className = "env-item";
              const label = document.createElement("span");
              label.textContent = key;
              const value = document.createElement("code");
              value.textContent = maskSensitive(key, env[key]);
              item.appendChild(label);
              item.appendChild(value);
              list.appendChild(item);
            });
            card.appendChild(list);
          }

          const actions = document.createElement("div");
          actions.className = "profile-actions";

          const useButton = document.createElement("button");
          useButton.type = "button";
          useButton.className = "primary";
          useButton.textContent = state.current === name ? "使用中" : "设为当前";
          useButton.disabled = state.current === name;
          useButton.addEventListener("click", function () {
            switchCurrent(name);
          });

          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "secondary";
          editButton.textContent = "编辑";
          editButton.addEventListener("click", function () {
            fillForm(name);
          });

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "danger";
          deleteButton.textContent = "删除";
          deleteButton.addEventListener("click", function () {
            removeProfile(name);
          });

          actions.appendChild(useButton);
          actions.appendChild(editButton);
          actions.appendChild(deleteButton);
          card.appendChild(actions);

          profileList.appendChild(card);
        });
      }

      function fillForm(name) {
        const profile = state.profiles[name];
        if (!profile) {
          return;
        }
        state.editing = name;
        formTitle.textContent = "编辑配置 - " + name;
        nameInput.value = name;
        modelInput.value = profile.model || "";
        setCurrentInput.checked = state.current === name;
        clearEnvRows();
        const env = profile.env || {};
        const keys = Object.keys(env);
        if (!keys.length) {
          addEnvRow("", "");
        } else {
          keys.sort();
          keys.forEach(function (key) {
            addEnvRow(key, env[key]);
          });
        }
        setStatus("正在编辑配置", "");
        setDetail("保存后将立即写入配置文件", "");
      }

      function resetForm() {
        state.editing = null;
        formTitle.textContent = "新增配置";
        form.reset();
        setCurrentInput.checked = Object.keys(state.profiles).length === 0;
        clearEnvRows();
        addEnvRow("", "");
        setStatus("等待操作…", "");
        setDetail("", "");
      }

      function buildPayload() {
        const name = nameInput.value.trim();
        if (!name) {
          throw new Error("配置名称不能为空");
        }
        const model = modelInput.value.trim();
        const env = collectEnv();
        const payload = {
          name: name,
          profile: {},
          setCurrent: setCurrentInput.checked,
        };
        if (state.editing) {
          payload.originalName = state.editing;
        }
        if (model) {
          payload.profile.model = model;
        }
        if (Object.keys(env).length) {
          payload.profile.env = env;
        }
        return payload;
      }

      function applyResponse(result) {
        if (!result.success) {
          throw new Error(result.message || "操作失败");
        }
        state.current = result.data.current;
        state.profiles = result.data.configs || {};
        renderProfiles();
      }

      async function loadProfiles() {
        setStatus("正在加载配置…", "");
        try {
          const response = await fetch("/api/claude");
          const result = await response.json();
          applyResponse(result);
          setStatus("已加载最新配置", "success");
          setDetail("共 " + Object.keys(state.profiles).length + " 个配置", "");
          if (!state.editing) {
            resetForm();
          }
        } catch (error) {
          console.error(error);
          setStatus("加载失败", "error");
          setDetail(error.message, "error");
        }
      }

      async function saveProfile(event) {
        event.preventDefault();
        let payload;
        try {
          payload = buildPayload();
        } catch (error) {
          setStatus(error.message, "error");
          return;
        }
        setStatus("正在保存配置…", "");
        try {
          const response = await fetch("/api/claude/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          applyResponse(result);
          setStatus("保存成功", "success");
          setDetail("配置已写入 ~/.acs/config.json", "success");
          resetForm();
        } catch (error) {
          console.error(error);
          setStatus("保存失败", "error");
          setDetail(error.message, "error");
        }
      }

      async function switchCurrent(name) {
        setStatus("正在切换配置…", "");
        try {
          const response = await fetch("/api/claude/current", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name }),
          });
          const result = await response.json();
          applyResponse(result);
          setStatus("已切换当前配置", "success");
          setDetail("当前配置：" + (state.current || "未设置"), "success");
          resetForm();
        } catch (error) {
          console.error(error);
          setStatus("切换失败", "error");
          setDetail(error.message, "error");
        }
      }

      async function removeProfile(name) {
        if (!window.confirm("确认删除配置 " + name + " 吗？")) {
          return;
        }
        setStatus("正在删除配置…", "");
        try {
          const response = await fetch("/api/claude/profile/" + encodeURIComponent(name), {
            method: "DELETE",
          });
          const result = await response.json();
          applyResponse(result);
          setStatus("删除成功", "success");
          setDetail("配置列表已更新", "success");
          resetForm();
        } catch (error) {
          console.error(error);
          setStatus("删除失败", "error");
          setDetail(error.message, "error");
        }
      }

      refreshButton.addEventListener("click", loadProfiles);
      newProfileButton.addEventListener("click", resetForm);
      addEnvButton.addEventListener("click", function () {
        addEnvRow("", "");
      });
      cancelButton.addEventListener("click", resetForm);
      form.addEventListener("submit", saveProfile);

      resetForm();
      loadProfiles();
    })();
  </script>
</body>
</html>`;


interface UiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ClaudeStatePayload {
  current: string | null;
  configs: Record<string, ClaudeProfile>;
}

export interface StartUiServerOptions {
  port?: number;
  host?: string;
  logger?: Logger;
}

function sendJson<T>(
  res: http.ServerResponse,
  statusCode: number,
  payload: UiResponse<T>
): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(payload));
}

function sendError(
  res: http.ServerResponse,
  message: string,
  statusCode = 500
): void {
  sendJson(res, statusCode, {
    success: false,
    data: { current: null, configs: {} },
    message,
  });
}

async function parseRequestBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req
      .on("data", (chunk) => {
        chunks.push(Buffer.from(chunk));
      })
      .on("end", () => {
        if (!chunks.length) {
          resolve({});
          return;
        }
        try {
          const raw = Buffer.concat(chunks).toString("utf-8");
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(new Error("Invalid JSON body"));
        }
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

function normalizeClaudeConfig(config: AcsConfig): ClaudeConfig {
  const provider = config.config ?? {};
  if (!provider.claude) {
    return { configs: {}, current: undefined };
  }
  return {
    current: provider.claude.current,
    configs: provider.claude.configs ?? {},
  };
}

function readClaudeState(): ClaudeStatePayload {
  const config = readConfig();
  const claude = normalizeClaudeConfig(config);
  return {
    current: claude.current ?? null,
    configs: claude.configs,
  };
}

function sanitizeProfile(input: unknown): ClaudeProfile {
  const profile: ClaudeProfile = {};
  if (!input || typeof input !== "object") {
    return profile;
  }
  const record = input as Record<string, unknown>;
  if (typeof record.model === "string" && record.model.trim()) {
    profile.model = record.model.trim();
  }
  if (record.env && typeof record.env === "object") {
    const envInput = record.env as Record<string, unknown>;
    const env: Record<string, string> = {};
    Object.entries(envInput).forEach(([key, value]) => {
      if (typeof key !== "string") {
        return;
      }
      const trimmedKey = key.trim();
      if (!trimmedKey) {
        return;
      }
      if (typeof value === "string") {
        env[trimmedKey] = value;
      }
    });
    if (Object.keys(env).length) {
      profile.env = env;
    }
  }
  return profile;
}

function writeClaudeState(
  updater: (config: AcsConfig, claude: ClaudeConfig) => ClaudeConfig | null,
  logger?: Logger
): ClaudeStatePayload {
  const currentConfig = readConfig();
  const claude = normalizeClaudeConfig(currentConfig);
  const nextClaude = updater(currentConfig, claude);

  if (nextClaude === null) {
    const cleared: AcsConfig = {
      ...currentConfig,
      config: { ...currentConfig.config },
    };
    delete cleared.config.claude;
    writeConfig(cleared);
    return { current: null, configs: {} };
  }

  const nextConfig: AcsConfig = {
    ...currentConfig,
    config: {
      ...currentConfig.config,
      claude: {
        current: nextClaude.current,
        configs: nextClaude.configs,
      },
    },
  };

  writeConfig(nextConfig);

  if (nextClaude.current) {
    const profile = nextClaude.configs[nextClaude.current];
    if (profile) {
      try {
        applyClaudeProfileToSettings(profile);
      } catch (error) {
        logger?.warn(`同步 Claude 设置文件失败: ${(error as Error).message}`);
      }
    }
  }

  return {
    current: nextClaude.current ?? null,
    configs: nextClaude.configs,
  };
}

function createRequestListener(logger?: Logger): http.RequestListener {
  return async (req, res) => {
    if (!req.url) {
      sendError(res, "缺少请求地址");
      return;
    }

    const origin = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url, origin);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,DELETE,OPTIONS"
      );
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(UI_HTML);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/claude") {
      try {
        const data = readClaudeState();
        sendJson(res, 200, { success: true, data });
      } catch (error) {
        logger?.error(`读取配置失败: ${(error as Error).message}`);
        sendError(res, "读取配置失败", 500);
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/claude/profile") {
      try {
        const body = (await parseRequestBody(req)) as Record<string, unknown>;
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) {
          sendError(res, "配置名称不能为空", 400);
          return;
        }
        const setCurrent = body.setCurrent === true;
        const originalName =
          typeof body.originalName === "string"
            ? body.originalName.trim()
            : undefined;
        const sanitized = sanitizeProfile(body.profile);
        const data = writeClaudeState((config, claude) => {
          const configs = { ...claude.configs };
          if (originalName && originalName !== name) {
            delete configs[originalName];
          }
          configs[name] = sanitized;
          let nextCurrent = claude.current;
          if (!nextCurrent || nextCurrent === originalName) {
            nextCurrent = name;
          }
          if (setCurrent) {
            nextCurrent = name;
          }
          return {
            current: nextCurrent,
            configs,
          };
        }, logger);
        sendJson(res, 200, { success: true, data });
      } catch (error) {
        logger?.error(`保存配置失败: ${(error as Error).message}`);
        sendError(res, "保存配置失败", 500);
      }
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/claude/profile/")) {
      const encoded = url.pathname.slice("/api/claude/profile/".length);
      const name = decodeURIComponent(encoded);
      if (!name) {
        sendError(res, "配置名称不能为空", 400);
        return;
      }
      try {
        const data = writeClaudeState((config, claude) => {
          if (!claude.configs[name]) {
            throw new Error("NOT_FOUND");
          }
          const configs = { ...claude.configs };
          delete configs[name];
          const remaining = Object.keys(configs);
          if (!remaining.length) {
            return null;
          }
          let nextCurrent = claude.current;
          if (nextCurrent === name) {
            nextCurrent = remaining[0];
          }
          return {
            current: nextCurrent,
            configs,
          };
        }, logger);
        sendJson(res, 200, { success: true, data });
      } catch (error) {
        if ((error as Error).message === "NOT_FOUND") {
          sendError(res, "未找到指定配置", 404);
        } else {
          logger?.error(`删除配置失败: ${(error as Error).message}`);
          sendError(res, "删除配置失败", 500);
        }
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/claude/current") {
      try {
        const body = (await parseRequestBody(req)) as Record<string, unknown>;
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) {
          sendError(res, "配置名称不能为空", 400);
          return;
        }
        const data = writeClaudeState((config, claude) => {
          if (!claude.configs[name]) {
            throw new Error("NOT_FOUND");
          }
          return {
            current: name,
            configs: { ...claude.configs },
          };
        }, logger);
        sendJson(res, 200, { success: true, data });
      } catch (error) {
        if ((error as Error).message === "NOT_FOUND") {
          sendError(res, "未找到指定配置", 404);
        } else {
          logger?.error(`切换配置失败: ${(error as Error).message}`);
          sendError(res, "切换配置失败", 500);
        }
      }
      return;
    }

    sendError(res, "未找到对应接口", 404);
  };
}

export async function startUiServer(
  options: StartUiServerOptions = {}
): Promise<{
  server: http.Server;
  url: string;
  port: number;
}> {
  const port = options.port ?? DEFAULT_UI_PORT;
  const host = options.host ?? "127.0.0.1";

  const server = http.createServer(createRequestListener(options.logger));

  await new Promise<void>((resolve, reject) => {
    server.once("error", (error) => {
      reject(error);
    });
    server.listen(port, host, () => {
      resolve();
    });
  });

  const address = server.address();
  const actualPort =
    typeof address === "object" && address && "port" in address
      ? address.port
      : port;
  const url = `http://${host}:${actualPort}`;
  return { server, url, port: actualPort };
}

