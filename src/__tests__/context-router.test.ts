import { describe, it, expect } from 'vitest';
import { getActiveRules } from '../router/context-router.js';
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

describe('getActiveRules', () => {
  it('always includes always-apply rules', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const result = await getActiveRules(index, ['src/utils/anything.ts']);
    const names = result.rules.map((r) => r.name);
    expect(names).toContain('main-overview');
    expect(result.rules.find((r) => r.name === 'main-overview')!.content).toContain('Main Overview');
  });

  it('includes auto rules when globs match', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const result = await getActiveRules(index, ['src/components/Button.tsx']);
    const names = result.rules.map((r) => r.name);
    expect(names).toContain('component-patterns');
    const matched = result.rules.find((r) => r.name === 'component-patterns')!;
    expect(matched.matched_globs).toEqual(['src/components/**/*.tsx']);
  });

  it('excludes auto rules when globs do not match', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const result = await getActiveRules(index, ['src/utils/helpers.ts']);
    const names = result.rules.map((r) => r.name);
    expect(names).not.toContain('component-patterns');
  });

  it('includes agent-requested rules when description matches task', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const result = await getActiveRules(
      index,
      undefined,
      'Updating the referral matching algorithm'
    );
    const names = result.rules.map((r) => r.name);
    expect(names).toContain('referral-system');
  });

  it('excludes agent-requested rules when no task_description', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const result = await getActiveRules(index, ['src/components/Button.tsx']);
    const names = result.rules.map((r) => r.name);
    expect(names).not.toContain('referral-system');
  });

  it('deduplicates rules by name', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const result = await getActiveRules(
      index,
      ['src/api/users.ts'],
      'API route handler conventions and error handling'
    );
    const apiRules = result.rules.filter((r) => r.name === 'api-conventions');
    expect(apiRules.length).toBe(1);
  });

  it('returns total_rules_available count', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const result = await getActiveRules(index, ['src/anything.ts']);
    expect(result.total_rules_available).toBe(index.rules.size);
  });
});
