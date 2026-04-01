# Tasks: Phase 1 — Core Server and Context Routing

> Generated from [01-core-server-and-context-routing.md](01-core-server-and-context-routing.md)

## Relevant Files

- `package.json` - Project manifest, scripts, dependencies
- `tsconfig.json` - TypeScript configuration
- `src/index.ts` - MCP server entry point (stdio transport)
- `src/server.ts` - MCP server setup and tool registration
- `src/types/index.ts` - Shared type definitions (MDCRule, CursorAgent, CursorSkill, ContextIndex)
- `src/parser/frontmatter.ts` - Two-mode YAML frontmatter parser (frontmatter-only and full-read)
- `src/parser/rule-parser.ts` - Parse .cursor/rules/ (.mdc and RULE.md formats)
- `src/parser/agent-parser.ts` - Parse .cursor/agents/*.md
- `src/parser/skill-parser.ts` - Parse .cursor/skills/*/SKILL.md + enumerate supporting files
- `src/index/context-index.ts` - Build and rebuild ContextIndex from disk (frontmatter-only)
- `src/router/context-router.ts` - Match rules to files/task via always/auto/agent-requested routing
- `src/router/glob-matcher.ts` - Glob pattern matching wrapper (minimatch, Windows path normalization)
- `src/router/description-matcher.ts` - Jaccard similarity scoring for agent-requested rules
- `src/config.ts` - Load .cursor-bridge/config.yaml
- `src/__tests__/frontmatter.test.ts` - Tests for frontmatter parser
- `src/__tests__/rule-parser.test.ts` - Tests for rule parser
- `src/__tests__/agent-parser.test.ts` - Tests for agent parser
- `src/__tests__/skill-parser.test.ts` - Tests for skill parser
- `src/__tests__/context-index.test.ts` - Tests for index builder
- `src/__tests__/context-router.test.ts` - Tests for routing logic (always, auto, agent-requested)
- `src/__tests__/glob-matcher.test.ts` - Tests for glob matching + Windows path normalization
- `src/__tests__/description-matcher.test.ts` - Tests for Jaccard similarity
- `src/__tests__/tools.test.ts` - Integration tests for all MCP tools

### Notes

- Tests use Vitest (configured in package.json)
- Test fixtures go in `src/__tests__/fixtures/` — sample `.mdc`, agent `.md`, and skill directories
- Implementation order: types -> parser -> index -> router -> tools -> config

## Tasks

### 0: Project Setup & Scaffolding

- [ ] 1.0.1 Initialize `package.json` with `name: "cursor-bridge-mcp"`, `type: "module"`, `bin` entry pointing to `dist/index.js`, and scripts for `build` (tsc), `dev` (tsx watch), and `test` (vitest)
- [ ] 1.0.2 Create `tsconfig.json` targeting ES2022, module NodeNext, strict mode, outDir `dist/`, rootDir `src/`
- [ ] 1.0.3 Install dependencies: `@modelcontextprotocol/sdk`, `minimatch`, `yaml` as production deps; `typescript`, `tsx`, `vitest`, `@types/node` as dev deps
- [ ] 1.0.4 Create `src/types/index.ts` with `MDCRule`, `CursorAgent`, `CursorSkill`, `ContextIndex`, and `ContextType` type definitions per PRD data model (content/instructions fields typed as `string | null`)
- [ ] 1.0.5 Create `src/index.ts` — minimal MCP server entry point using stdio transport that starts the server and logs to stderr
- [ ] 1.0.6 Create `src/server.ts` — MCP server class that registers all 6 tool definitions (schemas only, handler stubs returning "not implemented") and wires up tool dispatch
- [ ] 1.0.7 Verify the server starts via `echo '{}' | node dist/index.js` without errors

### US-1.7: Frontmatter Parser & Index Builder
> As a Claude Code user, I want every tool call to reflect the current state of .cursor/ files so that I always get up-to-date context without restarting the MCP server.

