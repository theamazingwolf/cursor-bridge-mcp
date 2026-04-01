# Phase 1: Core Server and Context Routing

> **Cursor Bridge MCP** — PRD Phase 1 of 2

---

## Phase Overview

### Goals

This phase builds the complete Cursor Bridge MCP server — a stdio-based MCP server that parses Cursor's three-layer context system (rules, agents, skills) and serves them on demand to Claude Code and other MCP-compatible tools. It covers four distinct concerns: (1) YAML frontmatter and markdown parsing for all three context types, (2) a frontmatter-only context index that rebuilds from disk on each tool call, (3) activation-mode routing with glob matching and description-based discovery, and (4) the MCP tool surface that exposes everything to the consuming AI tool. This phase delivers a fully functional MCP server — the only feature deferred is the optional Censi bridge.

### Scope

| In scope | Out of scope |
|----------|--------------|
| stdio MCP server entry point and lifecycle | Censi output directory reading and `.mdc` generation |
| `.cursor/rules/` parsing (`.mdc` and `RULE.md` formats) | HTTP/SSE transport |
| `.cursor/agents/*.md` parsing | Agent execution or delegation (read-only definitions) |
| `.cursor/skills/*/SKILL.md` parsing | Skill script execution (content serving only) |
| Context index building across all three types (frontmatter-only) | Global user-level directory scanning (`~/.cursor/`) |
| Rebuild-on-call freshness (no file watcher) | VS Code extension or status bar UI |
| Glob-based activation matching via `minimatch` | AI-powered description relevance scoring |
| `get_active_rules` tool with always/auto/agent-requested routing | Bidirectional sync (Claude Code -> `.cursor/`) |
| `get_context_index` tool for lightweight discovery | Rule templates or scaffolding commands |
| `get_rule`, `get_agent`, `get_skill`, `get_skill_file` tools | Team rules or shared rule sources |
| Configuration via `.cursor-bridge/config.yaml` | |
| Supporting file enumeration within skill directories | |

### Dependencies

No dependencies. This phase is self-contained.

---

## User Stories

### US-1.1 — Always-Active Rule Injection

**As a** Claude Code user,
**I want** rules marked `alwaysApply: true` to be returned automatically when I request active rules,
**so that** project-wide conventions are always in context regardless of which files I'm working on.

#### Acceptance Criteria

| # | Given / When / Then |
|---|---------------------|
| AC-1 | Given a `.cursor/rules/main-overview.mdc` file with `alwaysApply: true` in frontmatter, when `get_active_rules` is called with any file list, then the rule's full content is included in the response. |
| AC-2 | Given multiple rules with `alwaysApply: true`, when `get_active_rules` is called, then all always-apply rules are returned. |
| AC-3 | Given a rule with `alwaysApply: true` and `globs` also present, when `get_active_rules` is called, then the rule is returned (alwaysApply takes precedence over glob matching). |

---

### US-1.2 — Glob-Based Rule Activation

**As a** Claude Code user,
**I want** rules with glob patterns to activate automatically when I'm working on matching files,
**so that** file-specific conventions appear without me having to look them up.

#### Acceptance Criteria

| # | Given / When / Then |
|---|---------------------|
| AC-1 | Given a rule with `globs: "src/components/**/*.tsx"` and `alwaysApply: false`, when `get_active_rules` is called with `files: ["src/components/Button.tsx"]`, then the rule is included with `matched_globs: ["src/components/**/*.tsx"]`. |
| AC-2 | Given a rule with `globs: ["src/api/**", "src/middleware/**"]` (array format), when `get_active_rules` is called with `files: ["src/api/users.ts"]`, then the rule is included. |
| AC-3 | Given a rule with `globs: "src/components/**/*.tsx"`, when `get_active_rules` is called with `files: ["src/utils/helpers.ts"]`, then the rule is not included. |
| AC-4 | Given multiple rules with overlapping globs that match the same file, when `get_active_rules` is called, then all matching rules are returned, deduplicated by name. |

---

### US-1.3 — Agent-Requested Rule Discovery

**As a** Claude Code user,
**I want** rules without globs to be discoverable by task description,
**so that** domain-specific knowledge surfaces when relevant even without explicit file matching.

