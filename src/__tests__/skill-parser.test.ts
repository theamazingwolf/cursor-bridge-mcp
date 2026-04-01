import { describe, it, expect } from 'vitest';
import { parseSkillFrontmatter } from '../parser/skill-parser.js';
import path from 'path';

const fixtures = path.resolve(import.meta.dirname, 'fixtures/.cursor/skills');

describe('parseSkillFrontmatter', () => {
  it('parses skill with supporting files', async () => {
    const skill = await parseSkillFrontmatter(path.join(fixtures, 'pdf-processing'));
    expect(skill.name).toBe('pdf-processing');
    expect(skill.description).toBe('Extract text and tables from PDF files');
    expect(skill.metadata.author).toBe('example-org');
    expect(skill.metadata.version).toBe('1.0');
    expect(skill.instructions).toBeNull();
    expect(skill.supportingFiles).toContain('scripts/extract-text.py');
    expect(skill.supportingFiles).toContain('references/pdf-form-fields.md');
  });

  it('enumerates files in any subdirectory (not just scripts/references/assets)', async () => {
    const skill = await parseSkillFrontmatter(path.join(fixtures, 'with-guides'));
    expect(skill.name).toBe('with-guides');
    expect(skill.supportingFiles).toContain('guides/01-getting-started.md');
    expect(skill.supportingFiles).toContain('guides/02-advanced.md');
    expect(skill.supportingFiles).not.toContain('SKILL.md');
  });

  it('parses skill without supporting files', async () => {
    const skill = await parseSkillFrontmatter(path.join(fixtures, 'data-analysis'));
    expect(skill.name).toBe('data-analysis');
    expect(skill.description).toBe('Analyze datasets and generate statistical summaries');
    expect(skill.supportingFiles).toEqual([]);
    expect(skill.metadata).toEqual({});
  });
});
