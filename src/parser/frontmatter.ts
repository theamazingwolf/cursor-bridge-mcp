import { readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parse as parseYaml } from 'yaml';

/**
 * Frontmatter-only mode: reads line-by-line, stops at closing ---.
 * Used during index rebuild for speed — never reads the markdown body.
 */
export async function parseFrontmatterOnly(
  filePath: string
): Promise<Record<string, unknown> | null> {
  const lines: string[] = [];
  let inFrontmatter = false;

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!inFrontmatter) {
      if (trimmed === '---') {
        inFrontmatter = true;
        continue;
      }
      // First non-empty line isn't ---, so no frontmatter
      if (trimmed !== '') {
        rl.close();
        return null;
      }
      // Skip leading blank lines
      continue;
    }
    // Inside frontmatter
    if (trimmed === '---') {
      rl.close();
      break;
    }
    lines.push(line);
  }

  if (lines.length === 0) return null;

  try {
    const parsed = parseYaml(lines.join('\n'));
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Full-read mode: reads entire file, returns both frontmatter and markdown body.
 * Used on demand when a tool needs the full content.
 */
export async function parseFullFile(
  filePath: string
): Promise<{ frontmatter: Record<string, unknown> | null; content: string }> {
  const raw = await readFile(filePath, 'utf-8');
  const trimmedRaw = raw.trimStart();

  if (!trimmedRaw.startsWith('---')) {
    return { frontmatter: null, content: raw };
  }

  // Find the closing ---
  const afterFirst = trimmedRaw.indexOf('\n', 3);
  if (afterFirst === -1) {
    return { frontmatter: null, content: raw };
  }

  const closingIdx = trimmedRaw.indexOf('\n---', afterFirst);
  if (closingIdx === -1) {
    return { frontmatter: null, content: raw };
  }

  const yamlBlock = trimmedRaw.slice(afterFirst + 1, closingIdx);
  const bodyStart = trimmedRaw.indexOf('\n', closingIdx + 1);
  const content =
    bodyStart === -1 ? '' : trimmedRaw.slice(bodyStart + 1).trimStart();

  try {
    const parsed = parseYaml(yamlBlock);
    const frontmatter =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    return { frontmatter, content };
  } catch {
    return { frontmatter: null, content: raw };
  }
}
