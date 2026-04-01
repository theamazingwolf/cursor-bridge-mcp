import { parseFrontmatterOnly } from './frontmatter.js';
import type { CursorAgent } from '../types/index.js';
import path from 'path';

/**
 * Parse an agent file's frontmatter only (no instructions body).
 */
export async function parseAgentFrontmatter(filePath: string): Promise<CursorAgent> {
  const frontmatter = await parseFrontmatterOnly(filePath);
  const basename = path.basename(filePath, '.md');

  const name = typeof frontmatter?.name === 'string' ? frontmatter.name : basename;
  const description = typeof frontmatter?.description === 'string' ? frontmatter.description : '';
  const model = typeof frontmatter?.model === 'string' ? frontmatter.model : 'inherit';
  const readonly = frontmatter?.readonly === true;
  const isBackground =
    frontmatter?.is_background === true || frontmatter?.isBackground === true;

  return {
    filePath,
    name,
    description,
    model,
    readonly,
    isBackground,
    instructions: null,
  };
}