#### Acceptance Criteria

| # | Given / When / Then |
|---|---------------------|
| AC-1 | Given a rule with `alwaysApply: false` and no `globs` in frontmatter, then the rule's `mode` is set to `agent-requested`. |
| AC-2 | Given an `agent-requested` rule with description "Referral matching algorithm and state machine", when `get_active_rules` is called with `task_description: "Updating the referral matching algorithm"`, then the rule is included based on keyword overlap between description and task. |
| AC-3 | Given an `agent-requested` rule, when `get_active_rules` is called with no `task_description`, then the rule is not included (but remains discoverable via `get_context_index`). |

---

### US-1.4 — Context Index Browsing

**As a** Claude Code user,
**I want** to see a lightweight menu of all available rules, agents, and skills,
**so that** I can discover what context is available without loading full content.

#### Acceptance Criteria

| # | Given / When / Then |
|---|---------------------|
| AC-1 | Given `.cursor/rules/` contains 3 rules, `.cursor/agents/` contains 1 agent, and `.cursor/skills/` contains 2 skills, when `get_context_index` is called with `types: ["rule", "agent", "skill"]`, then the response lists all 6 items with name and description only (no content/instructions). |
| AC-2 | Given `get_context_index` is called with `types: ["agent"]`, then only agents are returned. |
| AC-3 | Given a rule entry in the index response, then it includes `name`, `description`, `mode`, and `globs` fields. |
| AC-4 | Given an agent entry in the index response, then it includes `name`, `description`, `model`, `readonly`, and `is_background` fields. |
| AC-5 | Given a skill entry in the index response, then it includes `name`, `description`, `has_scripts` (boolean), and `has_references` (boolean) fields. |

---

### US-1.5 — Full Context Loading

**As a** Claude Code user,
**I want** to load the full content of any rule, agent, or skill by name,
**so that** I can read detailed instructions when I decide a context item is relevant.

#### Acceptance Criteria

| # | Given / When / Then |
|---|---------------------|
| AC-1 | Given a rule named "data-models-relationships" exists, when `get_rule` is called with `name: "data-models-relationships"`, then the response includes `name`, `description`, and full `content` (markdown body). |
| AC-2 | Given an agent named "security-auditor" exists, when `get_agent` is called with `name: "security-auditor"`, then the response includes `name`, `description`, `model`, `readonly`, `is_background`, and full `instructions`. |
| AC-3 | Given a skill named "pdf-processing" exists with supporting files, when `get_skill` is called with `name: "pdf-processing"`, then the response includes `name`, `description`, `metadata`, full `instructions`, and `supporting_files` list (paths only). |
| AC-4 | Given a request for a non-existent context item, when any `get_*` tool is called, then an error is returned with a descriptive message including the requested name and available names. |

---

### US-1.6 — Skill Supporting File Access

**As a** Claude Code user,
**I want** to load individual supporting files from a skill package,
**so that** I can reference scripts, examples, or documentation within a skill without loading everything.

#### Acceptance Criteria

| # | Given / When / Then |
|---|---------------------|
| AC-1 | Given a skill "pdf-processing" with file `scripts/extract-text.py`, when `get_skill_file` is called with `skill_name: "pdf-processing"` and `file_path: "scripts/extract-text.py"`, then the file content is returned. |
| AC-2 | Given a request for a file outside the skill's directory (path traversal like `../../etc/passwd`), when `get_skill_file` is called, then the request is rejected with an error. |
| AC-3 | Given a request for a non-existent file within a valid skill, when `get_skill_file` is called, then an error is returned listing available supporting files. |

---

### US-1.7 — Fresh Context on Every Call

**As a** Claude Code user,
**I want** every tool call to reflect the current state of `.cursor/` files,
**so that** I always get up-to-date context without restarting the MCP server.

#### Acceptance Criteria

