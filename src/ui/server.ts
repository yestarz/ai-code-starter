/**
 * Web UI 服务器实现
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Logger } from "../utils/logger";
import { handleApiRequest } from "./routes";

export const DEFAULT_UI_PORT = 8888;
const DEFAULT_HOST = "127.0.0.1";

interface ServerOptions {
  port: number;
  host?: string;
  logger: Logger;
}

interface ServerInfo {
  url: string;
  server: http.Server;
}

/**
 * 获取静态文件的 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * 解析静态资源目录，兼容开发模式与打包产物
 */
function resolvePublicDirectory(baseDir: string): string {
  const candidates = [
    path.join(baseDir, "public"),
    path.join(baseDir, "ui", "public"),
    path.resolve(process.cwd(), "dist", "ui", "public"),
    path.resolve(process.cwd(), "src", "ui", "public"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

/**
 * 提供静态文件服务
 */
async function serveStaticFile(
  res: http.ServerResponse,
  filePath: string
): Promise<void> {
  const fs = await import("node:fs/promises");
  try {
    const content = await fs.readFile(filePath);
    const mimeType = getMimeType(filePath);
    res.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Length": content.length,
    });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}

/**
 * 请求处理器
 */
async function requestHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  logger: Logger
): Promise<void> {
  const url = req.url || "/";
  logger.debug(`收到请求: ${req.method} ${url}`);

  // 设置 CORS 头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理预检请求
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // API 路由
  if (url.startsWith("/api/")) {
    await handleApiRequest(req, res, logger);
    return;
  }

  // 静态文件服务
  // 在打包后的 CommonJS 环境中，使用相对于当前模块的路径
  const dirname =
    typeof __dirname !== "undefined"
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
  const publicDir = resolvePublicDirectory(dirname);

  let filePath: string;
  if (url === "/" || url === "/index.html") {
    filePath = path.join(publicDir, "index.html");
  } else {
    // 防止路径遍历攻击
    const safePath = path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, "");
    filePath = path.join(publicDir, safePath);
  }

  // 确保请求的文件在 public 目录内
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return;
  }

  await serveStaticFile(res, filePath);
}

/**
 * 启动 UI 服务器
 */
export async function startUiServer(
  options: ServerOptions
): Promise<ServerInfo> {
  const { port, host = DEFAULT_HOST, logger } = options;

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      requestHandler(req, res, logger).catch((error) => {
        logger.error(`请求处理错误: ${error.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("500 Internal Server Error");
        }
      });
    });

    server.on("error", (error) => {
      reject(error);
    });

    server.listen(port, host, () => {
      const url = `http://${host}:${port}`;
      resolve({ url, server });
    });
  });
}

