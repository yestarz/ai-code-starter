import { spawn } from "node:child_process";
import type { CliArguments, CommandContext, CommandResult } from "../types";
import { DEFAULT_UI_PORT, startUiServer } from "../ui/server";

function parseBooleanFlag(value: unknown, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
  }
  return fallback;
}

function parsePortFlag(value: unknown): number | null {
  if (value === undefined || value === true) {
    return DEFAULT_UI_PORT;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 && value <= 65535
      ? value
      : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return DEFAULT_UI_PORT;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }
    if (parsed < 0 || parsed > 65535) {
      return null;
    }
    return parsed;
  }
  return null;
}

function parseHostFlag(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

function openBrowser(url: string, context: CommandContext): void {
  try {
    const platform = process.platform;
    let command: string;
    let args: string[];

    if (platform === "darwin") {
      command = "open";
      args = [url];
    } else if (platform === "win32") {
      command = "cmd";
      args = ["/c", "start", "", url];
    } else {
      command = "xdg-open";
      args = [url];
    }

    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    child.on("error", (error) => {
      context.logger.warn(
        context.t("ui.server.openFailed", {
          message: error.message,
          url,
        })
      );
    });
  } catch (error) {
    context.logger.warn(
      context.t("ui.server.openFailed", {
        message: (error as Error).message,
        url,
      })
    );
  }
}

export async function runUi(
  args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const portFlag = args.flags.port ?? args.flags.p;
  const port = parsePortFlag(portFlag);
  if (port === null) {
    context.logger.error(
      context.t("ui.server.invalidPort", {
        port: String(portFlag ?? ""),
      })
    );
    return { code: 1 };
  }

  const host = parseHostFlag(args.flags.host);
  const shouldOpen = parseBooleanFlag(args.flags.open, true);

  try {
    const { url } = await startUiServer({
      port,
      host,
      logger: context.logger,
    });

    context.logger.info(
      context.t("ui.server.running", {
        url,
      })
    );

    if (shouldOpen) {
      context.logger.info(context.t("ui.server.opening", { url }));
      openBrowser(url, context);
    }

    return {
      code: 0,
      message: context.t("ui.server.readyHint", { url }),
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EADDRINUSE") {
      context.logger.error(
        context.t("ui.server.portInUse", {
          port: String(port),
        })
      );
      return { code: 1 };
    }
    context.logger.error(
      context.t("ui.server.failed", {
        message: err.message,
      })
    );
    return { code: 1 };
  }
}