| # | Given / When / Then |
|---|---------------------|
| AC-1 | Given the server is running and a new `.mdc` file is added to `.cursor/rules/`, when `get_context_index` is called, then the new rule appears in the index. |
| AC-2 | Given the server is running and an existing agent file is modified, when `get_agent` is called for that agent, then the updated content is returned. |
| AC-3 | Given the server is running and a skill directory is deleted, when `get_context_index` is called, then the skill no longer appears in the index. |
| AC-4 | Given a typical project with 20 rule files, 5 agents, and 3 skills, when any tool is called, then the index rebuild completes in under 100ms. |

---

## Functional Data Requirements

No persistent data storage in this phase. All data is held in-memory as TypeScript interfaces. The context index is rebuilt from the filesystem on each tool call — parsing frontmatter only. Full markdown bodies are read from disk on demand when a specific item is requested (e.g., `get_rule`, `get_active_rules`). This two-tier approach keeps the index fast while deferring the cost of reading large content bodies until they're actually needed.

### MDCRule (Index Entry — Frontmatter Only)

In-memory representation populated during index rebuild. The `content` field is **not populated** at index time — it is read from disk on demand when a tool needs the full body.

| Field | Type | Populated at | Description |
|-------|------|-------------|-------------|
| `filePath` | `string` | Index build | Absolute path to the file on disk |
| `name` | `string` | Index build | Derived from filename (strip extension, kebab-case) |
| `description` | `string` | Index build | From YAML frontmatter `description` field |
| `globs` | `string[]` | Index build | From frontmatter — single string normalized to array |
| `alwaysApply` | `boolean` | Index build | From frontmatter, default `false` |
| `mode` | `'always' \| 'auto' \| 'agent-requested' \| 'manual'` | Index build | Derived from `alwaysApply` and `globs` presence |
| `content` | `string \| null` | On demand | Markdown body below the `---` frontmatter delimiter. `null` until explicitly loaded. |

Mode derivation logic:
- `alwaysApply: true` -> `always`
- `alwaysApply: false` + globs present -> `auto`
- `alwaysApply: false` + no globs -> `agent-requested`
- No frontmatter at all -> `manual`

### CursorAgent (Index Entry — Frontmatter Only)

In-memory representation populated during index rebuild. The `instructions` field is **not populated** at index time.

| Field | Type | Populated at | Description |
|-------|------|-------------|-------------|
| `filePath` | `string` | Index build | Absolute path to the file on disk |
| `name` | `string` | Index build | From frontmatter or filename without `.md` |
| `description` | `string` | Index build | From frontmatter — required for discovery |
| `model` | `string` | Index build | `"inherit"` (default), `"fast"`, or specific model ID |
| `readonly` | `boolean` | Index build | Default `false` |
| `isBackground` | `boolean` | Index build | Default `false` |
| `instructions` | `string \| null` | On demand | Markdown body — the agent's system prompt. `null` until explicitly loaded. |

### CursorSkill (Index Entry — Frontmatter Only)

In-memory representation populated during index rebuild. The `instructions` field is **not populated** at index time. Supporting files are enumerated at index time (just directory listing, no content reads).

| Field | Type | Populated at | Description |
|-------|------|-------------|-------------|
| `filePath` | `string` | Index build | Absolute path to `SKILL.md` on disk |
| `directoryPath` | `string` | Index build | Parent directory absolute path |
| `name` | `string` | Index build | From frontmatter or directory name |
| `description` | `string` | Index build | From frontmatter — required for discovery |
| `metadata` | `{ author?: string; version?: string; license?: string }` | Index build | Optional metadata from frontmatter |
| `instructions` | `string \| null` | On demand | Markdown body. `null` until explicitly loaded. |
| `supportingFiles` | `string[]` | Index build | Relative paths to files in `scripts/`, `references/`, `assets/` subdirectories |

### ContextIndex

Top-level index holding all parsed context:

| Field | Type | Description |
|-------|------|-------------|
| `rules` | `Map<string, MDCRule>` | Keyed by rule name |
| `agents` | `Map<string, CursorAgent>` | Keyed by agent name |
| `skills` | `Map<string, CursorSkill>` | Keyed by skill name |
| `lastBuilt` | `number` | Epoch ms of last full index build |
| `workspaceRoot` | `string` | Absolute path to workspace root |

---

## API / Endpoint Specs

