/**
 * Compute Jaccard similarity between two text descriptions.
 * Tokenizes on whitespace and punctuation, lowercases, returns |intersection| / |union|.
 */
export function matchDescription(
  ruleDescription: string,
  taskDescription: string
): number {
  const tokenize = (text: string): Set<string> => {
    const words = text
      .toLowerCase()
      .split(/[\s\-_.,;:!?'"()\[\]{}|/\\]+/)
      .filter((w) => w.length > 0);
    return new Set(words);
  };

  const ruleTokens = tokenize(ruleDescription);
  const taskTokens = tokenize(taskDescription);

  if (ruleTokens.size === 0 || taskTokens.size === 0) return 0;

  let intersectionSize = 0;
  for (const token of ruleTokens) {
    if (taskTokens.has(token)) intersectionSize++;
  }

  const unionSize = new Set([...ruleTokens, ...taskTokens]).size;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/** Default threshold for including agent-requested rules */
export const DESCRIPTION_MATCH_THRESHOLD = 0.15;
