import { parseFrontmatterOnly } from './frontmatter.js';
import type { MDCRule, RuleMode } from '../types/index.js';
import path from 'path';

/**
 * Parse a rule file's frontmatter only (no body).
 * Supports both .mdc files and RULE.md in subdirectories.
 */
export async function parseRuleFrontmatter(filePath: string): Promise<MDCRule> {
  const frontmatter = await parseFrontmatterOnly(filePath);
  const basename = path.basename(filePath);
  const dirName = path.basename(path.dirname(filePath));

  // Derive name: for RULE.md use parent directory name, for .mdc use filename without ext
  let name: string;
  if (basename.toLowerCase() === 'rule.md') {
    name = dirName;
  } else {
    name = basename.replace(/\.mdc$/, '').replace(/\.md$/, '');
  }

  if (!frontmatter) {
    return {
      filePath,
      name,
      description: '',
      globs: [],
      alwaysApply: false,
      mode: 'manual',
      content: null,
    };
  }

  const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';
  const alwaysApply = frontmatter.alwaysApply === true;

  // Normalize globs: string -> [string], array -> array, missing -> []
  let globs: string[] = [];
  if (typeof frontmatter.globs === 'string') {
    globs = [frontmatter.globs];
  } else if (Array.isArray(frontmatter.globs)) {
    globs = frontmatter.globs.filter((g): g is string => typeof g === 'string');
  }

  // Derive mode
  let mode: RuleMode;
  if (alwaysApply) {
    mode = 'always';
  } else if (globs.length > 0) {
    mode = 'auto';
  } else {
    mode = 'agent-requested';
  }

  return {
    filePath,
    name,
    description,
    globs,
    alwaysApply,
    mode,
    content: null,
  };
}