This is an MCP server using stdio transport. Instead of HTTP endpoints, the tool surface is defined as MCP tools. Each tool follows the MCP protocol's `tools/call` method with JSON input/output.

### `get_active_rules`

Returns rules that apply to a given set of files and/or task description. This is the primary routing tool — the AI calls it at session start or when switching file context.

**Input schema**:

```json
{
  "files": {
    "type": "array",
    "items": { "type": "string" },
    "description": "File paths relative to workspace root currently being worked on"
  },
  "task_description": {
    "type": "string",
    "description": "Optional description of the current task for agent-requested rule matching"
  }
}
```

**Success response**:

```json
{
  "rules": [
    {
      "name": "main-overview",
      "description": "Complete system overview and conventions",
      "mode": "always",
      "content": "# Main Overview\n\nThis project uses..."
    },
    {
      "name": "component-patterns",
      "description": "React component conventions for the design system",
      "mode": "auto",
      "matched_globs": ["src/components/**/*.tsx"],
      "content": "# Component Patterns\n\n..."
    }
  ],
  "total_rules_available": 8,
  "rules_returned": 2
}
```

**Error responses**:

| Condition | Error message |
|-----------|--------------|
| Both `files` and `task_description` are missing | `"At least one of 'files' or 'task_description' must be provided"` |
| No `.cursor/` directories found | `"No .cursor/ context directories found in workspace root"` |

**Internal flow**:

```
1. Rebuild frontmatter-only index from .cursor/ directories
2. Validate at least one of files or task_description is provided
3. Collect all rules where mode === 'always'
4. If files provided, for each rule where mode === 'auto':
   a. Test each file path against each of the rule's globs using minimatch
   b. If any match, add rule to result set with matched_globs
5. If task_description provided, for each rule where mode === 'agent-requested':
   a. Tokenize task_description and rule.description into lowercase words
   b. Compute Jaccard similarity (intersection / union of word sets)
   c. If similarity >= 0.15 threshold, include rule
6. Deduplicate result set by rule name
7. For each matched rule, read full markdown body from disk
8. Return rules array with total_rules_available count
```

### `get_context_index`

Returns a lightweight discovery menu of all available context items. No content or instructions are included — just enough for the AI to decide what to load.

**Input schema**:

```json
{
  "types": {
    "type": "array",
    "items": { "type": "string", "enum": ["rule", "agent", "skill"] },
    "description": "Which context types to include. Defaults to all three if omitted."
  }
}
```

**Success response**:

```json
{
  "rules": [
    {
      "name": "main-overview",
      "description": "Complete system overview",
      "mode": "always",
      "globs": ["**/*"]
    }
  ],
  "agents": [
    {
      "name": "security-auditor",
      "description": "Reviews API endpoints for security vulnerabilities",
      "model": "inherit",
      "readonly": true,
      "is_background": true
    }
  ],
  "skills": [
    {
      "name": "pdf-processing",
      "description": "Extract text and tables from PDF files",
      "has_scripts": true,
      "has_references": true
    }
  ]
}
```

**Internal flow**:

```
1. Rebuild frontmatter-only index from .cursor/ directories
2. Default types to ["rule", "agent", "skill"] if not provided
3. For each requested type, iterate the corresponding map in ContextIndex
4. Project each item to its summary shape (no content/instructions)
5. Return grouped by type
```

### `get_rule`

Fetches full content of a specific rule by name.

**Input schema**:

```json
{
  "name": {
    "type": "string",
    "description": "Rule name (as shown in get_context_index)"
  }
}
```

**Success response**:

```json
{
  "name": "data-models-relationships",
  "description": "Complete documentation of core data models and their relationships",
  "content": "# Data Models & Relationships\n\n..."
}
```

**Error responses**:

| Condition | Error message |
|-----------|--------------|
| Rule not found | `"Rule 'foo' not found. Available rules: main-overview, data-models, ..."` |

**Internal flow**:

```
1. Rebuild frontmatter-only index from .cursor/ directories
2. Look up name in ContextIndex.rules
3. If not found, return error with available rule names
4. Read full markdown body from disk
5. Return name, description, and full content
```

### `get_agent`

Fetches full definition of a Cursor agent by name.

**Input schema**:

