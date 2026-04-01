import { matchGlobs } from './glob-matcher.js';
import { matchDescription, DESCRIPTION_MATCH_THRESHOLD } from './description-matcher.js';
import { parseFullFile } from '../parser/frontmatter.js';
import type { ContextIndex, ActiveRulesResult } from '../types/index.js';

/**
 * Route rules based on activation mode:
 * 1. Always-apply rules are always included
 * 2. Auto rules match against provided file paths via glob
 * 3. Agent-requested rules match against task description via Jaccard similarity
 */
export async function getActiveRules(
  index: ContextIndex,
  files?: string[],
  taskDescription?: string
): Promise<ActiveRulesResult> {
  const matched = new Map<
    string,
    { name: string; description: string; mode: string; matched_globs?: string[]; filePath: string }
  >();

  for (const [name, rule] of index.rules) {
    // 1. Always-apply
    if (rule.mode === 'always') {
      matched.set(name, {
        name: rule.name,
        description: rule.description,
        mode: rule.mode,
        filePath: rule.filePath,
      });
      continue;
    }

    // 2. Auto — glob match against files
    if (rule.mode === 'auto' && files?.length) {
      const allMatchedGlobs = new Set<string>();
      for (const file of files) {
        const matches = matchGlobs(file, rule.globs);
        for (const m of matches) allMatchedGlobs.add(m);
      }
      if (allMatchedGlobs.size > 0) {
        matched.set(name, {
          name: rule.name,
          description: rule.description,
          mode: rule.mode,
          matched_globs: Array.from(allMatchedGlobs),
          filePath: rule.filePath,
        });
      }
      continue;
    }

    // 3. Agent-requested — description similarity
    if (rule.mode === 'agent-requested' && taskDescription) {
      const score = matchDescription(rule.description, taskDescription);
      if (score >= DESCRIPTION_MATCH_THRESHOLD) {
        matched.set(name, {
          name: rule.name,
          description: rule.description,
          mode: rule.mode,
          filePath: rule.filePath,
        });
      }
    }
  }

  // Load full content for matched rules only
  const rules = await Promise.all(
    Array.from(matched.values()).map(async (entry) => {
      const { content } = await parseFullFile(entry.filePath);
      const result: ActiveRulesResult['rules'][number] = {
        name: entry.name,
        description: entry.description,
        mode: entry.mode as ActiveRulesResult['rules'][number]['mode'],
        content,
      };
      if (entry.matched_globs) {
        result.matched_globs = entry.matched_globs;
      }
      return result;
    })
  );

  return {
    rules,
    total_rules_available: index.rules.size,
    rules_returned: rules.length,
  };
}
