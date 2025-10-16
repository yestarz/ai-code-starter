import http from "node:http";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { readConfig, writeConfig } from "../config";
import {
  AcsConfig,
  CliTool,
  ClaudeProfile,
  Project,
  ClaudeConfig,
} from "../types";
import { formatPathForDisplay, normalizePath } from "../utils/path";
import { applyClaudeProfileToSettings } from "../utils/claude";
import type { Logger } from "../utils/logger";

export const DEFAULT_UI_PORT = 8888;
const DEFAULT_UI_HOST = "127.0.0.1";

interface StartUiServerOptions {
  port?: number;
  host?: string;
  logger?: Logger;
}

interface JsonSuccess<T> {
  success: true;
  data: T;
}

interface JsonError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

type JsonResponse<T> = JsonSuccess<T> | JsonError;

interface ProjectView extends Project {
  id: string;
  displayPath: string;
  exists: boolean;
  isDirectory: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectDetailView extends ProjectView {
  sizeInBytes?: number;
}

interface CliToolView extends CliTool {
  id: string;
}

interface ClaudeProfileView {
  id: string;
  name: string;
  model?: string;
  env: Record<string, string>;
  maskedEnv: Record<string, string>;
  isCurrent: boolean;
}

const TEXT_ENCODER = new TextEncoder();

const UI_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ACS 控制台</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: "Inter", "PingFang SC", "Segoe UI", sans-serif;
      --bg: #f1f5f9;
      --fg: #0f172a;
      --muted: #64748b;
      --card: #ffffff;
      --border: rgba(15, 23, 42, 0.08);
      --shadow: rgba(15, 23, 42, 0.15);
      --accent: #2563eb;
      --accent-soft: rgba(37, 99, 235, 0.12);
      --danger: #dc2626;
      --success: #15803d;
      --warning: #c2410c;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), transparent 55%), #e2e8f0;
      color: var(--fg);
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 28px 36px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
    }

    header h1 {
      margin: 0;
      font-size: 28px;
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    header p {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
      max-width: 520px;
      line-height: 1.6;
    }

    nav {
      margin-left: auto;
      display: flex;
      gap: 12px;
    }

    nav button {
      border: none;
      padding: 10px 20px;
      border-radius: 999px;
      font-weight: 600;
      color: var(--muted);
      background: transparent;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    nav button.active {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 14px 32px rgba(37, 99, 235, 0.25);
    }

    main {
      flex: 1;
      padding: 0 36px 40px;
      display: grid;
      gap: 28px;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }

    section {
      background: rgba(255, 255, 255, 0.96);
      border-radius: 22px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: 0 22px 48px rgba(15, 23, 42, 0.12);
      padding: 24px;
      display: none;
      flex-direction: column;
      gap: 20px;
    }

    section.active {
      display: flex;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .section-header h2 {
      margin: 0;
      font-size: 20px;
    }

    .section-header p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }

    .section-grid {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }

    .card {
      background: var(--card);
      border-radius: 18px;
      border: 1px solid var(--border);
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .card h3 {
      margin: 0;
      font-size: 18px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: rgba(148, 163, 184, 0.12);
      color: var(--fg);
    }

    th, td {
      text-align: left;
      padding: 10px 12px;
      font-size: 14px;
    }

    tbody tr {
      border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    }

    tbody tr:hover {
      background: rgba(37, 99, 235, 0.06);
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .toolbar input {
      flex: 1;
      min-width: 180px;
    }

    input, textarea {
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      padding: 10px 12px;
      font-size: 14px;
      font-family: inherit;
      color: var(--fg);
      background: rgba(255, 255, 255, 0.95);
    }

    textarea {
      min-height: 120px;
      resize: vertical;
      line-height: 1.5;
    }

    input:focus, textarea:focus {
      outline: 2px solid rgba(37, 99, 235, 0.35);
      outline-offset: 2px;
    }

    button.primary {
      border: none;
      background: var(--accent);
      color: #fff;
      border-radius: 999px;
      padding: 10px 18px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 16px 40px rgba(37, 99, 235, 0.25);
      transition: transform 0.2s ease;
    }

    button.secondary {
      border: none;
      background: rgba(148, 163, 184, 0.16);
      color: var(--fg);
      border-radius: 999px;
      padding: 10px 18px;
      font-weight: 600;
      cursor: pointer;
    }

    button.danger {
      border: none;
      background: rgba(220, 38, 38, 0.12);
      color: var(--danger);
      border-radius: 999px;
      padding: 10px 18px;
      font-weight: 600;
      cursor: pointer;
    }

    button.ghost {
      border: none;
      background: transparent;
      color: var(--muted);
      font-weight: 600;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    .status {
      color: var(--muted);
      font-size: 13px;
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .status.success {
      color: var(--success);
    }

    .status.error {
      color: var(--danger);
    }

    .status.warning {
      color: var(--warning);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(37, 99, 235, 0.12);
      color: var(--accent);
      font-size: 12px;
      font-weight: 600;
    }

    .mono {
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 13px;
    }

    .empty {
      padding: 24px;
      text-align: center;
      border-radius: 16px;
      border: 1px dashed rgba(148, 163, 184, 0.35);
      background: rgba(241, 245, 249, 0.6);
      color: var(--muted);
    }

    .log-panel {
      background: rgba(15, 23, 42, 0.94);
      color: #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      min-height: 150px;
      max-height: 260px;
      overflow: auto;
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
      font-size: 13px;
    }

    .link-row {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 999;
    }

    .modal {
      width: min(560px, 100%);
      max-height: 90vh;
      overflow: auto;
      background: var(--card);
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: 0 28px 64px rgba(15, 23, 42, 0.32);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .modal-header button {
      border: none;
      background: transparent;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      color: var(--muted);
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-form label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: var(--muted);
    }

    .env-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .env-row {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .env-row button {
      border: none;
      border-radius: 10px;
      padding: 8px 12px;
      background: rgba(220, 38, 38, 0.14);
      color: var(--danger);
      font-weight: 600;
      cursor: pointer;
    }

    .input-error {
      border-color: rgba(220, 38, 38, 0.6);
    }

    .hint {
      font-size: 12px;
      color: var(--muted);
    }

    .subtle-link {
      font-size: 13px;
      color: var(--accent);
      cursor: pointer;
    }

    [hidden] {
      display: none !important;
    }

    @media (max-width: 960px) {
      header {
        padding: 24px 20px;
      }
      main {
        padding: 0 20px 24px;
      }
      section {
        padding: 20px;
      }
      nav {
        width: 100%;
        justify-content: flex-start;
      }
      nav button {
        flex: 1;
      }
      .section-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>ACS 控制台</h1>
      <p>通过 Web 界面管理项目、预设 CLI 工具与 Claude 配置，支持可视化操作与命令触发。</p>
    </div>
    <nav>
      <button class="active" data-view="projects">项目管理</button>
      <button data-view="cli">CLI 工具</button>
      <button data-view="claude">Claude 配置</button>
    </nav>
  </header>
  <main>
    <section id="view-projects" class="active">
      <div class="section-header">
        <div>
          <h2>项目管理</h2>
          <p>以表格查看所有项目，支持搜索、详情与批量删除。</p>
        </div>
        <div class="status" id="project-status">正在加载项目…</div>
      </div>
      <div class="section-grid">
        <div class="card">
          <div class="section-header">
            <h3>项目列表</h3>
            <div class="link-row">
              <button class="primary" id="project-create">新增项目</button>
              <button class="secondary" id="refresh-projects">刷新</button>
            </div>
          </div>
          <div class="toolbar">
            <input id="project-search" type="search" placeholder="按名称或路径搜索…" />
            <button class="danger" id="remove-projects" disabled>删除所选</button>
          </div>
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" id="project-select-all" /></th>
                <th>名称</th>
                <th>路径</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="project-table-body"></tbody>
          </table>
          <div class="empty" id="project-empty" hidden>暂无项目，点击“新增项目”进行维护。</div>
        </div>
      </div>
    </section>

    <section id="view-cli">
      <div class="section-header">
        <div>
          <h2>CLI 工具管理</h2>
          <p>集中存储脚本命令，便于统一维护与引用。</p>
        </div>
        <div class="status" id="cli-status">正在加载工具…</div>
      </div>
      <div class="section-grid">
        <div class="card">
          <div class="section-header">
            <h3>工具列表</h3>
            <div class="link-row">
              <button class="primary" id="cli-create">新增工具</button>
              <button class="secondary" id="refresh-cli">刷新</button>
            </div>
          </div>
          <div class="toolbar">
            <input id="cli-search" type="search" placeholder="按名称或命令过滤…" />
            <button class="danger" id="remove-cli" disabled>删除所选</button>
          </div>
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" id="cli-select-all" /></th>
                <th>名称</th>
                <th>命令</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="cli-table-body"></tbody>
          </table>
          <div class="empty" id="cli-empty" hidden>暂未配置任何 CLI 工具。</div>
        </div>
      </div>
    </section>

    <section id="view-claude">
      <div class="section-header">
        <div>
          <h2>Claude 配置中心</h2>
          <p>支持查看当前 profile、快速切换及新增/编辑配置。</p>
        </div>
        <div class="status" id="claude-status">正在加载配置…</div>
      </div>
      <div class="section-grid">
        <div class="card">
          <h3>当前配置</h3>
          <div id="claude-current" class="grid"></div>
        </div>
        <div class="card">
          <div class="section-header">
            <h3>配置列表</h3>
            <div class="link-row">
              <button class="primary" id="claude-create">新增配置</button>
              <button class="secondary" id="refresh-claude">刷新</button>
            </div>
          </div>
          <input id="claude-search" type="search" placeholder="支持按名称或变量过滤…" />
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>模型</th>
                <th>敏感变量</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="claude-table-body"></tbody>
          </table>
          <div class="empty" id="claude-empty" hidden>暂无 Claude 配置，点击“新增配置”录入。</div>
        </div>
      </div>
    </section>
  </main>
  <div id="modal-overlay" class="modal-overlay" hidden>
    <div id="modal-box" class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 id="modal-title"></h3>
        <button type="button" id="modal-close" aria-label="关闭弹窗">&times;</button>
      </div>
      <div id="modal-content"></div>
    </div>
  </div>
  <script>
    (function () {
      const views = document.querySelectorAll("nav button");
      const sections = {
        projects: document.getElementById("view-projects"),
        cli: document.getElementById("view-cli"),
        claude: document.getElementById("view-claude"),
      };

      views.forEach(function (button) {
        button.addEventListener("click", function () {
          views.forEach(function (item) {
            item.classList.remove("active");
          });
          button.classList.add("active");
          const target = button.getAttribute("data-view");
          Object.keys(sections).forEach(function (key) {
            sections[key].classList.toggle("active", key === target);
          });
        });
      });

      const modalOverlay = document.getElementById("modal-overlay");
      const modalTitle = document.getElementById("modal-title");
      const modalContent = document.getElementById("modal-content");
      const modalClose = document.getElementById("modal-close");
      const modalBox = document.getElementById("modal-box");
      let modalCleanup = null;

      function openModal(title, content, options) {
        modalTitle.textContent = title;
        modalContent.innerHTML = "";
        modalContent.appendChild(content);
        if (options && options.width) {
          modalBox.style.width = options.width;
        } else {
          modalBox.style.removeProperty("width");
        }
        modalOverlay.hidden = false;
        modalCleanup = options && options.onClose ? options.onClose : null;
      }

      function closeModal() {
        modalOverlay.hidden = true;
        modalContent.innerHTML = "";
        if (typeof modalCleanup === "function") {
          try {
            modalCleanup();
          } catch (error) {
            console.error(error);
          }
        }
        modalCleanup = null;
      }

      modalClose.addEventListener("click", function () {
        closeModal();
      });

      modalOverlay.addEventListener("click", function (event) {
        if (event.target === modalOverlay) {
          closeModal();
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modalOverlay.hidden) {
          closeModal();
        }
      });

      function notify(element, message, tone) {
        element.textContent = message;
        element.className = "status" + (tone ? " " + tone : "");
      }

      async function request(path, options) {
        const response = await fetch(path, options);
        const data = await response.json();
        if (!data.success) {
          const error = new Error(data.error && data.error.message ? data.error.message : "发生未知错误");
          if (data.error && data.error.code) {
            error.code = data.error.code;
          }
          if (data.error && data.error.details) {
            error.details = data.error.details;
          }
          throw error;
        }
        return data.data;
      }

      const store = {
        projects: [],
        projectFilter: "",
        projectSelection: new Set(),
        cli: [],
        cliFilter: "",
        cliSelection: new Set(),
        claude: { current: null, configs: [] },
        claudeFilter: "",
      };

      function getFilteredProjects() {
        if (!store.projectFilter) {
          return store.projects.slice();
        }
        const keyword = store.projectFilter.toLowerCase();
        return store.projects.filter(function (item) {
          return item.name.toLowerCase().includes(keyword) || item.path.toLowerCase().includes(keyword);
        });
      }

      function getFilteredCli() {
        if (!store.cliFilter) {
          return store.cli.slice();
        }
        const keyword = store.cliFilter.toLowerCase();
        return store.cli.filter(function (item) {
          return item.name.toLowerCase().includes(keyword) || item.command.toLowerCase().includes(keyword);
        });
      }

      function getFilteredClaude() {
        if (!store.claudeFilter) {
          return store.claude.configs.slice();
        }
        const keyword = store.claudeFilter.toLowerCase();
        return store.claude.configs.filter(function (item) {
          if (item.name.toLowerCase().includes(keyword)) {
            return true;
          }
          return Object.keys(item.env).some(function (key) {
            return key.toLowerCase().includes(keyword);
          });
        });
      }

      const projectStatus = document.getElementById("project-status");
      const projectTableBody = document.getElementById("project-table-body");
      const projectEmpty = document.getElementById("project-empty");
      const projectSearch = document.getElementById("project-search");
      const projectSelectAll = document.getElementById("project-select-all");
      const projectRemove = document.getElementById("remove-projects");
      const projectRefresh = document.getElementById("refresh-projects");
      const projectCreate = document.getElementById("project-create");

      function renderProjects() {
        const filtered = getFilteredProjects();
        projectTableBody.innerHTML = "";
        if (!filtered.length) {
          projectEmpty.hidden = false;
          projectSelectAll.checked = false;
          projectSelectAll.indeterminate = false;
          projectRemove.disabled = true;
          return;
        }
        projectEmpty.hidden = true;
        filtered.forEach(function (project) {
          const row = document.createElement("tr");

          const checkboxCell = document.createElement("td");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = store.projectSelection.has(project.id);
          checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
              store.projectSelection.add(project.id);
            } else {
              store.projectSelection.delete(project.id);
            }
            renderProjects();
          });
          checkboxCell.appendChild(checkbox);
          row.appendChild(checkboxCell);

          const nameCell = document.createElement("td");
          nameCell.textContent = project.name;
          row.appendChild(nameCell);

          const pathCell = document.createElement("td");
          pathCell.textContent = project.displayPath;
          pathCell.className = "mono";
          row.appendChild(pathCell);

          const statusCell = document.createElement("td");
          statusCell.textContent = project.exists ? "可用" : "路径无效";
          statusCell.className = project.exists ? "status success" : "status warning";
          row.appendChild(statusCell);

          const updatedCell = document.createElement("td");
          updatedCell.textContent = project.updatedAt || "-";
          row.appendChild(updatedCell);

          const actionCell = document.createElement("td");
          actionCell.className = "link-row";
          const detailButton = document.createElement("button");
          detailButton.type = "button";
          detailButton.className = "ghost";
          detailButton.textContent = "详情";
          detailButton.addEventListener("click", function () {
            showProjectDetail(project);
          });
          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "ghost";
          deleteButton.textContent = "删除";
          deleteButton.addEventListener("click", function () {
            confirmProjectRemoval([project.id]);
          });
          actionCell.appendChild(detailButton);
          actionCell.appendChild(deleteButton);
          row.appendChild(actionCell);

          projectTableBody.appendChild(row);
        });

        const selectedInFiltered = filtered.reduce(function (total, item) {
          return total + (store.projectSelection.has(item.id) ? 1 : 0);
        }, 0);
        projectSelectAll.checked = filtered.length > 0 && selectedInFiltered === filtered.length;
        projectSelectAll.indeterminate = selectedInFiltered > 0 && selectedInFiltered < filtered.length;
        projectRemove.disabled = store.projectSelection.size === 0;
      }

      async function fetchProjects() {
        notify(projectStatus, "正在加载项目…", "");
        try {
          const data = await request("/api/projects");
          store.projects = data.items;
          store.projectSelection.clear();
          renderProjects();
          notify(projectStatus, "已加载 " + store.projects.length + " 个项目", "success");
        } catch (error) {
          console.error(error);
          notify(projectStatus, error.message || "加载失败", "error");
        }
      }

      function createProjectForm() {
        const form = document.createElement("form");
        form.className = "modal-form";

        const pathLabel = document.createElement("label");
        pathLabel.textContent = "项目路径";
        const pathInput = document.createElement("input");
        pathInput.type = "text";
        pathInput.placeholder = "/path/to/project";
        pathInput.required = true;
        pathLabel.appendChild(pathInput);
        const pathHint = document.createElement("span");
        pathHint.className = "hint";
        pathHint.textContent = "需为本地存在的目录";
        pathLabel.appendChild(pathHint);
        form.appendChild(pathLabel);

        const nameLabel = document.createElement("label");
        nameLabel.textContent = "自定义名称（可选）";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "默认为目录名";
        nameLabel.appendChild(nameInput);
        form.appendChild(nameLabel);

        const duplicateOption = document.createElement("label");
        duplicateOption.className = "option";
        const duplicateInput = document.createElement("input");
        duplicateInput.type = "checkbox";
        duplicateOption.appendChild(duplicateInput);
        const duplicateText = document.createElement("span");
        duplicateText.textContent = "允许覆盖同名或同路径记录";
        duplicateOption.appendChild(duplicateText);
        form.appendChild(duplicateOption);

        const actions = document.createElement("div");
        actions.className = "modal-actions";
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "secondary";
        cancelButton.textContent = "取消";
        cancelButton.addEventListener("click", function () {
          closeModal();
        });
        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.className = "primary";
        submitButton.textContent = "保存";
        actions.appendChild(cancelButton);
        actions.appendChild(submitButton);
        form.appendChild(actions);

        async function submitProject(forceDuplicate) {
          const payload = {
            path: pathInput.value,
            name: nameInput.value,
            allowDuplicate: forceDuplicate === true ? true : duplicateInput.checked,
          };
          try {
            await request("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            closeModal();
            notify(projectStatus, "项目保存成功", "success");
            await fetchProjects();
          } catch (error) {
            if (error.code === "duplicate" && !payload.allowDuplicate) {
              if (window.confirm("发现重复记录，是否覆盖？确认后将写入新记录。")) {
                duplicateInput.checked = true;
                await submitProject(true);
                return;
              }
            }
            notify(projectStatus, error.message || "保存失败", "error");
          }
        }

        form.addEventListener("submit", function (event) {
          event.preventDefault();
          submitProject(false);
        });

        openModal("新增项目", form);
      }

      async function showProjectDetail(project) {
        notify(projectStatus, "正在加载项目详情…", "");
        try {
          const detail = await request("/api/projects/" + project.id);
          const container = document.createElement("div");
          container.className = "modal-form";

          function appendItem(label, value, mono) {
            const row = document.createElement("div");
            const strong = document.createElement("strong");
            strong.textContent = label + "：";
            const span = document.createElement("span");
            if (mono) {
              span.className = "mono";
            }
            span.textContent = value;
            row.appendChild(strong);
            row.appendChild(span);
            container.appendChild(row);
          }

          appendItem("名称", detail.name, false);
          appendItem("路径", detail.displayPath, true);
          appendItem("状态", detail.exists ? "路径有效（" + (detail.isDirectory ? "目录" : "文件") + "）" : "路径不存在", false);
          appendItem("创建时间", detail.createdAt || "-", false);
          appendItem("最近修改", detail.updatedAt || "-", false);
          if (typeof detail.sizeInBytes === "number") {
            appendItem("大小", detail.sizeInBytes + " 字节", false);
          }

          const closeButton = document.createElement("button");
          closeButton.type = "button";
          closeButton.className = "secondary";
          closeButton.textContent = "关闭";
          closeButton.addEventListener("click", function () {
            closeModal();
          });
          const actions = document.createElement("div");
          actions.className = "modal-actions";
          actions.appendChild(closeButton);
          container.appendChild(actions);

          openModal("项目详情 - " + detail.name, container, { width: "460px" });
          notify(projectStatus, "详情加载完成", "success");
        } catch (error) {
          notify(projectStatus, error.message || "加载详情失败", "error");
        }
      }

      async function confirmProjectRemoval(ids) {
        if (!ids.length) {
          return;
        }
        if (!window.confirm("确定删除选中的项目记录吗？")) {
          return;
        }
        try {
          await request("/api/projects", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ids }),
          });
          notify(projectStatus, "删除成功", "success");
          await fetchProjects();
        } catch (error) {
          notify(projectStatus, error.message || "删除失败", "error");
        }
      }

      projectSearch.addEventListener("input", function () {
        store.projectFilter = projectSearch.value.trim();
        renderProjects();
      });

      projectSelectAll.addEventListener("change", function () {
        const filtered = getFilteredProjects();
        if (projectSelectAll.checked) {
          filtered.forEach(function (item) {
            store.projectSelection.add(item.id);
          });
        } else {
          filtered.forEach(function (item) {
            store.projectSelection.delete(item.id);
          });
        }
        renderProjects();
      });

      projectRemove.addEventListener("click", function () {
        confirmProjectRemoval(Array.from(store.projectSelection));
      });

      projectRefresh.addEventListener("click", function () {
        fetchProjects();
      });

      projectCreate.addEventListener("click", function () {
        createProjectForm();
      });

      const cliStatus = document.getElementById("cli-status");
      const cliTableBody = document.getElementById("cli-table-body");
      const cliEmpty = document.getElementById("cli-empty");
      const cliSearch = document.getElementById("cli-search");
      const cliSelectAll = document.getElementById("cli-select-all");
      const cliRemove = document.getElementById("remove-cli");
      const cliRefresh = document.getElementById("refresh-cli");
      const cliCreate = document.getElementById("cli-create");

      function renderCli() {
        const filtered = getFilteredCli();
        cliTableBody.innerHTML = "";
        if (!filtered.length) {
          cliEmpty.hidden = false;
          cliSelectAll.checked = false;
          cliSelectAll.indeterminate = false;
          cliRemove.disabled = true;
          return;
        }
        cliEmpty.hidden = true;
        filtered.forEach(function (tool) {
          const row = document.createElement("tr");

          const checkboxCell = document.createElement("td");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = store.cliSelection.has(tool.id);
          checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
              store.cliSelection.add(tool.id);
            } else {
              store.cliSelection.delete(tool.id);
            }
            renderCli();
          });
          checkboxCell.appendChild(checkbox);
          row.appendChild(checkboxCell);

          const nameCell = document.createElement("td");
          nameCell.textContent = tool.name;
          row.appendChild(nameCell);

          const commandCell = document.createElement("td");
          commandCell.textContent = tool.command;
          commandCell.className = "mono";
          row.appendChild(commandCell);

          const actionCell = document.createElement("td");
          actionCell.className = "link-row";

          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "ghost";
          editButton.textContent = "编辑";
          editButton.addEventListener("click", function () {
            createCliForm(tool);
          });
          actionCell.appendChild(editButton);

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "ghost";
          deleteButton.textContent = "删除";
          deleteButton.addEventListener("click", function () {
            confirmCliRemoval([tool.id]);
          });
          actionCell.appendChild(deleteButton);

          row.appendChild(actionCell);
          cliTableBody.appendChild(row);
        });

        const selectedInFiltered = filtered.reduce(function (total, item) {
          return total + (store.cliSelection.has(item.id) ? 1 : 0);
        }, 0);
        cliSelectAll.checked = filtered.length > 0 && selectedInFiltered === filtered.length;
        cliSelectAll.indeterminate = selectedInFiltered > 0 && selectedInFiltered < filtered.length;
        cliRemove.disabled = store.cliSelection.size === 0;
      }

      async function fetchCliTools() {
        notify(cliStatus, "正在加载工具…", "");
        try {
          const data = await request("/api/cli/tools");
          store.cli = data.items;
          store.cliSelection.clear();
          renderCli();
          notify(cliStatus, "已加载 " + store.cli.length + " 项工具", "success");
        } catch (error) {
          notify(cliStatus, error.message || "加载失败", "error");
        }
      }

      function createCliForm(initial) {
        const form = document.createElement("form");
        form.className = "modal-form";

        const nameLabel = document.createElement("label");
        nameLabel.textContent = "工具名称";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "例如：lint";
        nameInput.required = true;
        if (initial) {
          nameInput.value = initial.name;
        }
        nameLabel.appendChild(nameInput);
        form.appendChild(nameLabel);

        const commandLabel = document.createElement("label");
        commandLabel.textContent = "命令内容";
        const commandInput = document.createElement("textarea");
        commandInput.placeholder = "例如：npm run lint";
        commandInput.required = true;
        if (initial) {
          commandInput.value = initial.command;
        }
        commandLabel.appendChild(commandInput);
        form.appendChild(commandLabel);

        const duplicateOption = document.createElement("label");
        duplicateOption.className = "option";
        const duplicateInput = document.createElement("input");
        duplicateInput.type = "checkbox";
        duplicateOption.appendChild(duplicateInput);
        const duplicateText = document.createElement("span");
        duplicateText.textContent = "允许覆盖同名或同命令记录";
        duplicateOption.appendChild(duplicateText);
        form.appendChild(duplicateOption);

        const actions = document.createElement("div");
        actions.className = "modal-actions";
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "secondary";
        cancelButton.textContent = "取消";
        cancelButton.addEventListener("click", function () {
          closeModal();
        });
        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.className = "primary";
        submitButton.textContent = "保存";
        actions.appendChild(cancelButton);
        actions.appendChild(submitButton);
        form.appendChild(actions);

        async function submitCli(forceDuplicate) {
          const payload = {
            name: nameInput.value,
            command: commandInput.value,
            allowDuplicate: forceDuplicate === true ? true : duplicateInput.checked,
          };
          if (initial) {
            try {
              await request("/api/cli/tools/" + initial.id, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              closeModal();
              notify(cliStatus, "工具已更新", "success");
              await fetchCliTools();
            } catch (error) {
              if (error.code === "duplicate" && !payload.allowDuplicate) {
                if (window.confirm("存在重复记录，是否覆盖？")) {
                  duplicateInput.checked = true;
                  await submitCli(true);
                  return;
                }
              }
              notify(cliStatus, error.message || "保存失败", "error");
            }
          } else {
            try {
              await request("/api/cli/tools", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              closeModal();
              notify(cliStatus, "工具保存成功", "success");
              await fetchCliTools();
            } catch (error) {
              if (error.code === "duplicate" && !payload.allowDuplicate) {
                if (window.confirm("存在重复记录，是否覆盖？")) {
                  duplicateInput.checked = true;
                  await submitCli(true);
                  return;
                }
              }
              notify(cliStatus, error.message || "保存失败", "error");
            }
          }
        }

        form.addEventListener("submit", function (event) {
          event.preventDefault();
          submitCli(false);
        });

        openModal(initial ? "编辑工具 - " + initial.name : "新增工具", form);
      }

      async function confirmCliRemoval(ids) {
        if (!ids.length) {
          return;
        }
        if (!window.confirm("确定删除选中的 CLI 工具吗？")) {
          return;
        }
        try {
          await request("/api/cli/tools", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ids }),
          });
          notify(cliStatus, "删除成功", "success");
          await fetchCliTools();
        } catch (error) {
          notify(cliStatus, error.message || "删除失败", "error");
        }
      }

      cliSearch.addEventListener("input", function () {
        store.cliFilter = cliSearch.value.trim();
        renderCli();
      });

      cliSelectAll.addEventListener("change", function () {
        const filtered = getFilteredCli();
        if (cliSelectAll.checked) {
          filtered.forEach(function (item) {
            store.cliSelection.add(item.id);
          });
        } else {
          filtered.forEach(function (item) {
            store.cliSelection.delete(item.id);
          });
        }
        renderCli();
      });

      cliRemove.addEventListener("click", function () {
        confirmCliRemoval(Array.from(store.cliSelection));
      });

      cliRefresh.addEventListener("click", function () {
        fetchCliTools();
      });

      cliCreate.addEventListener("click", function () {
        createCliForm(null);
      });

      function createEnvEditor(initialEnv) {
        const container = document.createElement("div");
        container.className = "env-grid";

        function addRow(key, value) {
          const row = document.createElement("div");
          row.className = "env-row";

          const keyInput = document.createElement("input");
          keyInput.type = "text";
          keyInput.placeholder = "变量名";
          keyInput.value = key || "";

          const valueInput = document.createElement("input");
          valueInput.type = "text";
          valueInput.placeholder = "变量值";
          valueInput.value = value || "";

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.textContent = "删除";
          removeButton.addEventListener("click", function () {
            row.remove();
            if (!container.querySelector(".env-row")) {
              addRow("", "");
            }
          });

          row.appendChild(keyInput);
          row.appendChild(valueInput);
          row.appendChild(removeButton);

          container.appendChild(row);
        }

        function collect() {
          const result = {};
          let valid = true;
          const rows = container.querySelectorAll(".env-row");
          rows.forEach(function (row) {
            const inputs = row.querySelectorAll("input");
            const key = inputs[0].value.trim();
            const value = inputs[1].value.trim();
            inputs[0].classList.remove("input-error");
            inputs[1].classList.remove("input-error");
            if (!key && !value) {
              return;
            }
            if (!key || !value) {
              valid = false;
              inputs[0].classList.add("input-error");
              inputs[1].classList.add("input-error");
              return;
            }
            result[key] = value;
          });
          return { valid: valid, env: result };
        }

        const keys = Object.keys(initialEnv || {});
        if (keys.length) {
          keys.forEach(function (key) {
            addRow(key, initialEnv[key]);
          });
        } else {
          addRow("", "");
        }

        return {
          container: container,
          addRow: addRow,
          collect: collect,
        };
      }

      const claudeStatus = document.getElementById("claude-status");
      const claudeCurrent = document.getElementById("claude-current");
      const claudeTableBody = document.getElementById("claude-table-body");
      const claudeEmpty = document.getElementById("claude-empty");
      const claudeSearch = document.getElementById("claude-search");
      const claudeRefresh = document.getElementById("refresh-claude");
      const claudeCreate = document.getElementById("claude-create");

      function renderCurrentClaude() {
        claudeCurrent.innerHTML = "";
        const current = store.claude.current;
        if (!current) {
          const placeholder = document.createElement("div");
          placeholder.className = "hint";
          placeholder.textContent = "尚未设置当前配置。";
          claudeCurrent.appendChild(placeholder);
          return;
        }
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = current.name + "（当前）";
        claudeCurrent.appendChild(badge);

        const baseUrl = document.createElement("div");
        baseUrl.innerHTML = "<strong>ANTHROPIC_BASE_URL：</strong>" + (current.env.ANTHROPIC_BASE_URL || "-");
        claudeCurrent.appendChild(baseUrl);

        const token = document.createElement("div");
        token.innerHTML = "<strong>ANTHROPIC_AUTH_TOKEN：</strong>" + (current.maskedEnv.ANTHROPIC_AUTH_TOKEN || "-");
        claudeCurrent.appendChild(token);

        const model = document.createElement("div");
        model.innerHTML = "<strong>model：</strong>" + (current.model || "-");
        claudeCurrent.appendChild(model);
      }

      function renderClaudeList() {
        const filtered = getFilteredClaude();
        claudeTableBody.innerHTML = "";
        if (!filtered.length) {
          claudeEmpty.hidden = false;
          return;
        }
        claudeEmpty.hidden = true;

        filtered.forEach(function (profile) {
          const row = document.createElement("tr");

          const nameCell = document.createElement("td");
          nameCell.textContent = profile.name;
          if (profile.isCurrent) {
            const badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = "当前";
            nameCell.appendChild(document.createElement("br"));
            nameCell.appendChild(badge);
          }
          row.appendChild(nameCell);

          const modelCell = document.createElement("td");
          modelCell.textContent = profile.model || "-";
          row.appendChild(modelCell);

          const envCell = document.createElement("td");
          envCell.innerHTML =
            Object.keys(profile.maskedEnv)
              .map(function (key) {
                return "<div class='mono'>" + key + ": " + profile.maskedEnv[key] + "</div>";
              })
              .join("") || "-";
          row.appendChild(envCell);

          const actionCell = document.createElement("td");
          actionCell.className = "link-row";

          const useButton = document.createElement("button");
          useButton.type = "button";
          useButton.className = "ghost";
          useButton.textContent = "切换";
          useButton.disabled = profile.isCurrent;
          useButton.addEventListener("click", function () {
            switchClaudeProfile(profile.id);
          });
          actionCell.appendChild(useButton);

          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "ghost";
          editButton.textContent = "编辑";
          editButton.addEventListener("click", function () {
            showClaudeForm(profile.id);
          });
          actionCell.appendChild(editButton);

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "ghost";
          deleteButton.textContent = "删除";
          deleteButton.addEventListener("click", function () {
            removeClaudeProfile(profile.id);
          });
          actionCell.appendChild(deleteButton);

          row.appendChild(actionCell);
          claudeTableBody.appendChild(row);
        });
      }

      async function fetchClaude() {
        notify(claudeStatus, "正在加载配置…", "");
        try {
          const data = await request("/api/claude");
          store.claude = data;
          renderCurrentClaude();
          renderClaudeList();
          notify(claudeStatus, "已加载 " + store.claude.configs.length + " 个配置", "success");
        } catch (error) {
          notify(claudeStatus, error.message || "加载失败", "error");
        }
      }

      async function showClaudeForm(id) {
        notify(claudeStatus, id ? "正在加载配置…" : "正在准备新增配置…", "");
        let profile = null;
        if (id) {
          try {
            profile = await request("/api/claude/profile/" + id);
          } catch (error) {
            notify(claudeStatus, error.message || "加载配置失败", "error");
            return;
          }
        }

        const form = document.createElement("form");
        form.className = "modal-form";

        const nameLabel = document.createElement("label");
        nameLabel.textContent = "配置名称";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "例如：work";
        nameInput.required = true;
        if (profile) {
          nameInput.value = profile.name;
        }
        nameLabel.appendChild(nameInput);
        form.appendChild(nameLabel);

        const modelLabel = document.createElement("label");
        modelLabel.textContent = "默认模型";
        const modelInput = document.createElement("input");
        modelInput.type = "text";
        modelInput.placeholder = "例如：claude-3-sonnet";
        if (profile && profile.model) {
          modelInput.value = profile.model;
        }
        modelLabel.appendChild(modelInput);
        form.appendChild(modelLabel);

        const envLabel = document.createElement("label");
        envLabel.textContent = "环境变量";
        const editor = createEnvEditor(profile ? profile.env || {} : {});
        envLabel.appendChild(editor.container);
        const addRowButton = document.createElement("button");
        addRowButton.type = "button";
        addRowButton.className = "secondary";
        addRowButton.textContent = "新增变量";
        addRowButton.addEventListener("click", function () {
          editor.addRow("", "");
        });
        envLabel.appendChild(addRowButton);
        form.appendChild(envLabel);

        const currentOption = document.createElement("label");
        currentOption.className = "option";
        const currentInput = document.createElement("input");
        currentInput.type = "checkbox";
        if (!profile && !store.claude.current) {
          currentInput.checked = true;
        }
        if (profile && store.claude.current && store.claude.current.id === profile.id) {
          currentInput.checked = true;
        }
        currentOption.appendChild(currentInput);
        const currentText = document.createElement("span");
        currentText.textContent = "保存后设为当前配置";
        currentOption.appendChild(currentText);
        form.appendChild(currentOption);

        const actions = document.createElement("div");
        actions.className = "modal-actions";
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "secondary";
        cancelButton.textContent = "取消";
        cancelButton.addEventListener("click", function () {
          closeModal();
        });
        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.className = "primary";
        submitButton.textContent = "保存";
        actions.appendChild(cancelButton);
        actions.appendChild(submitButton);
        form.appendChild(actions);

        form.addEventListener("submit", async function (event) {
          event.preventDefault();
          const result = editor.collect();
          if (!result.valid) {
            notify(claudeStatus, "环境变量需成对填写", "error");
            return;
          }
          const payload = {
            name: nameInput.value,
            model: modelInput.value,
            env: result.env,
            setCurrent: currentInput.checked,
            allowDuplicate: true,
          };
          if (profile) {
            payload.originalId = profile.id;
          }
          try {
            await request("/api/claude/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            closeModal();
            notify(claudeStatus, "保存成功", "success");
            await fetchClaude();
          } catch (error) {
            notify(claudeStatus, error.message || "保存失败", "error");
          }
        });

        openModal(profile ? "编辑配置 - " + profile.name : "新增配置", form);
      }

      async function switchClaudeProfile(id) {
        try {
          await request("/api/claude/current", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: id }),
          });
          notify(claudeStatus, "切换成功，已同步至 ~/.claude/settings.json", "success");
          await fetchClaude();
        } catch (error) {
          notify(claudeStatus, error.message || "切换失败", "error");
        }
      }

      async function removeClaudeProfile(id) {
        if (!window.confirm("确认删除该配置？删除后将无法恢复。")) {
          return;
        }
        try {
          await request("/api/claude/profile/" + id, { method: "DELETE" });
          notify(claudeStatus, "删除成功", "success");
          await fetchClaude();
        } catch (error) {
          notify(claudeStatus, error.message || "删除失败", "error");
        }
      }

      claudeSearch.addEventListener("input", function () {
        store.claudeFilter = claudeSearch.value.trim();
        renderClaudeList();
      });

      claudeRefresh.addEventListener("click", function () {
        fetchClaude();
      });

      claudeCreate.addEventListener("click", function () {
        showClaudeForm(null);
      });

      fetchProjects();
      fetchCliTools();
      fetchClaude();
    })();
  </script>
