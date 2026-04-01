import { describe, it, expect } from 'vitest';
import { matchGlobs } from '../router/glob-matcher.js';

describe('matchGlobs', () => {
  it('matches a single glob', () => {
    const result = matchGlobs('src/components/Button.tsx', ['src/components/**/*.tsx']);
    expect(result).toEqual(['src/components/**/*.tsx']);
  });

  it('matches from array of globs — partial match', () => {
    const result = matchGlobs('src/api/users.ts', ['src/api/**', 'src/middleware/**']);
    expect(result).toEqual(['src/api/**']);
  });

  it('returns empty array on no match', () => {
    const result = matchGlobs('src/utils/helpers.ts', ['src/components/**/*.tsx']);
    expect(result).toEqual([]);
  });

  it('normalizes Windows backslashes to forward slashes', () => {
    const result = matchGlobs('src\\components\\Button.tsx', ['src/components/**/*.tsx']);
    expect(result).toEqual(['src/components/**/*.tsx']);
  });

  it('returns empty for empty globs array', () => {
    const result = matchGlobs('src/anything.ts', []);
    expect(result).toEqual([]);
  });
});
