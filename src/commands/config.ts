import { bold, cyan, gray, green } from "colorette";
import { readConfig, writeConfig } from "../config";
import {
  CliArguments,
  CommandContext,
  CommandResult,
  ClaudeProfile,
} from "../types";
import { applyClaudeProfileToSettings } from "../utils/claude";

const CLAUDE_PROVIDER = "claude";
function maskToken(input?: string): string {
  if (!input) {
    return "-";
  }
  if (input.length <= 4) {
    return "*".repeat(input.length);
  }
  const head = input.slice(0, 2);
  const tail = input.slice(-2);
  return `${head}****${tail}`;
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

  const settingsPath = applyClaudeProfileToSettings(profile);
  if (context.verbose) {
    context.logger.debug(
      context.t("config.claude.use.settingsPath", { path: settingsPath })
    );
  }

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