</body>
</html>`;

function encodeId(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeId(value: string): string {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function maskSensitive(key: string, value: string | undefined): string {
  if (!value) {
    return "-";
  }
  const lowered = key.toLowerCase();
  if (
    lowered.includes("token") ||
    lowered.includes("secret") ||
    lowered.includes("key")
  ) {
    if (value.length <= 8) {
      return "*".repeat(value.length);
    }
    return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(
      -4
    )}`;
  }
  return value;
}

function sendJson<T>(res: http.ServerResponse, status: number, body: T): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(payload);
}

function sendHtml(res: http.ServerResponse, body: string): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    if (typeof chunk === "string") {
      chunks.push(TEXT_ENCODER.encode(chunk));
    } else {
      chunks.push(chunk);
    }
  }
  if (!chunks.length) {
    return {};
  }
  const buffer = Buffer.concat(chunks);
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function ensureClaudeConfig(config: AcsConfig): ClaudeConfig {
  const claude = config.config?.claude ?? { current: undefined, configs: {} };
  if (!config.config) {
    config.config = { claude };
  } else if (!config.config.claude) {
    config.config.claude = claude;
  }
  if (!claude.configs) {
    claude.configs = {};
  }
  return claude;
}

function buildProjectView(project: Project): ProjectView {
  const id = encodeId(project.path);
  const displayPath = formatPathForDisplay(project.path);
  let exists = false;
  let isDirectory = false;
  let createdAt: string | undefined;
  let updatedAt: string | undefined;
  try {
    const stats = fs.statSync(project.path);
    exists = true;
    isDirectory = stats.isDirectory();
    createdAt = stats.birthtime.toISOString();
    updatedAt = stats.mtime.toISOString();
  } catch {
    exists = false;
  }
  return {
    ...project,
    id,
    displayPath,
    exists,
    isDirectory,
    createdAt,
    updatedAt,
  };
}

