import { describe, it, expect } from 'vitest';
import { parseRuleFrontmatter } from '../parser/rule-parser.js';
import path from 'path';

const fixtures = path.resolve(import.meta.dirname, 'fixtures/.cursor/rules');

describe('parseRuleFrontmatter', () => {
  it('parses always-apply rule', async () => {
    const rule = await parseRuleFrontmatter(path.join(fixtures, 'main-overview.mdc'));
    expect(rule.name).toBe('main-overview');
    expect(rule.alwaysApply).toBe(true);
    expect(rule.mode).toBe('always');
    expect(rule.content).toBeNull();
  });

  it('parses auto rule with string glob', async () => {
    const rule = await parseRuleFrontmatter(path.join(fixtures, 'component-patterns.mdc'));
    expect(rule.name).toBe('component-patterns');
    expect(rule.mode).toBe('auto');
    expect(rule.globs).toEqual(['src/components/**/*.tsx']);
    expect(rule.alwaysApply).toBe(false);
  });

  it('parses auto rule with array globs', async () => {
    const rule = await parseRuleFrontmatter(path.join(fixtures, 'api-conventions.mdc'));
    expect(rule.name).toBe('api-conventions');
    expect(rule.mode).toBe('auto');
    expect(rule.globs).toEqual(['src/api/**', 'src/middleware/**']);
  });

  it('parses agent-requested rule (no globs, not always-apply)', async () => {
    const rule = await parseRuleFrontmatter(path.join(fixtures, 'referral-system.mdc'));
    expect(rule.name).toBe('referral-system');
    expect(rule.mode).toBe('agent-requested');
    expect(rule.globs).toEqual([]);
    expect(rule.alwaysApply).toBe(false);
  });

  it('parses manual rule (no frontmatter)', async () => {
    const rule = await parseRuleFrontmatter(path.join(fixtures, 'no-frontmatter.mdc'));
    expect(rule.name).toBe('no-frontmatter');
    expect(rule.mode).toBe('manual');
  });

  it('parses RULE.md in subdirectory — name from directory', async () => {
    const rule = await parseRuleFrontmatter(path.join(fixtures, 'data-models', 'RULE.md'));
    expect(rule.name).toBe('data-models');
    expect(rule.mode).toBe('auto');
    expect(rule.globs).toEqual(['src/models/**']);
  });
});