- [ ] 1.7.1 Implement `src/parser/frontmatter.ts` with two exported functions: `parseFrontmatterOnly(filePath): Promise<Record<string, unknown> | null>` (reads line-by-line, stops at closing `---`, parses YAML) and `parseFullFile(filePath): Promise<{ frontmatter: Record<string, unknown> | null; content: string }>` (reads entire file, splits on `---` delimiters, returns both frontmatter and markdown body)
- [ ] 1.7.2 Write tests for frontmatter parser: file with valid frontmatter, file with no frontmatter (no `---`), file with empty frontmatter, file with `---` in markdown body (should not split on it), file with only frontmatter and no body
- [ ] 1.7.3 Implement `src/parser/rule-parser.ts` — `parseRuleFrontmatter(filePath): Promise<MDCRule>` that uses `parseFrontmatterOnly`, extracts `description`, `globs` (normalize string to array), `alwaysApply` (default false), derives `mode`, and sets `content: null`. Support both `.mdc` files and `RULE.md` in subdirectories.
- [ ] 1.7.4 Implement `src/parser/agent-parser.ts` — `parseAgentFrontmatter(filePath): Promise<CursorAgent>` that extracts `name` (default from filename), `description`, `model` (default "inherit"), `readonly` (default false), `isBackground` (default false), sets `instructions: null`
- [ ] 1.7.5 Implement `src/parser/skill-parser.ts` — `parseSkillFrontmatter(skillDir): Promise<CursorSkill>` that reads `SKILL.md` frontmatter, extracts `name` (default from directory name), `description`, `metadata`, sets `instructions: null`, and enumerates `supportingFiles` by listing `scripts/`, `references/`, `assets/` subdirectories
- [ ] 1.7.6 Write tests for each parser: rule with globs string vs array, rule with alwaysApply true/false, rule with no frontmatter (manual mode), agent with all fields vs minimal, skill with and without supporting files
- [ ] 1.7.7 Implement `src/index/context-index.ts` — `buildIndex(workspaceRoot, config): Promise<ContextIndex>` that scans configured directories, calls the appropriate parser for each file type, and populates the Maps. Scan rules dir for `*.mdc` files and `*/RULE.md` subdirectories. Handle missing directories gracefully (empty Maps, no errors).
- [ ] 1.7.8 Write tests for index builder using fixture directories: directory with mixed .mdc and RULE.md files, empty directories, missing directories, directories with non-context files (should be ignored)

**Acceptance criteria:**
- [ ] AC-1: Given the server is running and a new `.mdc` file is added to `.cursor/rules/`, when `get_context_index` is called, then the new rule appears in the index.
- [ ] AC-2: Given the server is running and an existing agent file is modified, when `get_agent` is called for that agent, then the updated content is returned.
- [ ] AC-3: Given the server is running and a skill directory is deleted, when `get_context_index` is called, then the skill no longer appears in the index.
- [ ] AC-4: Given a typical project with 20 rule files, 5 agents, and 3 skills, when any tool is called, then the index rebuild completes in under 100ms.

### US-1.1 + US-1.2 + US-1.3: Context Router & `get_active_rules`
> As a Claude Code user, I want rules to activate based on always-apply flags, glob patterns, and task descriptions so that relevant context surfaces automatically.

- [ ] 1.1.1 Implement `src/router/glob-matcher.ts` — `matchGlobs(filePath: string, globs: string[]): string[]` that normalizes path separators to forward slashes, tests against each glob using `minimatch` with `{ matchBase: false, dot: false }`, and returns the list of matching glob patterns
- [ ] 1.1.2 Write tests for glob matcher: single glob match, array of globs with partial match, no match, Windows backslash paths normalized to forward slashes, edge cases (empty globs array, empty file path)
- [ ] 1.1.3 Implement `src/router/description-matcher.ts` — `matchDescription(ruleDescription: string, taskDescription: string): number` that tokenizes both strings (lowercase, split on whitespace and punctuation), computes Jaccard similarity (`|intersection| / |union|`), returns the score
- [ ] 1.1.4 Write tests for description matcher: exact overlap returns 1.0, partial overlap returns expected score, no overlap returns 0, threshold boundary (0.14 vs 0.16), punctuation handling, case insensitivity
- [ ] 1.1.5 Implement `src/router/context-router.ts` — `getActiveRules(index: ContextIndex, files?: string[], taskDescription?: string): Promise<ActiveRulesResult>` that: (1) collects always-apply rules, (2) matches auto rules against files via glob-matcher, (3) scores agent-requested rules against taskDescription via description-matcher with 0.15 threshold, (4) deduplicates by name, (5) reads full content from disk for matched rules only via `parseFullFile`
- [ ] 1.1.6 Wire `get_active_rules` tool handler in `server.ts`: rebuild index, validate inputs (at least one of files/taskDescription), call `getActiveRules`, format response with `rules` array, `total_rules_available`, `rules_returned`
- [ ] 1.1.7 Write integration tests for `get_active_rules`: always-apply rule included regardless of files, glob match includes rule with `matched_globs`, glob non-match excludes rule, agent-requested rule matched by description, agent-requested rule excluded when no taskDescription, deduplication when rule matches multiple criteria, error when neither files nor taskDescription provided

**Acceptance criteria (US-1.1):**
- [ ] AC-1: Given a `.cursor/rules/main-overview.mdc` with `alwaysApply: true`, when `get_active_rules` is called with any file list, then the rule's full content is included.
- [ ] AC-2: Given multiple rules with `alwaysApply: true`, when called, then all are returned.
- [ ] AC-3: Given a rule with `alwaysApply: true` and `globs` present, then it is returned (alwaysApply takes precedence).

**Acceptance criteria (US-1.2):**
- [ ] AC-1: Given `globs: "src/components/**/*.tsx"` and `files: ["src/components/Button.tsx"]`, then rule is included with `matched_globs`.
- [ ] AC-2: Given `globs: ["src/api/**", "src/middleware/**"]` and `files: ["src/api/users.ts"]`, then rule is included.
- [ ] AC-3: Given `globs: "src/components/**/*.tsx"` and `files: ["src/utils/helpers.ts"]`, then rule is not included.
- [ ] AC-4: Given overlapping globs matching same file, then all matching rules returned, deduplicated by name.