function buildProjectDetail(project: Project): ProjectDetailView {
  const view = buildProjectView(project);
  try {
    const stats = fs.statSync(project.path);
    view.sizeInBytes = stats.size;
  } catch {
    // ignore
  }
  return view;
}

function buildCliView(tool: CliTool): CliToolView {
  return {
    ...tool,
    id: encodeId(tool.name),
  };
}

function buildClaudeProfileView(
  claude: ClaudeConfig,
  [name, profile]: [string, ClaudeProfile]
): ClaudeProfileView {
  const env = profile.env ?? {};
  const maskedEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    maskedEnv[key] = maskSensitive(key, value);
  }
  return {
    id: encodeId(name),
    name,
    model: profile.model,
    env,
    maskedEnv,
    isCurrent: claude.current === name,
  };
}

function sanitizeEnv(input: Record<string, unknown> | undefined): Record<
  string,
  string
> {
  if (!input) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof key !== "string") {
      continue;
    }
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      continue;
    }
    if (typeof value !== "string") {
      continue;
    }
    result[trimmedKey] = value.trim();
  }
  return result;
}

function createRequestListener(logger?: Logger) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      if (!req.url) {
        sendJson(res, 400, {
          success: false,
          error: { message: "请求无效" },
        } satisfies JsonError);
        return;
      }

      const url = new URL(req.url, "http://localhost");
      if (req.method === "GET" && url.pathname === "/") {
        sendHtml(res, UI_HTML);
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/projects") {
        const config = readConfig();
        const keyword = url.searchParams.get("q")?.toLowerCase() ?? "";
        let items = config.projects.map(buildProjectView);
        if (keyword) {
          items = items.filter(
            (item) =>
              item.name.toLowerCase().includes(keyword) ||
              item.path.toLowerCase().includes(keyword)
          );
        }
        const response: JsonResponse<{ items: ProjectView[] }> = {
          success: true,
          data: { items },
        };
        sendJson(res, 200, response);
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/projects/")) {
        const id = url.pathname.slice("/api/projects/".length);
        const pathValue = decodeId(id);
        if (!pathValue) {
          sendJson(res, 400, {
            success: false,
            error: { message: "项目标识无效" },
          });
          return;
        }
        const config = readConfig();
        const project = config.projects.find(
          (item) => item.path === pathValue
        );
        if (!project) {
          sendJson(res, 404, {
            success: false,
            error: { message: "未找到项目" },
          });
          return;
        }
        const detail = buildProjectDetail(project);
        sendJson(res, 200, { success: true, data: detail });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/projects") {
        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const inputPath =
            typeof body.path === "string" ? body.path.trim() : "";
          if (!inputPath) {
            sendJson(res, 400, {
              success: false,
              error: { message: "项目路径不能为空" },
            });
            return;
          }
          const normalizedPath = normalizePath(inputPath);
          if (!fs.existsSync(normalizedPath)) {
            sendJson(res, 400, {
              success: false,
              error: { message: "目标路径不存在" },
            });
            return;
          }
          if (!fs.statSync(normalizedPath).isDirectory()) {
            sendJson(res, 400, {
              success: false,
              error: { message: "目标路径不是目录" },
            });
            return;
          }

          const providedName =
            typeof body.name === "string" ? body.name.trim() : "";
          const projectName =
            providedName || path.basename(normalizedPath) || "project";
          const allowDuplicate = body.allowDuplicate === true;

          const config = readConfig();
          const nameDup = config.projects.find(
            (item) => item.name === projectName
          );
          const pathDup = config.projects.find(
            (item) => item.path === normalizedPath
          );
          if ((nameDup || pathDup) && !allowDuplicate) {
            sendJson(res, 409, {
              success: false,
              error: {
                message: "已存在同名或同路径项目",
                code: "duplicate",
                details: {
                  duplicateName: !!nameDup,
                  duplicatePath: !!pathDup,
                },
              },
            });
            return;
          }

          const nextProjects = config.projects.filter(
            (item) =>
              item.name !== projectName && item.path !== normalizedPath
          );
          nextProjects.push({
            name: projectName,
            path: normalizedPath,
          });

          writeConfig({
            ...config,
            projects: nextProjects,
          });
          sendJson(res, 200, { success: true, data: { ok: true } });
        } catch (error) {
          if ((error as Error).message === "INVALID_JSON") {
            sendJson(res, 400, {
              success: false,
              error: { message: "请求体不是合法 JSON" },
            });
            return;
          }
          logger?.error(`保存项目失败: ${(error as Error).message}`);
          sendJson(res, 500, {
            success: false,
            error: { message: "保存项目失败" },
          });
        }
        return;
      }

      if (req.method === "DELETE" && url.pathname === "/api/projects") {
        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const ids = Array.isArray(body.ids) ? body.ids : [];
          const decoded = ids
            .map((item) => (typeof item === "string" ? decodeId(item) : ""))
            .filter(Boolean);
          if (!decoded.length) {
            sendJson(res, 400, {
              success: false,
              error: { message: "缺少有效的项目标识" },
            });
            return;
          }
          const config = readConfig();
          const nextProjects = config.projects.filter(
            (item) => !decoded.includes(item.path)
          );
          writeConfig({ ...config, projects: nextProjects });
          sendJson(res, 200, {
            success: true,
            data: { removed: decoded.length },
          });
        } catch (error) {
          if ((error as Error).message === "INVALID_JSON") {
            sendJson(res, 400, {
              success: false,
              error: { message: "请求体不是合法 JSON" },
            });
            return;
          }
          logger?.error(`删除项目失败: ${(error as Error).message}`);
          sendJson(res, 500, {
            success: false,
            error: { message: "删除项目失败" },
          });
        }
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/cli/tools") {
        const config = readConfig();
        const items = config.cli.map(buildCliView);
        sendJson(res, 200, { success: true, data: { items } });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/cli/tools") {
        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const name =
            typeof body.name === "string" ? body.name.trim() : "";
          const command =
            typeof body.command === "string" ? body.command.trim() : "";
          const allowDuplicate = body.allowDuplicate === true;
          if (!name || !command) {
            sendJson(res, 400, {
              success: false,
              error: { message: "名称和命令不能为空" },
            });
            return;
          }
          const config = readConfig();
          const sameName = config.cli.find((item) => item.name === name);
          const sameCommand = config.cli.find(
            (item) => item.command === command
          );
          if ((sameName || sameCommand) && !allowDuplicate) {
            sendJson(res, 409, {
              success: false,
              error: { message: "存在同名或同命令工具", code: "duplicate" },
            });
            return;
          }
          const nextCli = config.cli.filter(
            (item) => item.name !== name && item.command !== command
          );
          nextCli.push({ name, command });
          writeConfig({ ...config, cli: nextCli });
          sendJson(res, 200, { success: true, data: { ok: true } });
        } catch (error) {
          if ((error as Error).message === "INVALID_JSON") {
            sendJson(res, 400, {
              success: false,
              error: { message: "请求体不是合法 JSON" },
            });
            return;
          }
          logger?.error(`保存 CLI 工具失败: ${(error as Error).message}`);
          sendJson(res, 500, {
            success: false,
            error: { message: "保存工具失败" },
          });
        }
        return;
      }

      if (
        req.method === "PUT" &&
        url.pathname.startsWith("/api/cli/tools/")
      ) {
        try {
          const id = url.pathname.slice("/api/cli/tools/".length);
          const originalName = decodeId(id);
          if (!originalName) {
            sendJson(res, 400, {
              success: false,
              error: { message: "工具标识无效" },
            });
            return;
          }
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const name =
            typeof body.name === "string" ? body.name.trim() : "";
          const command =
            typeof body.command === "string" ? body.command.trim() : "";
          const allowDuplicate = body.allowDuplicate === true;
          if (!name || !command) {
            sendJson(res, 400, {
              success: false,
              error: { message: "名称和命令不能为空" },
            });
            return;
          }
          const config = readConfig();
          const exists = config.cli.find(
            (item) => item.name === originalName
          );
          if (!exists) {
            sendJson(res, 404, {
              success: false,
              error: { message: "未找到目标工具" },
            });
            return;
          }
          const conflict = config.cli.find(
            (item) =>
              (item.name === name || item.command === command) &&
              item.name !== originalName
          );
          if (conflict && !allowDuplicate) {
            sendJson(res, 409, {
              success: false,
              error: { message: "存在同名或同命令工具", code: "duplicate" },
            });
            return;
          }
          const nextCli = config.cli
            .filter((item) => item.name !== originalName)
            .filter(
              (item) => item.name !== name || item.command !== command
            );
          nextCli.push({ name, command });
          writeConfig({ ...config, cli: nextCli });
          sendJson(res, 200, { success: true, data: { ok: true } });
        } catch (error) {
          if ((error as Error).message === "INVALID_JSON") {
            sendJson(res, 400, {
              success: false,
              error: { message: "请求体不是合法 JSON" },
            });
            return;
          }
          logger?.error(`更新 CLI 工具失败: ${(error as Error).message}`);
          sendJson(res, 500, {
            success: false,
            error: { message: "更新工具失败" },
          });
        }
        return;
      }

      if (
        req.method === "DELETE" &&
        url.pathname === "/api/cli/tools"
      ) {
        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const ids = Array.isArray(body.ids) ? body.ids : [];
          const names = ids
            .map((item) => (typeof item === "string" ? decodeId(item) : ""))
            .filter(Boolean);
          if (!names.length) {
            sendJson(res, 400, {
              success: false,
              error: { message: "缺少有效工具标识" },
            });
            return;
          }
          const config = readConfig();
          const nextCli = config.cli.filter(
            (item) => !names.includes(item.name)
          );
          writeConfig({ ...config, cli: nextCli });
          sendJson(res, 200, {
            success: true,
            data: { removed: names.length },
          });
        } catch (error) {
          if ((error as Error).message === "INVALID_JSON") {
            sendJson(res, 400, {
              success: false,
              error: { message: "请求体不是合法 JSON" },
            });
            return;
          }
          logger?.error(`删除 CLI 工具失败: ${(error as Error).message}`);
          sendJson(res, 500, {
            success: false,
            error: { message: "删除工具失败" },
          });
        }
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/claude") {
        const config = readConfig();
        const claude = ensureClaudeConfig(config);
        const profiles = Object.entries(claude.configs ?? {});
        const items = profiles
          .map((entry) => buildClaudeProfileView(claude, entry))
          .sort((a, b) => a.name.localeCompare(b.name));
        const current =
          claude.current && claude.configs[claude.current]
            ? buildClaudeProfileView(claude, [
                claude.current,
                claude.configs[claude.current],
              ])
            : null;
        sendJson(res, 200, {
          success: true,
          data: {
            current,
            configs: items,
          },
        });
        return;
      }

      if (
        req.method === "GET" &&
        url.pathname.startsWith("/api/claude/profile/")
      ) {
        const id = url.pathname.slice("/api/claude/profile/".length);
        const name = decodeId(id);
        if (!name) {
          sendJson(res, 400, {
            success: false,
            error: { message: "配置标识无效" },
          });
          return;
        }
        const config = readConfig();
        const claude = ensureClaudeConfig(config);
        const profile = claude.configs[name];
        if (!profile) {
          sendJson(res, 404, {
            success: false,
            error: { message: "未找到配置" },
          });
          return;
        }
        sendJson(res, 200, {
          success: true,
          data: {
            id,
            name,
            model: profile.model,
            env: profile.env ?? {},
          },
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/claude/profile") {
        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const name =
            typeof body.name === "string" ? body.name.trim() : "";
          if (!name) {
            sendJson(res, 400, {
              success: false,
              error: { message: "配置名称不能为空" },
            });
            return;
          }
          const model =
            typeof body.model === "string" ? body.model.trim() : undefined;
          const env = sanitizeEnv(
            body.env && typeof body.env === "object"
              ? (body.env as Record<string, unknown>)
              : {}
          );
          const setCurrent = body.setCurrent === true;
          const originalId =
            typeof body.originalId === "string" ? body.originalId : undefined;
          const originalName = originalId ? decodeId(originalId) : undefined;

          const config = readConfig();
          const claude = ensureClaudeConfig(config);
          const nextConfigs: Record<string, ClaudeProfile> = {
            ...claude.configs,
          };
          if (originalName && originalName !== name) {
            delete nextConfigs[originalName];
          }
          nextConfigs[name] = {
            ...claude.configs[name],
            env: Object.keys(env).length ? env : undefined,
            model: model || undefined,
          };

          const next: AcsConfig = {
            ...config,
            config: {
              ...config.config,
              claude: {
                current: claude.current,
                configs: nextConfigs,
              },
            },
          };
          if (!next.config.claude.current || setCurrent) {
            next.config.claude.current = name;
            const profile = next.config.claude.configs[name];
            applyClaudeProfileToSettings(profile);
          }
          writeConfig(next);
          sendJson(res, 200, { success: true, data: { ok: true } });
        } catch (error) {
          if ((error as Error).message === "INVALID_JSON") {
            sendJson(res, 400, {
              success: false,
              error: { message: "请求体不是合法 JSON" },
            });
            return;
          }
          logger?.error(`保存 Claude 配置失败: ${(error as Error).message}`);
          sendJson(res, 500, {
            success: false,
            error: { message: "保存配置失败" },
          });
        }
        return;
      }

      if (req.method === "DELETE" && url.pathname.startsWith("/api/claude/profile/")) {
        const id = url.pathname.slice("/api/claude/profile/".length);
        const name = decodeId(id);
        if (!name) {
          sendJson(res, 400, {
            success: false,
            error: { message: "配置标识无效" },
          });
          return;
        }
        const config = readConfig();
        const claude = ensureClaudeConfig(config);
        if (!claude.configs[name]) {
          sendJson(res, 404, {
            success: false,
            error: { message: "未找到配置" },
          });
          return;
        }
        const nextConfigs = { ...claude.configs };
        delete nextConfigs[name];
        let nextCurrent = claude.current;
        if (nextCurrent === name) {
          nextCurrent = Object.keys(nextConfigs)[0];
          if (nextCurrent) {
            applyClaudeProfileToSettings(nextConfigs[nextCurrent]);
          }
        }
        writeConfig({
          ...config,
          config: {
            ...config.config,
            claude: {
              current: nextCurrent,
              configs: nextConfigs,
            },
          },
        });
        sendJson(res, 200, { success: true, data: { ok: true } });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/claude/current") {
        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const id =
            typeof body.id === "string" ? body.id : undefined;
          const name = id ? decodeId(id) : undefined;
          if (!name) {
            sendJson(res, 400, {
              success: false,
              error: { message: "缺少配置名称" },
            });
            return;
          }
          const config = readConfig();
          const claude = ensureClaudeConfig(config);
          const profile = claude.configs[name];
          if (!profile) {
            sendJson(res, 404, {
              success: false,
              error: { message: "未找到配置" },
            });
            return;
          }
          applyClaudeProfileToSettings(profile);
          const next = {
            ...config,
            config: {
              ...config.config,
              claude: {
                current: name,
                configs: { ...claude.configs },
              },
            },
          };
          writeConfig(next);
          sendJson(res, 200, {
            success: true,
            data: { ok: true, settings: true },
          });
        } catch (error) {
          if ((error as Error).message === "INVALID_JSON") {
            sendJson(res, 400, {
              success: false,
              error: { message: "请求体不是合法 JSON" },
            });
            return;
          }
          logger?.error(`切换 Claude 配置失败: ${(error as Error).message}`);
          sendJson(res, 500, {
            success: false,
            error: { message: "切换配置失败" },
          });
        }
        return;
      }

      sendJson(res, 404, {
        success: false,
        error: { message: "接口未定义" },
      });
    } catch (error) {
      logger?.error(`UI 服务异常: ${(error as Error).message}`);
      sendJson(res, 500, {
        success: false,
        error: { message: "内部错误" },
      });
    }
  };
}

