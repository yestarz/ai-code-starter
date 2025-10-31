/**
 * API 路由处理
 */
import fs from "node:fs";
import http from "node:http";
import type { Logger } from "../utils/logger";
import { readConfig, writeConfig } from "../config";
import type { AcsConfig, Project, CliTool, ClaudeProfile } from "../types";
import { normalizePath } from "../utils/path";
import { applyClaudeProfileToSettings } from "../utils/claude";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 发送 JSON 响应
 */
function sendJson<T>(
  res: http.ServerResponse,
  statusCode: number,
  body: ApiResponse<T>
): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

/**
 * 读取请求体
 */
async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * 解析请求体为 JSON
 */
async function parseJsonBody<T>(req: http.IncomingMessage): Promise<T | null> {
  try {
    const body = await readRequestBody(req);
    if (!body.trim()) {
      return null;
    }
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/**
 * 处理项目相关 API
 */
async function handleProjectsApi(
  method: string,
  url: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  logger: Logger
): Promise<void> {
  try {
    const config = readConfig();

    // GET /api/projects - 获取项目列表
    if (method === "GET" && url === "/api/projects") {
      sendJson(res, 200, {
        success: true,
        data: config.projects,
      });
      return;
    }

    // POST /api/projects - 添加项目
    if (method === "POST" && url === "/api/projects") {
      const body = await parseJsonBody<{ name: string; path: string }>(req);
      if (!body || !body.name || !body.path) {
        sendJson(res, 400, {
          success: false,
          error: "缺少必要的参数: name 和 path",
        });
        return;
      }

      const trimmedName = body.name.trim();
      const normalizedPath = normalizePath(body.path);

      if (!trimmedName || !normalizedPath) {
        sendJson(res, 400, {
          success: false,
          error: "项目名称或路径不能为空",
        });
        return;
      }

      try {
        if (!fs.existsSync(normalizedPath)) {
          sendJson(res, 400, {
            success: false,
            error: "项目路径不存在",
          });
          return;
        }
        if (!fs.statSync(normalizedPath).isDirectory()) {
          sendJson(res, 400, {
            success: false,
            error: "项目路径不是目录",
          });
          return;
        }
      } catch (error) {
        logger.error(`验证项目路径失败: ${(error as Error).message}`);
        sendJson(res, 400, {
          success: false,
          error: "无法验证项目路径",
        });
        return;
      }

      // 检查重复
      const duplicate = config.projects.find(
        (p) => p.name === trimmedName || p.path === normalizedPath
      );
      if (duplicate) {
        sendJson(res, 409, {
          success: false,
          error: "项目名称或路径已存在",
        });
        return;
      }

      const newProject: Project = {
        name: trimmedName,
        path: normalizedPath,
      };

      writeConfig({
        ...config,
        projects: [...config.projects, newProject],
      });

      logger.info(`添加项目: ${trimmedName}`);
      sendJson(res, 201, {
        success: true,
        data: newProject,
      });
      return;
    }

    // PUT /api/projects/:name - 编辑项目
    const updateMatch = url.match(/^\/api\/projects\/(.+)$/);
    if (method === "PUT" && updateMatch) {
      const originalName = decodeURIComponent(updateMatch[1]);
      const body = await parseJsonBody<{ name: string; path: string }>(req);
      if (!body || !body.name || !body.path) {
        sendJson(res, 400, {
          success: false,
          error: "缺少必要的参数: name 和 path",
        });
        return;
      }

      const trimmedName = body.name.trim();
      const normalizedPath = normalizePath(body.path);

      if (!trimmedName || !normalizedPath) {
        sendJson(res, 400, {
          success: false,
          error: "项目名称或路径不能为空",
        });
        return;
      }

      try {
        if (!fs.existsSync(normalizedPath)) {
          sendJson(res, 400, {
            success: false,
            error: "项目路径不存在",
          });
          return;
        }
        if (!fs.statSync(normalizedPath).isDirectory()) {
          sendJson(res, 400, {
            success: false,
            error: "项目路径不是目录",
          });
          return;
        }
      } catch (error) {
        logger.error(`验证项目路径失败: ${(error as Error).message}`);
        sendJson(res, 400, {
          success: false,
          error: "无法验证项目路径",
        });
        return;
      }

      const index = config.projects.findIndex(
        (project) => project.name === originalName
      );

      if (index === -1) {
        sendJson(res, 404, {
          success: false,
          error: "项目不存在",
        });
        return;
      }

      const conflict = config.projects.find(
        (project, projectIndex) =>
          projectIndex !== index &&
          (project.name === trimmedName || project.path === normalizedPath)
      );

      if (conflict) {
        sendJson(res, 409, {
          success: false,
          error: "项目名称或路径已存在",
        });
        return;
      }

      const updatedProject: Project = {
        name: trimmedName,
        path: normalizedPath,
      };

      const nextProjects = [...config.projects];
      nextProjects[index] = updatedProject;

      writeConfig({
        ...config,
        projects: nextProjects,
      });

      logger.info(
        `更新项目: ${originalName} -> ${updatedProject.name} (${updatedProject.path})`
      );

      sendJson(res, 200, {
        success: true,
        data: updatedProject,
      });
      return;
    }

    // DELETE /api/projects/:name - 删除项目
    const deleteMatch = url.match(/^\/api\/projects\/(.+)$/);
    if (method === "DELETE" && deleteMatch) {
      const projectName = decodeURIComponent(deleteMatch[1]);
      const remaining = config.projects.filter((p) => p.name !== projectName);

      if (remaining.length === config.projects.length) {
        sendJson(res, 404, {
          success: false,
          error: "项目不存在",
        });
        return;
      }

      writeConfig({
        ...config,
        projects: remaining,
      });

      logger.info(`删除项目: ${projectName}`);
      sendJson(res, 200, {
        success: true,
        data: { name: projectName },
      });
      return;
    }

    // 未匹配的路由
    sendJson(res, 404, {
      success: false,
      error: "未找到 API 端点",
    });
  } catch (error) {
    logger.error(`处理项目 API 错误: ${(error as Error).message}`);
    sendJson(res, 500, {
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * 处理 CLI 工具相关 API
 */
async function handleCliApi(
  method: string,
  url: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  logger: Logger
): Promise<void> {
  try {
    const config = readConfig();

    // GET /api/cli - 获取 CLI 工具列表
    if (method === "GET" && url === "/api/cli") {
      sendJson(res, 200, {
        success: true,
        data: config.cli,
      });
      return;
    }

    // POST /api/cli - 添加 CLI 工具
    if (method === "POST" && url === "/api/cli") {
      const body = await parseJsonBody<{ name: string; command: string; order?: number }>(req);
      if (!body || !body.name || !body.command) {
        sendJson(res, 400, {
          success: false,
          error: "缺少必要的参数: name 和 command",
        });
        return;
      }

      const duplicate = config.cli.find(
        (c) => c.name === body.name || c.command === body.command
      );
      if (duplicate) {
        sendJson(res, 409, {
          success: false,
          error: "工具名称或命令已存在",
        });
        return;
      }

      const newTool: CliTool = {
        name: body.name,
        command: body.command,
      };

      if (body.order !== undefined && body.order !== null && body.order !== "") {
        const orderNum = parseInt(String(body.order), 10);
        if (!isNaN(orderNum)) {
          newTool.order = orderNum;
        }
      }

      writeConfig({
        ...config,
        cli: [...config.cli, newTool],
      });

      logger.info(`添加 CLI 工具: ${body.name}`);
      sendJson(res, 201, {
        success: true,
        data: newTool,
      });
      return;
    }

    // PUT /api/cli/:name - 编辑 CLI 工具
    const editMatch = url.match(/^\/api\/cli\/(.+)$/);
    if (method === "PUT" && editMatch) {
      const oldName = decodeURIComponent(editMatch[1]);
      const body = await parseJsonBody<{ name: string; command: string; order?: number }>(req);

      if (!body || !body.name || !body.command) {
        sendJson(res, 400, {
          success: false,
          error: "缺少必要的参数: name 和 command",
        });
        return;
      }

      const index = config.cli.findIndex((c) => c.name === oldName);
      if (index === -1) {
        sendJson(res, 404, {
          success: false,
          error: "工具不存在",
        });
        return;
      }

      // 检查是否与其他工具冲突
      const duplicate = config.cli.find(
        (c, i) =>
          i !== index && (c.name === body.name || c.command === body.command)
      );
      if (duplicate) {
        sendJson(res, 409, {
          success: false,
          error: "工具名称或命令已存在",
        });
        return;
      }

      const updated = [...config.cli];
      const updatedTool: CliTool = {
        name: body.name,
        command: body.command,
      };

      if (body.order !== undefined && body.order !== null && body.order !== "") {
        const orderNum = parseInt(String(body.order), 10);
        if (!isNaN(orderNum)) {
          updatedTool.order = orderNum;
        }
      }

      updated[index] = updatedTool;

      writeConfig({
        ...config,
        cli: updated,
      });

      logger.info(`编辑 CLI 工具: ${oldName} -> ${body.name}`);
      sendJson(res, 200, {
        success: true,
        data: updated[index],
      });
      return;
    }

    // DELETE /api/cli/:name - 删除 CLI 工具
    const deleteMatch = url.match(/^\/api\/cli\/(.+)$/);
    if (method === "DELETE" && deleteMatch) {
      const toolName = decodeURIComponent(deleteMatch[1]);
      const remaining = config.cli.filter((c) => c.name !== toolName);

      if (remaining.length === config.cli.length) {
        sendJson(res, 404, {
          success: false,
          error: "工具不存在",
        });
        return;
      }

      writeConfig({
        ...config,
        cli: remaining,
      });

      logger.info(`删除 CLI 工具: ${toolName}`);
      sendJson(res, 200, {
        success: true,
        data: { name: toolName },
      });
      return;
    }

    sendJson(res, 404, {
      success: false,
      error: "未找到 API 端点",
    });
  } catch (error) {
    logger.error(`处理 CLI API 错误: ${(error as Error).message}`);
    sendJson(res, 500, {
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * 处理 Claude 配置相关 API
 */
async function handleClaudeConfigApi(
  method: string,
  url: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  logger: Logger
): Promise<void> {
  try {
    const config = readConfig();
    const claudeConfig = config.config?.claude;

    if (!claudeConfig) {
      sendJson(res, 404, {
        success: false,
        error: "Claude 配置不存在",
      });
      return;
    }

    // GET /api/config/claude/current - 获取当前配置
    if (method === "GET" && url === "/api/config/claude/current") {
      if (!claudeConfig.current) {
        sendJson(res, 200, {
          success: true,
          data: null,
        });
        return;
      }

      const currentProfile = claudeConfig.configs[claudeConfig.current];
      if (!currentProfile) {
        sendJson(res, 404, {
          success: false,
          error: "当前配置不存在",
        });
        return;
      }

      const env = { ...(currentProfile.env ?? {}) };
      env.ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL ?? "-";
      env.ANTHROPIC_AUTH_TOKEN =
        env.ANTHROPIC_AUTH_TOKEN ?? "-";

      const currentProfileData = {
        name: claudeConfig.current,
        env,
        model: currentProfile.model ?? "-",
      };

      sendJson(res, 200, {
        success: true,
        data: currentProfileData,
      });
      return;
    }

    // GET /api/config/claude/list - 获取所有配置
    if (method === "GET" && url === "/api/config/claude/list") {
      const profiles = Object.entries(claudeConfig.configs).map(
        ([name, profile]) => {
          const env = { ...(profile.env ?? {}) };
          env.ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL ?? "-";
          env.ANTHROPIC_AUTH_TOKEN =
            env.ANTHROPIC_AUTH_TOKEN ?? "-";

          return {
            name,
            isCurrent: claudeConfig.current === name,
            env,
            model: profile.model ?? "-",
          };
        }
      );

      sendJson(res, 200, {
        success: true,
        data: profiles,
      });
      return;
    }

    // POST /api/config/claude/use - 切换配置
    if (method === "POST" && url === "/api/config/claude/use") {
      const body = await parseJsonBody<{ profile: string }>(req);
      if (!body || !body.profile) {
        sendJson(res, 400, {
          success: false,
          error: "缺少必要的参数: profile",
        });
        return;
      }

      const profile = claudeConfig.configs[body.profile];
      if (!profile) {
        sendJson(res, 404, {
          success: false,
          error: "配置不存在",
        });
        return;
      }

      // 应用到 Claude settings
      applyClaudeProfileToSettings(profile);

      // 更新当前配置
      const nextConfig: AcsConfig = {
        ...config,
        config: {
          ...config.config,
          claude: {
            ...claudeConfig,
            current: body.profile,
          },
        },
      };

      writeConfig(nextConfig);

      logger.info(`切换 Claude 配置: ${body.profile}`);
      sendJson(res, 200, {
        success: true,
        data: { profile: body.profile },
      });
      return;
    }

    // POST /api/config/claude/add - 添加配置
    if (method === "POST" && url === "/api/config/claude/add") {
      const body = await parseJsonBody<{
        name: string;
        profile: ClaudeProfile;
      }>(req);
      
      if (!body || !body.name || !body.profile) {
        sendJson(res, 400, {
          success: false,
          error: "缺少必要的参数: name 和 profile",
        });
        return;
      }

      if (claudeConfig.configs[body.name]) {
        sendJson(res, 409, {
          success: false,
          error: "配置名称已存在",
        });
        return;
      }

      const nextConfig: AcsConfig = {
        ...config,
        config: {
          ...config.config,
          claude: {
            ...claudeConfig,
            configs: {
              ...claudeConfig.configs,
              [body.name]: body.profile,
            },
          },
        },
      };

      writeConfig(nextConfig);

      logger.info(`添加 Claude 配置: ${body.name}`);
      sendJson(res, 201, {
        success: true,
        data: { name: body.name },
      });
      return;
    }

    // PUT /api/config/claude/:name - 编辑配置
    const editMatch = url.match(/^\/api\/config\/claude\/(.+)$/);
    if (method === "PUT" && editMatch) {
      const profileName = decodeURIComponent(editMatch[1]);
      const body = await parseJsonBody<{ profile: ClaudeProfile }>(req);
      
      if (!body || !body.profile) {
        sendJson(res, 400, {
          success: false,
          error: "缺少必要的参数: profile",
        });
        return;
      }

      if (!claudeConfig.configs[profileName]) {
        sendJson(res, 404, {
          success: false,
          error: "配置不存在",
        });
        return;
      }

      const nextConfig: AcsConfig = {
        ...config,
        config: {
          ...config.config,
          claude: {
            ...claudeConfig,
            configs: {
              ...claudeConfig.configs,
              [profileName]: body.profile,
            },
          },
        },
      };

      writeConfig(nextConfig);

      logger.info(`编辑 Claude 配置: ${profileName}`);
      sendJson(res, 200, {
        success: true,
        data: { name: profileName },
      });
      return;
    }

    // DELETE /api/config/claude/:name - 删除配置
    const deleteMatch = url.match(/^\/api\/config\/claude\/(.+)$/);
    if (method === "DELETE" && deleteMatch) {
      const profileName = decodeURIComponent(deleteMatch[1]);

      if (!claudeConfig.configs[profileName]) {
        sendJson(res, 404, {
          success: false,
          error: "配置不存在",
        });
        return;
      }

      const { [profileName]: _, ...remainingConfigs } = claudeConfig.configs;

      const nextConfig: AcsConfig = {
        ...config,
        config: {
          ...config.config,
          claude: {
            current:
              claudeConfig.current === profileName
                ? undefined
                : claudeConfig.current,
            configs: remainingConfigs,
          },
        },
      };

      writeConfig(nextConfig);

      logger.info(`删除 Claude 配置: ${profileName}`);
      sendJson(res, 200, {
        success: true,
        data: { name: profileName },
      });
      return;
    }

    sendJson(res, 404, {
      success: false,
      error: "未找到 API 端点",
    });
  } catch (error) {
    logger.error(`处理 Claude 配置 API 错误: ${(error as Error).message}`);
    sendJson(res, 500, {
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * API 路由处理主入口
 */
export async function handleApiRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  logger: Logger
): Promise<void> {
  const method = req.method || "GET";
  const url = req.url || "/";

  logger.debug(`API 请求: ${method} ${url}`);

  // 项目管理 API
  if (url.startsWith("/api/projects")) {
    await handleProjectsApi(method, url, req, res, logger);
    return;
  }

  // CLI 工具管理 API
  if (url.startsWith("/api/cli")) {
    await handleCliApi(method, url, req, res, logger);
    return;
  }

  // Claude 配置管理 API
  if (url.startsWith("/api/config/claude")) {
    await handleClaudeConfigApi(method, url, req, res, logger);
    return;
  }

  // 未匹配的 API
  sendJson(res, 404, {
    success: false,
    error: "未找到 API 端点",
  });
}





