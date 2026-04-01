import { minimatch } from 'minimatch';

/**
 * Test a file path against an array of glob patterns.
 * Returns the list of glob patterns that matched.
 * Normalizes path separators to forward slashes for Windows compatibility.
 */
export function matchGlobs(filePath: string, globs: string[]): string[] {
  const normalized = filePath.replace(/\\/g, '/');
  return globs.filter((glob) =>
    minimatch(normalized, glob, { matchBase: false, dot: false })
  );
}