function listenAsync(
  server: http.Server,
  port: number,
  host?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleError = (error: unknown) => {
      server.off("error", handleError);
      reject(error);
    };
    server.once("error", handleError);
    if (host) {
      server.listen(port, host, () => {
        server.off("error", handleError);
        resolve();
      });
    } else {
      server.listen(port, () => {
        server.off("error", handleError);
        resolve();
      });
    }
  });
}

function isPermissionError(error: unknown): boolean {
  const err = error as NodeJS.ErrnoException;
  return err?.code === "EACCES" || err?.code === "EPERM";
}

export async function startUiServer(
  options: StartUiServerOptions = {}
): Promise<{
  server: http.Server;
  url: string;
  port: number;
}> {
  const initialHost = options.host ?? DEFAULT_UI_HOST;
  const port = options.port ?? DEFAULT_UI_PORT;
  const listener = createRequestListener(options.logger);
  let host = initialHost;
  let server = http.createServer(listener);

  try {
    await listenAsync(server, port, host);
  } catch (error) {
    if (!options.host && isPermissionError(error)) {
      server.close();
      server = http.createServer(listener);
      host = "0.0.0.0";
      await listenAsync(server, port, host);
    } else {
      throw error;
    }
  }

  const address = server.address();
  const actualPort =
    typeof address === "object" && address ? address.port : port;
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return {
    server,
    url: `http://${displayHost}:${actualPort}`,
    port: actualPort,
  };
}
