import { describe, it, expect } from 'vitest';
import { buildIndex } from '../index/context-index.js';
import path from 'path';
import type { Config } from '../types/index.js';

const fixtureRoot = path.resolve(import.meta.dirname, 'fixtures');

const defaultConfig: Config = {
  rulesDirectory: '.cursor/rules',
  agentsDirectory: '.cursor/agents',
  skillsDirectory: '.cursor/skills',
  scanUserDirectories: false,
};

describe('buildIndex', () => {
  it('builds index with all context types', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);

    // Rules: main-overview, component-patterns, api-conventions, referral-system, no-frontmatter, data-models
    expect(index.rules.size).toBe(6);
    expect(index.rules.has('main-overview')).toBe(true);
    expect(index.rules.has('data-models')).toBe(true);
    expect(index.rules.has('no-frontmatter')).toBe(true);

    // Agents: security-auditor, code-reviewer
    expect(index.agents.size).toBe(2);
    expect(index.agents.has('security-auditor')).toBe(true);

    // Skills: pdf-processing, data-analysis
    expect(index.skills.size).toBe(2);
    expect(index.skills.has('pdf-processing')).toBe(true);
  });

  it('content/instructions are null at index time', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const rule = index.rules.get('main-overview')!;
    expect(rule.content).toBeNull();
    const agent = index.agents.get('security-auditor')!;
    expect(agent.instructions).toBeNull();
    const skill = index.skills.get('pdf-processing')!;
    expect(skill.instructions).toBeNull();
  });

  it('handles missing directories gracefully', async () => {
    const config: Config = {
      ...defaultConfig,
      rulesDirectory: '.cursor/nonexistent',
      agentsDirectory: '.cursor/nonexistent',
      skillsDirectory: '.cursor/nonexistent',
    };
    const index = await buildIndex(fixtureRoot, config);
    expect(index.rules.size).toBe(0);
    expect(index.agents.size).toBe(0);
    expect(index.skills.size).toBe(0);
  });

  it('supports both .mdc and RULE.md formats', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    // .mdc format
    const mdcRule = index.rules.get('component-patterns')!;
    expect(mdcRule.mode).toBe('auto');
    // RULE.md format
    const ruleMd = index.rules.get('data-models')!;
    expect(ruleMd.mode).toBe('auto');
    expect(ruleMd.globs).toEqual(['src/models/**']);
  });
});
