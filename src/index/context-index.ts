import path from 'path';
import { readdir, stat } from 'fs/promises';
import { parseRuleFrontmatter } from '../parser/rule-parser.js';
import { parseAgentFrontmatter } from '../parser/agent-parser.js';
import { parseSkillFrontmatter } from '../parser/skill-parser.js';
import type { ContextIndex, Config, MDCRule, CursorAgent, CursorSkill } from '../types/index.js';

/**
 * Build the context index by scanning .cursor/ directories.
 * Only parses frontmatter — content/instructions are loaded on demand.
 */
export async function buildIndex(
  workspaceRoot: string,
  config: Config
): Promise<ContextIndex> {
  const [rules, agents, skills] = await Promise.all([
    scanRules(path.resolve(workspaceRoot, config.rulesDirectory)),
    scanAgents(path.resolve(workspaceRoot, config.agentsDirectory)),
    scanSkills(path.resolve(workspaceRoot, config.skillsDirectory)),
  ]);

  return {
    rules,
    agents,
    skills,
    lastBuilt: Date.now(),
    workspaceRoot,
  };
}

async function scanRules(rulesDir: string): Promise<Map<string, MDCRule>> {
  const rules = new Map<string, MDCRule>();

  let entries;
  try {
    entries = await readdir(rulesDir, { withFileTypes: true });
  } catch {
    return rules;
  }

  const parsePromises: Promise<void>[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rulesDir, entry.name);

    if (entry.isFile() && entry.name.endsWith('.mdc')) {
      // Direct .mdc file
      parsePromises.push(
        parseRuleFrontmatter(fullPath).then((rule) => {
          rules.set(rule.name, rule);
        })
      );
    } else if (entry.isDirectory()) {
      // Check for RULE.md in subdirectory
      const ruleMdPath = path.join(fullPath, 'RULE.md');
      parsePromises.push(
        stat(ruleMdPath)
          .then(() => parseRuleFrontmatter(ruleMdPath))
          .then((rule) => {
            rules.set(rule.name, rule);
          })
          .catch(() => {
            // No RULE.md in this directory — skip
          })
      );
    }
  }

  await Promise.all(parsePromises);
  return rules;
}

async function scanAgents(agentsDir: string): Promise<Map<string, CursorAgent>> {
  const agents = new Map<string, CursorAgent>();

  let entries;
  try {
    entries = await readdir(agentsDir, { withFileTypes: true });
  } catch {
    return agents;
  }

  const parsePromises = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((entry) => {
      const fullPath = path.join(agentsDir, entry.name);
      return parseAgentFrontmatter(fullPath).then((agent) => {
        agents.set(agent.name, agent);
      });
    });

  await Promise.all(parsePromises);
  return agents;
}

async function scanSkills(skillsDir: string): Promise<Map<string, CursorSkill>> {
  const skills = new Map<string, CursorSkill>();

  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch {
    return skills;
  }

  const parsePromises: Promise<void>[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(skillsDir, entry.name);
    const skillMdPath = path.join(skillDir, 'SKILL.md');

    parsePromises.push(
      stat(skillMdPath)
        .then(() => parseSkillFrontmatter(skillDir))
        .then((skill) => {
          skills.set(skill.name, skill);
        })
        .catch(() => {
          // No SKILL.md — skip
        })
    );
  }

  await Promise.all(parsePromises);
  return skills;
}
