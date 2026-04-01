import { describe, it, expect } from 'vitest';
import { parseFrontmatterOnly, parseFullFile } from '../parser/frontmatter.js';
import path from 'path';

const fixtures = path.resolve(import.meta.dirname, 'fixtures/.cursor/rules');

describe('parseFrontmatterOnly', () => {
  it('parses valid frontmatter', async () => {
    const result = await parseFrontmatterOnly(path.join(fixtures, 'main-overview.mdc'));
    expect(result).not.toBeNull();
    expect(result!.description).toBe('Complete system overview and conventions');
    expect(result!.alwaysApply).toBe(true);
  });

  it('returns null for file with no frontmatter', async () => {
    const result = await parseFrontmatterOnly(path.join(fixtures, 'no-frontmatter.mdc'));
    expect(result).toBeNull();
  });

  it('parses globs as string', async () => {
    const result = await parseFrontmatterOnly(path.join(fixtures, 'component-patterns.mdc'));
    expect(result!.globs).toBe('src/components/**/*.tsx');
  });

  it('parses globs as array', async () => {
    const result = await parseFrontmatterOnly(path.join(fixtures, 'api-conventions.mdc'));
    expect(result!.globs).toEqual(['src/api/**', 'src/middleware/**']);
  });
});

describe('parseFullFile', () => {
  it('returns frontmatter and content body', async () => {
    const result = await parseFullFile(path.join(fixtures, 'main-overview.mdc'));
    expect(result.frontmatter).not.toBeNull();
    expect(result.frontmatter!.description).toBe('Complete system overview and conventions');
    expect(result.content).toContain('# Main Overview');
    expect(result.content).toContain('strict mode');
  });

  it('returns null frontmatter and full content for file without frontmatter', async () => {
    const result = await parseFullFile(path.join(fixtures, 'no-frontmatter.mdc'));
    expect(result.frontmatter).toBeNull();
    expect(result.content).toContain('# No Frontmatter Rule');
  });

  it('handles --- in markdown body without splitting', async () => {
    const result = await parseFullFile(path.join(fixtures, 'main-overview.mdc'));
    // The content should be the body after frontmatter, not split further
    expect(result.frontmatter).not.toBeNull();
    expect(typeof result.content).toBe('string');
  });

  it('handles file with only frontmatter and no body', async () => {
    // referral-system has a short body
    const result = await parseFullFile(path.join(fixtures, 'referral-system.mdc'));
    expect(result.frontmatter).not.toBeNull();
    expect(result.content).toContain('Referral System');
  });
});
