import os from "node:os";
import path from "node:path";
import { bold, cyan, gray, green } from "colorette";
import { readConfig, writeConfig } from "../config";
import {
  CliArguments,
  CommandContext,
  CommandResult,
  ClaudeProfile,
} from "../types";
import { readJsonFileSync, writeJsonFileSync } from "../utils/fs";

const CLAUDE_PROVIDER = "claude";
const CLAUDE_SETTINGS_DIR = ".claude";
const CLAUDE_SETTINGS_FILE = "settings.json";

interface ClaudeSettingsFile {
  env?: Record<string, string>;
  model?: string;
  [key: string]: unknown;
}

function resolveClaudeSettingsPath(): string {
  return path.join(
    os.homedir(),
    CLAUDE_SETTINGS_DIR,
    CLAUDE_SETTINGS_FILE
  );
}

function maskToken(input?: string): string {
  if (!input) {
    return "-";
  }
  if (input.length <= 4) {
    return "*".repeat(input.length);
  }
  const head = input.slice(0, 4);
  const tail = input.slice(-4);
  const middleLength = Math.max(input.length - 8, 0);
  return `${head}${"*".repeat(middleLength)}${tail}`;
}

function printProfileInfo(
  name: string,
  profile: ClaudeProfile,
  isCurrent: boolean
): void {
  const headerPrefix = isCurrent ? cyan("★") : gray("•");
  console.log(`${headerPrefix} ${bold(name)}`);
  const baseUrl = profile.env?.ANTHROPIC_BASE_URL ?? "-";
  const token = maskToken(profile.env?.ANTHROPIC_AUTH_TOKEN);
  const model = profile.model ?? "-";
  console.log(`  ANTHROPIC_BASE_URL: ${baseUrl}`);
  console.log(`  ANTHROPIC_AUTH_TOKEN: ${token}`);
  console.log(`  model: ${model}`);
}

function ensureClaudeConfig(context: CommandContext) {
  const config = readConfig();
  const claudeConfig = config.config?.claude;
  if (!claudeConfig) {
    context.logger.error(context.t("config.claude.notConfigured"));
    return null;
  }
  return { config, claudeConfig };
}

async function handleClaudeCurrent(
  context: CommandContext
): Promise<CommandResult> {
  const result = ensureClaudeConfig(context);
  if (!result) {
    return { code: 1 };
  }

  const { claudeConfig } = result;
  if (!claudeConfig.current) {
    context.logger.warn(context.t("config.claude.currentUnset"));
    return { code: 0 };
  }

  const currentProfile = claudeConfig.configs[claudeConfig.current];
  if (!currentProfile) {
    context.logger.error(
      context.t("config.claude.currentMissing", { name: claudeConfig.current })
    );
    return { code: 1 };
  }

  console.log(
    bold(
      cyan(
        context.t("config.claude.currentTitle", { name: claudeConfig.current })
      )
    )
  );
  printProfileInfo(claudeConfig.current, currentProfile, true);
  return { code: 0 };
}

async function handleClaudeList(
  context: CommandContext
): Promise<CommandResult> {
  const result = ensureClaudeConfig(context);
  if (!result) {
    return { code: 1 };
  }

  const { claudeConfig } = result;
  const entries = Object.entries(claudeConfig.configs);
  if (!entries.length) {
    context.logger.warn(context.t("config.claude.noProfiles"));
    return { code: 0 };
  }

  console.log(
    bold(
      cyan(
        context.t("config.claude.listHeader", { count: entries.length })
      )
    )
  );
  entries.forEach(([name, profile]) => {
    const isCurrent = claudeConfig.current === name;
    printProfileInfo(name, profile, isCurrent);
  });
  return { code: 0 };
}

function applyProfileToSettings(
  profile: ClaudeProfile,
  context: CommandContext
): string {
  const settingsPath = resolveClaudeSettingsPath();
  const currentSettings =
    readJsonFileSync<ClaudeSettingsFile>(settingsPath) ?? {};
  const nextSettings: ClaudeSettingsFile = { ...currentSettings };

  if (profile.env) {
    nextSettings.env = profile.env;
  }

  if (profile.model) {
    nextSettings.model = profile.model;
  }

  writeJsonFileSync(settingsPath, nextSettings);
  if (context.verbose) {
    context.logger.debug(
      context.t("config.claude.use.settingsPath", { path: settingsPath })
    );
  }
  return settingsPath;
}

async function handleClaudeUse(
  profileName: string | undefined,
  context: CommandContext
): Promise<CommandResult> {
  if (!profileName) {
    context.logger.error(context.t("config.claude.use.missingName"));
    return { code: 1 };
  }

  const result = ensureClaudeConfig(context);
  if (!result) {
    return { code: 1 };
  }

  const { config, claudeConfig } = result;
  const profile = claudeConfig.configs[profileName];
  if (!profile) {
    context.logger.error(
      context.t("config.claude.profileNotFound", { name: profileName })
    );
    return { code: 1 };
  }

  applyProfileToSettings(profile, context);

  const nextConfig = {
    ...config,
    config: {
      ...config.config,
      [CLAUDE_PROVIDER]: {
        ...claudeConfig,
        current: profileName,
      },
    },
  };

  writeConfig(nextConfig);

  context.logger.info(
    green(context.t("config.claude.use.updated", { name: profileName }))
  );
  return { code: 0 };
}

export async function runConfig(
  args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const { positional } = args;
  const [provider, action, ...rest] = positional;

  if (!provider) {
    context.logger.error(context.t("config.missingProvider"));
    return { code: 1 };
  }

  if (provider !== CLAUDE_PROVIDER) {
    context.logger.error(
      context.t("config.unknownProvider", { name: provider })
    );
    return { code: 1 };
  }

  if (!action) {
    context.logger.error(context.t("config.claude.missingAction"));
    return { code: 1 };
  }

  switch (action) {
    case "current":
      return handleClaudeCurrent(context);
    case "list":
    case "ls":
      return handleClaudeList(context);
    case "use":
      return handleClaudeUse(rest[0], context);
    default:
      context.logger.error(
        context.t("config.claude.unknownAction", { name: action })
      );
      return { code: 1 };
  }
}
