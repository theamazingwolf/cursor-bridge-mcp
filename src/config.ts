import path from 'path';
import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Config } from './types/index.js';

const DEFAULT_CONFIG: Config = {
  rulesDirectory: '.cursor/rules',
  agentsDirectory: '.cursor/agents',
  skillsDirectory: '.cursor/skills',
  scanUserDirectories: false,
};

/**
 * Load configuration from .cursor-bridge/config.yaml.
 * Returns defaults if the file doesn't exist.
 */
export async function loadConfig(workspaceRoot: string): Promise<Config> {
  const configPath = path.join(workspaceRoot, '.cursor-bridge', 'config.yaml');

  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = parseYaml(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_CONFIG;
    }
    const obj = parsed as Record<string, unknown>;
    return {
      rulesDirectory:
        typeof obj.rules_directory === 'string'
          ? obj.rules_directory
          : DEFAULT_CONFIG.rulesDirectory,
      agentsDirectory:
        typeof obj.agents_directory === 'string'
          ? obj.agents_directory
          : DEFAULT_CONFIG.agentsDirectory,
      skillsDirectory:
        typeof obj.skills_directory === 'string'
          ? obj.skills_directory
          : DEFAULT_CONFIG.skillsDirectory,
      scanUserDirectories:
        typeof obj.scan_user_directories === 'boolean'
          ? obj.scan_user_directories
          : DEFAULT_CONFIG.scanUserDirectories,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
