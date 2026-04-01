/** Activation mode for rules */
export type RuleMode = 'always' | 'auto' | 'agent-requested' | 'manual';

/** Context type discriminator */
export type ContextType = 'rule' | 'agent' | 'skill';

/** Parsed .cursor/rules/ file — frontmatter populated at index time, content loaded on demand */
export interface MDCRule {
  filePath: string;
  name: string;
  description: string;
  globs: string[];
  alwaysApply: boolean;
  mode: RuleMode;
  /** null until explicitly loaded via parseFullFile */
  content: string | null;
}

/** Parsed .cursor/agents/*.md file — frontmatter at index time, instructions on demand */
export interface CursorAgent {
  filePath: string;
  name: string;
  description: string;
  model: string;
  readonly: boolean;
  isBackground: boolean;
  /** null until explicitly loaded via parseFullFile */
  instructions: string | null;
}

/** Parsed .cursor/skills SKILL.md — frontmatter at index time, instructions on demand */
export interface CursorSkill {
  filePath: string;
  directoryPath: string;
  name: string;
  description: string;
  metadata: {
    author?: string;
    version?: string;
    license?: string;
  };
  /** null until explicitly loaded via parseFullFile */
  instructions: string | null;
  supportingFiles: string[];
}

/** Top-level index holding all parsed context */
export interface ContextIndex {
  rules: Map<string, MDCRule>;
  agents: Map<string, CursorAgent>;
  skills: Map<string, CursorSkill>;
  lastBuilt: number;
  workspaceRoot: string;
}

/** Configuration loaded from .cursor-bridge/config.yaml */
export interface Config {
  rulesDirectory: string;
  agentsDirectory: string;
  skillsDirectory: string;
  scanUserDirectories: boolean;
}

/** Result from get_active_rules routing */
export interface ActiveRulesResult {
  rules: Array<{
    name: string;
    description: string;
    mode: RuleMode;
    matched_globs?: string[];
    content: string;
  }>;
  total_rules_available: number;
  rules_returned: number;
}