```json
{
  "name": {
    "type": "string",
    "description": "Agent name (as shown in get_context_index)"
  }
}
```

**Success response**:

```json
{
  "name": "security-auditor",
  "description": "Reviews API endpoints for security vulnerabilities",
  "model": "inherit",
  "readonly": true,
  "is_background": true,
  "instructions": "You are a security specialist...\n\n..."
}
```

**Error responses**:

| Condition | Error message |
|-----------|--------------|
| Agent not found | `"Agent 'foo' not found. Available agents: security-auditor, ..."` |

**Internal flow**:

```
1. Rebuild frontmatter-only index from .cursor/ directories
2. Look up name in ContextIndex.agents
3. If not found, return error with available agent names
4. Read full markdown body (instructions) from disk
5. Return full agent definition including instructions
```

### `get_skill`

Fetches full content of a skill package.

**Input schema**:

```json
{
  "name": {
    "type": "string",
    "description": "Skill name (as shown in get_context_index)"
  },
  "include_supporting_files": {
    "type": "boolean",
    "default": false,
    "description": "If true, include supporting file paths in the response"
  }
}
```

**Success response**:

```json
{
  "name": "pdf-processing",
  "description": "Extract text and tables from PDF files",
  "metadata": { "author": "example-org", "version": "1.0" },
  "instructions": "# PDF Processing\n\n## When to Use\n...",
  "supporting_files": ["scripts/extract-text.py", "references/pdf-form-fields.md"]
}
```

**Error responses**:

| Condition | Error message |
|-----------|--------------|
| Skill not found | `"Skill 'foo' not found. Available skills: pdf-processing, ..."` |

**Internal flow**:

```
1. Rebuild frontmatter-only index from .cursor/ directories
2. Look up name in ContextIndex.skills
3. If not found, return error with available skill names
4. Read full markdown body (instructions) from disk
5. Return full skill definition
6. If include_supporting_files is false, omit supporting_files array
```

### `get_skill_file`

Fetches a specific supporting file from within a skill directory.

**Input schema**:

```json
{
  "skill_name": {
    "type": "string",
    "description": "Name of the parent skill"
  },
  "file_path": {
    "type": "string",
    "description": "Relative path within the skill directory (e.g., 'scripts/extract-text.py')"
  }
}
```

**Success response**:

```json
{
  "skill_name": "pdf-processing",
  "file_path": "scripts/extract-text.py",
  "content": "#!/usr/bin/env python3\nimport PyPDF2\n..."
}
```

**Error responses**:

| Condition | Error message |
|-----------|--------------|
| Skill not found | `"Skill 'foo' not found."` |
| File not found | `"File 'bar.py' not found in skill 'foo'. Available files: ..."` |
| Path traversal detected | `"Invalid file path: must be within the skill directory"` |

**Internal flow**:

```
1. Rebuild frontmatter-only index from .cursor/ directories
2. Look up skill_name in ContextIndex.skills
3. If not found, return error
4. Resolve file_path relative to skill's directoryPath
4. Verify resolved path is within the skill directory (prevent path traversal)
5. Verify file_path is in skill's supportingFiles list
6. Read file content from disk
7. Return content
```

---

## UI/UX Description

No frontend changes in this phase. This is a headless MCP server with stdio transport.

---

## Technical Considerations

### YAML Frontmatter Parsing Strategy

The server parses three different file formats that all use YAML frontmatter delimited by `---`. Rather than pulling in a full markdown processor, use the `yaml` npm package to parse only the frontmatter block. The parser operates in two modes:

1. **Frontmatter-only mode** (used during index rebuild): Read the file line-by-line. Once the opening `---` is found, accumulate lines until the closing `---`. Parse that block as YAML and stop — do not read the rest of the file. This keeps index rebuilds fast regardless of how large the markdown bodies are.

2. **Full-read mode** (used on demand by `get_rule`, `get_agent`, etc.): Read the entire file. Split on the first two `---` occurrences: everything between them is YAML, everything after is the markdown body.

Handle the case where no frontmatter exists (no `---` at start of file) by treating the entire file as content with no metadata.

### Glob Matching with `minimatch`