**Acceptance criteria (US-1.3):**
- [ ] AC-1: Given `alwaysApply: false` and no `globs`, then mode is `agent-requested`.
- [ ] AC-2: Given description "Referral matching algorithm" and task "Updating the referral matching algorithm", then rule is included.
- [ ] AC-3: Given no `task_description`, then agent-requested rules are not included.

### US-1.4: `get_context_index` Tool
> As a Claude Code user, I want to see a lightweight menu of all available context so that I can discover what's available without loading full content.

- [ ] 1.4.1 Wire `get_context_index` tool handler in `server.ts`: rebuild index, default `types` to all three if omitted, filter by requested types, project each item to summary shape (rules: name/description/mode/globs; agents: name/description/model/readonly/is_background; skills: name/description/has_scripts/has_references)
- [ ] 1.4.2 Implement `has_scripts` and `has_references` as derived booleans on skill summaries — check if `supportingFiles` contains any path starting with `scripts/` or `references/` respectively
- [ ] 1.4.3 Write tests: all types returned by default, filtered by single type, filtered by multiple types, empty directories produce empty arrays, summary shapes contain no content/instructions fields

**Acceptance criteria:**
- [ ] AC-1: Given 3 rules, 1 agent, 2 skills, when called with `types: ["rule", "agent", "skill"]`, then all 6 items listed with name and description only.
- [ ] AC-2: Given `types: ["agent"]`, then only agents returned.
- [ ] AC-3: Rule entries include `name`, `description`, `mode`, `globs`.
- [ ] AC-4: Agent entries include `name`, `description`, `model`, `readonly`, `is_background`.
- [ ] AC-5: Skill entries include `name`, `description`, `has_scripts`, `has_references`.

### US-1.5: `get_rule`, `get_agent`, `get_skill` Tools
> As a Claude Code user, I want to load full content of any context item by name so that I can read detailed instructions when relevant.

- [ ] 1.5.1 Wire `get_rule` tool handler: rebuild index, look up by name, if not found return error with available names, read full content via `parseFullFile`, return name/description/content
- [ ] 1.5.2 Wire `get_agent` tool handler: rebuild index, look up by name, if not found return error with available names, read full instructions via `parseFullFile`, return full agent definition
- [ ] 1.5.3 Wire `get_skill` tool handler: rebuild index, look up by name, if not found return error with available names, read full instructions via `parseFullFile`, conditionally include `supporting_files` based on `include_supporting_files` param (default false), return full skill definition with metadata
- [ ] 1.5.4 Write tests for each tool: successful lookup returns full content, not-found error includes available names list, `get_skill` with `include_supporting_files: true` vs `false`

**Acceptance criteria:**
- [ ] AC-1: Given rule "data-models-relationships" exists, `get_rule` returns name, description, and full content.
- [ ] AC-2: Given agent "security-auditor" exists, `get_agent` returns name, description, model, readonly, is_background, and full instructions.
- [ ] AC-3: Given skill "pdf-processing" with supporting files, `get_skill` returns name, description, metadata, full instructions, and supporting_files list.
- [ ] AC-4: Given non-existent item, error includes requested name and available names.

### US-1.6: `get_skill_file` Tool
> As a Claude Code user, I want to load individual supporting files from a skill package so that I can reference specific scripts or docs.

- [ ] 1.6.1 Wire `get_skill_file` tool handler: rebuild index, look up skill by name, resolve `file_path` relative to skill's `directoryPath`, validate resolved path is within skill directory using `path.resolve()` + `startsWith()` check, verify file is in `supportingFiles` list, read and return content
- [ ] 1.6.2 Write tests: successful file read, path traversal attempt (`../../etc/passwd`) rejected, non-existent file returns error with available files list, skill not found error

**Acceptance criteria:**
- [ ] AC-1: Given skill "pdf-processing" with `scripts/extract-text.py`, when called, then file content is returned.
- [ ] AC-2: Given path traversal `../../etc/passwd`, then request is rejected with error.
- [ ] AC-3: Given non-existent file in valid skill, then error lists available supporting files.

### 7: Configuration & Polish

- [ ] 1.7.1 Implement `src/config.ts` — `loadConfig(workspaceRoot): Config` that reads `.cursor-bridge/config.yaml` if it exists, returns defaults if not (rules_directory: ".cursor/rules", agents_directory: ".cursor/agents", skills_directory: ".cursor/skills")
- [ ] 1.7.2 Wire config loading into index builder — use configured directory paths instead of hardcoded defaults
- [ ] 1.7.3 Handle missing `.cursor/` directories gracefully across all tools — if no rules/agents/skills directories exist, return empty results (not errors) for `get_context_index`, and return the "not found" error with empty available list for item lookups
- [ ] 1.7.4 Add `README.md` with installation instructions (npx usage), MCP config examples for Claude Code and Cursor, and brief description of each tool
- [ ] 1.7.5 End-to-end smoke test: create a temp directory with sample `.cursor/rules/`, `.cursor/agents/`, `.cursor/skills/`, start the server, call each tool, verify responses match expected shapes
