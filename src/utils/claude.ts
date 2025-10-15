import os from "node:os";
import path from "node:path";
import { ClaudeProfile } from "../types";
import { readJsonFileSync, writeJsonFileSync } from "./fs";

const CLAUDE_SETTINGS_DIR = ".claude";
const CLAUDE_SETTINGS_FILE = "settings.json";

export function resolveClaudeSettingsPath(): string {
  return path.join(os.homedir(), CLAUDE_SETTINGS_DIR, CLAUDE_SETTINGS_FILE);
}

export function applyClaudeProfileToSettings(profile: ClaudeProfile): string {
  const settingsPath = resolveClaudeSettingsPath();
  const currentSettings =
    readJsonFileSync<Record<string, unknown>>(settingsPath) ?? {};
  const nextSettings: Record<string, unknown> = { ...currentSettings };

  if (profile.env) {
    nextSettings.env = profile.env;
  }

  if (profile.model) {
    nextSettings.model = profile.model;
  }

  writeJsonFileSync(settingsPath, nextSettings);
  return settingsPath;
}