Use `minimatch` with `{ matchBase: false, dot: false }` options. File paths provided by the caller should be relative to the workspace root. Normalize path separators to forward slashes before matching (Windows compatibility). The `globs` frontmatter field can be a single string or a YAML array — normalize to `string[]` during parsing.

### Description-Based Matching for Agent-Requested Rules

The brief mentions scoring `agent-requested` rules by "description relevance" but explicitly avoids AI calls. Implement a simple Jaccard similarity on tokenized words: lowercase both the rule description and task description, split on whitespace and punctuation, compute `|intersection| / |union|`, include if >= 0.15. This is intentionally simple — a more sophisticated approach would require an embedding model, which violates the "no AI calls" constraint.

### Rebuild-on-Call Freshness Strategy

Instead of file watching (which is unreliable across platforms — particularly `fs.watch` on Windows and networked filesystems), rebuild the frontmatter-only index from disk on each tool call. This is the simplest correct approach: the server reads `.cursor/` directories, parses only YAML frontmatter from each file, and builds the index. For a typical project (20 rules, 5 agents, 3 skills), this takes <50ms since only the frontmatter block is parsed — not the full markdown body. Full content is read on demand only when tools like `get_rule` or `get_active_rules` need it. This eliminates the entire class of stale-cache bugs and removes any dependency on `chokidar` or platform-specific file watchers.

### Path Traversal Prevention in `get_skill_file`

When resolving `file_path` within a skill directory, use `path.resolve()` and verify the resolved absolute path starts with the skill's absolute directory path. This prevents `../../etc/passwd` style attacks. This is critical even though the server runs locally — the MCP protocol can be exposed to untrusted tool inputs.

### Security

- **No network access**: The server makes zero outbound network calls. All data is read from the local filesystem.
- **No code execution**: Supporting files from skills are served as text content only — never executed.
- **Path validation**: All file reads are constrained to the workspace root and configured context directories.
- **Input validation**: Tool inputs are validated against their JSON schemas before processing.

---

## Dependencies

| Dependency | Phase | Status |
|------------|-------|--------|
| `@modelcontextprotocol/sdk` | npm | Available — MCP server framework |
| `minimatch` | npm | Available — glob pattern matching |
| `yaml` | npm | Available — YAML frontmatter parsing |
| `.cursor/rules/` directory | Workspace | Available — user-created Cursor rules |
| `.cursor/agents/` directory | Workspace | Available — user-created Cursor agents |
| `.cursor/skills/` directory | Workspace | Available — user-created Cursor skills |

---

## Risks and Open Questions

| # | Item | Impact | Mitigation |
|---|------|--------|------------|
| R-1 | Large `.cursor/rules/` directories (50+ rule files) could add latency to each tool call due to rebuild-on-call | Tool response time degrades as context directory grows | Mitigated by frontmatter-only indexing — only YAML headers are parsed per call, not full markdown bodies. Full content is read on demand. If latency becomes measurable, add mtime-based caching as a future optimization. |
| R-2 | Jaccard similarity for description matching may produce false positives or miss relevant rules | Agent-requested rules are incorrectly included or excluded | Accept risk; threshold of 0.15 is conservative. Users can always browse via `get_context_index` and load explicitly via `get_rule`. |
| Q-1 | Should `get_active_rules` accept an empty call (no files, no task_description) and return only always-apply rules? | Determines whether the tool requires at least one input parameter | Decided: require at least one of `files` or `task_description`. Always-apply rules are included in every response regardless, so an empty call adds no value beyond `get_context_index`. |
| Q-2 | Should the server support both `.mdc` extension and `RULE.md` in subdirectory format simultaneously? | Cursor is transitioning formats — some projects use both | Decided: support both. Scan for `*.mdc` files directly in the rules directory AND `*/RULE.md` files in subdirectories. Both are normalized to the same `MDCRule` interface. |
| Q-3 | Should `readonly` and `isBackground` agent fields be enforced or advisory when served to Claude Code? | Determines whether the bridge actively constrains behavior or just provides metadata | Decided: advisory. The bridge serves definitions — enforcement is the consuming tool's responsibility. Include the fields in the response so the AI can choose to respect them. |
