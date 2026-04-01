import { describe, it, expect } from 'vitest';
import { buildIndex } from '../index/context-index.js';
import { parseFullFile } from '../parser/frontmatter.js';
import path from 'path';
import type { Config } from '../types/index.js';

const fixtureRoot = path.resolve(import.meta.dirname, 'fixtures');
const defaultConfig: Config = {
  rulesDirectory: '.cursor/rules',
  agentsDirectory: '.cursor/agents',
  skillsDirectory: '.cursor/skills',
  scanUserDirectories: false,
};

describe('get_rule (logic)', () => {
  it('loads full content on demand', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const rule = index.rules.get('main-overview')!;
    expect(rule.content).toBeNull();
    const { content } = await parseFullFile(rule.filePath);
    expect(content).toContain('# Main Overview');
  });

  it('returns error info when rule not found', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const rule = index.rules.get('nonexistent');
    expect(rule).toBeUndefined();
    const available = Array.from(index.rules.keys());
    expect(available).toContain('main-overview');
  });
});

describe('get_agent (logic)', () => {
  it('loads full instructions on demand', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const agent = index.agents.get('security-auditor')!;
    expect(agent.instructions).toBeNull();
    const { content } = await parseFullFile(agent.filePath);
    expect(content).toContain('security specialist');
  });
});

describe('get_skill (logic)', () => {
  it('loads full instructions on demand', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const skill = index.skills.get('pdf-processing')!;
    expect(skill.instructions).toBeNull();
    const { content } = await parseFullFile(skill.filePath);
    expect(content).toContain('PDF Processing');
  });

  it('lists supporting files', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const skill = index.skills.get('pdf-processing')!;
    expect(skill.supportingFiles).toContain('scripts/extract-text.py');
    expect(skill.supportingFiles).toContain('references/pdf-form-fields.md');
  });

  it('has_scripts and has_references derived correctly', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const skill = index.skills.get('pdf-processing')!;
    const hasScripts = skill.supportingFiles.some((f) => f.startsWith('scripts/'));
    const hasRefs = skill.supportingFiles.some((f) => f.startsWith('references/'));
    expect(hasScripts).toBe(true);
    expect(hasRefs).toBe(true);

    const dataSkill = index.skills.get('data-analysis')!;
    const dataHasScripts = dataSkill.supportingFiles.some((f) => f.startsWith('scripts/'));
    expect(dataHasScripts).toBe(false);
  });
});

describe('get_skill_file (logic)', () => {
  it('reads supporting file content', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const skill = index.skills.get('pdf-processing')!;
    const filePath = path.resolve(skill.directoryPath, 'scripts/extract-text.py');
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('PyPDF2');
  });

  it('prevents path traversal', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const skill = index.skills.get('pdf-processing')!;
    const resolved = path.resolve(skill.directoryPath, '../../etc/passwd');
    expect(resolved.startsWith(skill.directoryPath)).toBe(false);
  });

  it('rejects files not in supportingFiles list', async () => {
    const index = await buildIndex(fixtureRoot, defaultConfig);
    const skill = index.skills.get('pdf-processing')!;
    expect(skill.supportingFiles.includes('SKILL.md')).toBe(false);
  });
});
