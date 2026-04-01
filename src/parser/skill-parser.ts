import { parseFrontmatterOnly } from './frontmatter.js';
import type { CursorSkill } from '../types/index.js';
import path from 'path';
import { readdir, stat } from 'fs/promises';

/**
 * Parse a skill directory's SKILL.md frontmatter and enumerate supporting files.
 */
export async function parseSkillFrontmatter(skillDir: string): Promise<CursorSkill> {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const frontmatter = await parseFrontmatterOnly(skillMdPath);
  const dirName = path.basename(skillDir);

  const name = typeof frontmatter?.name === 'string' ? frontmatter.name : dirName;
  const description = typeof frontmatter?.description === 'string' ? frontmatter.description : '';

  const metadata: CursorSkill['metadata'] = {};
  if (frontmatter?.metadata && typeof frontmatter.metadata === 'object') {
    const m = frontmatter.metadata as Record<string, unknown>;
    if (typeof m.author === 'string') metadata.author = m.author;
    if (typeof m.version === 'string') metadata.version = m.version;
    if (typeof m.license === 'string') metadata.license = m.license;
  }
  if (typeof frontmatter?.license === 'string') {
    metadata.license = frontmatter.license;
  }

  const supportingFiles = await enumerateSupportingFiles(skillDir);

  return {
    filePath: skillMdPath,
    directoryPath: skillDir,
    name,
    description,
    metadata,
    instructions: null,
    supportingFiles,
  };
}

async function enumerateSupportingFiles(skillDir: string): Promise<string[]> {
  const subdirs = ['scripts', 'references', 'assets'];
  const files: string[] = [];

  for (const subdir of subdirs) {
    const dirPath = path.join(skillDir, subdir);
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(`${subdir}/${entry.name}`);
        }
      }
    } catch {
      // Directory doesn't exist — that's fine
    }
  }

  return files;
}
