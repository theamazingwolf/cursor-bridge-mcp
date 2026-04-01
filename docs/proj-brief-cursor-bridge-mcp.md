# Cursor Bridge MCP — Product Requirements Document

## Overview

Cursor Bridge is a local MCP server that gives Claude Code (and any MCP-compatible AI tool) native understanding of Cursor's context ecosystem — rules, agents, and skills. It parses `.cursor/rules/`, `.cursor/agents/`, and `.cursor/skills/`, applies Cursor's activation logic (glob matching, always-apply, description-based discovery), and serves the right context to any AI tool on demand.

For teams where some developers use Cursor and others use Claude Code, Cursor Bridge makes a single set of context files work for everyone.

## Problem Statement

Cursor has built a sophisticated three-layer context system — rules for conventions, agents for specialized delegation, and skills for on-demand knowledge. But all three only work within Cursor's native AI. Claude Code ignores `.cursor/` entirely, reading only `CLAUDE.md`.

Teams using both tools face a choice: maintain parallel context systems that drift apart, or pick one tool and lose the other's strengths. Cursor Bridge eliminates this by making Cursor's context files consumable by any MCP-compatible AI tool.

## Solution

A local MCP server (stdio transport) that:

1. **Reads** all three Cursor context types — rules (`.cursor/rules/`), agents (`.cursor/agents/`), and skills (`.cursor/skills/`)
2. **Routes** rules intelligently — applying Cursor's activation logic (always-apply, glob matching, description-based discovery)
3. **Serves** agents and skills on-demand — making their definitions available as loadable instructions when the AI identifies a task match
4. **Optionally bridges** context docs from Censi (the companion context engine) into `.cursor/rules/` as `.mdc` files for native Cursor consumption

## Architecture

### Transport

- **stdio** — spawned by the AI tool on session start, no persistent server process
- Configured in the tool's MCP settings, pointing to a Node entry script

### Runtime

- **Node.js / TypeScript**
- Zero external dependencies beyond `minimatch` for glob matching and `yaml` for frontmatter parsing
- No AI calls, no network access — pure local file parsing and routing logic
- Lightweight and fast — should add negligible startup time

### Directory Structure

```
cursor-bridge-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # MCP server entry point (stdio)
│   ├── server.ts                # MCP server setup and tool registration
│   ├── parser/
│   │   ├── frontmatter.ts       # Shared YAML frontmatter extraction
│   │   ├── rule-parser.ts       # Parse .cursor/rules/ (.mdc / RULE.md)
│   │   ├── agent-parser.ts      # Parse .cursor/agents/*.md
│   │   └── skill-parser.ts      # Parse .cursor/skills/*/SKILL.md
│   ├── index/
│   │   ├── context-index.ts     # Unified index across rules, agents, skills
│   │   └── file-watcher.ts      # Watch all .cursor/ subdirectories for changes
│   ├── router/
│   │   ├── context-router.ts    # Match context items to active files/task
│   │   ├── glob-matcher.ts      # Glob pattern matching (minimatch)
│   │   └── item-selector.ts     # Apply activation mode logic across all types
│   ├── bridge/
│   │   ├── censi-adapter.ts     # Read Censi output and convert to .mdc
│   │   └── mdc-writer.ts        # Write .mdc files with Cursor-compatible frontmatter
│   └── types/
│       └── index.ts             # Shared type definitions
└── README.md
```

## Data Model

### MDCRule

```typescript
interface MDCRule {
  /** File path relative to workspace root */
  filePath: string

  /** Rule name derived from filename */
  name: string

  /** Human-readable description from frontmatter */
  description: string

  /** Glob patterns for auto-attach behavior */
  globs: string[]

  /** If true, always injected regardless of context */
  alwaysApply: boolean

  /** Activation mode */
  mode: 'always' | 'auto' | 'agent-requested' | 'manual'

  /** The markdown body below the frontmatter */
  content: string

  /** File last-modified timestamp for cache invalidation */
  lastModified: number
}
```

### CursorAgent

```typescript
interface CursorAgent {
  /** File path relative to workspace root */
  filePath: string

  /** Agent name from frontmatter (or derived from filename) */
  name: string

  /** Description — read by the main agent to decide when to delegate */
  description: string

  /** Model preference: 'inherit', 'fast', or a specific model ID */
  model: string

  /** If true, agent cannot modify files — read-only analysis/audit */
  readonly: boolean

  /** If true, runs in background without blocking the main agent */
  isBackground: boolean

  /** The markdown body — system prompt / instructions for the subagent */
  instructions: string

  /** File last-modified timestamp */
  lastModified: number
}
```

### CursorSkill

```typescript
interface CursorSkill {
  /** File path relative to workspace root (path to SKILL.md) */
  filePath: string

  /** Skill directory path (parent of SKILL.md) */
  directoryPath: string

  /** Skill name from frontmatter (or derived from directory name) */
  name: string

  /** Description — used by agents to decide when to activate */
  description: string

  /** Optional metadata: author, version, license */
  metadata: {
    author?: string
    version?: string
    license?: string
  }

  /** The markdown body — instructions, guidelines, examples */
  instructions: string

  /** Paths to supporting files (scripts/, references/, assets/) */
  supportingFiles: string[]

  /** File last-modified timestamp */
  lastModified: number
}
```

### ContextIndex

```typescript
interface ContextIndex {
  /** All parsed rules, keyed by name */
  rules: Map<string, MDCRule>

  /** All parsed agents, keyed by name */
  agents: Map<string, CursorAgent>

  /** All parsed skills, keyed by name */
  skills: Map<string, CursorSkill>

  /** Timestamp of last index build */
  lastBuilt: number

  /** Workspace root path */
  workspaceRoot: string
}
```

## MCP Tool Surface

### `get_active_rules`

Returns the rules that apply to a given set of files or task description.

**Input:**
```json
{
  "files": ["src/referrals/matching.ts", "src/referrals/rewards.ts"],
  "task_description": "Updating the referral matching algorithm"
}
```

**Behavior:**
1. Return all rules where `alwaysApply: true`
2. Match provided file paths against each rule's glob patterns — return matches
3. If `task_description` provided, score `agent-requested` rules by description relevance and include high-confidence matches
4. Return the combined set, deduplicated

**Output:**
```json
{
  "rules": [
    {
      "name": "main-overview",
      "description": "Complete system overview...",
      "mode": "always",
      "content": "# Main Overview\n\n..."
    },
    {
      "name": "referral-system-architecture",
      "description": "Referral state machine, matching...",
      "mode": "auto",
      "matched_globs": ["src/referrals/**"],
      "content": "# Referral System Architecture\n\n..."
    }
  ],
  "total_rules_available": 5,
  "rules_returned": 2
}
```

### `get_context_index`

Returns a lightweight menu of all available context — rules, agents, and skills — with descriptions only, no content.

**Input:**
```json
{
  "types": ["rule", "agent", "skill"]
}
```

**Output:**
```json
{
  "rules": [
    {
      "name": "main-overview",
      "description": "Complete system overview...",
      "mode": "always",
      "globs": ["**/*"]
    }
  ],
  "agents": [
    {
      "name": "security-auditor",
      "description": "Reviews API endpoints for security vulnerabilities...",
      "model": "inherit",
      "readonly": true,
      "is_background": true
    }
  ],
  "skills": [
    {
      "name": "pdf-processing",
      "description": "Extract text and tables from PDF files...",
      "has_scripts": true,
      "has_references": true
    }
  ]
}
```

### `get_rule`

Fetches the full content of a specific rule by name.

**Input:**
```json
{
  "name": "data-models-relationships"
}
```

**Output:**
```json
{
  "name": "data-models-relationships",
  "description": "Complete documentation of core data models...",
  "content": "# Data Models & Relationships\n\n..."
}
```

### `get_agent`

Fetches the full definition of a Cursor agent. When called from Claude Code, the instructions provide the same behavioral guidance that Cursor would use when delegating to this subagent.

**Input:**
```json
{
  "name": "security-auditor"
}
```

**Output:**
```json
{
  "name": "security-auditor",
  "description": "Reviews API endpoints for security vulnerabilities...",
  "model": "inherit",
  "readonly": true,
  "is_background": true,
  "instructions": "You are a security specialist...\n\nWhen invoked:\n1. Scan all new or modified route handlers...\n2. Check authentication middleware...\n3. Review database query patterns..."
}
```

**Usage in Claude Code:** The AI reads agent definitions as role instructions. When a task matches an agent's description, Claude Code can adopt that agent's instructions — effectively simulating Cursor's subagent delegation within a single session.

### `get_skill`

Fetches the full content of a skill package.

**Input:**
```json
{
  "name": "pdf-processing",
  "include_supporting_files": false
}
```

**Output:**
```json
{
  "name": "pdf-processing",
  "description": "Extract text and tables from PDF files...",
  "metadata": { "author": "example-org", "version": "1.0" },
  "instructions": "# PDF Processing\n\n## When to Use\n...",
  "supporting_files": ["scripts/extract-text.py", "references/pdf-form-fields.md"]
}
```

### `get_skill_file`

Fetches a specific supporting file from within a skill directory.

**Input:**
```json
{
  "skill_name": "pdf-processing",
  "file_path": "scripts/extract-text.py"
}
```

**Output:**
```json
{
  "skill_name": "pdf-processing",
  "file_path": "scripts/extract-text.py",
  "content": "#!/usr/bin/env python3\nimport PyPDF2\n..."
}
```

### `sync_from_censi`

Reads context docs from Censi's output directory and converts them to `.mdc` files in `.cursor/rules/` for native Cursor consumption. Only syncs docs that have `generated: true` in their frontmatter.

**Input:**
```json
{
  "censi_output_dir": "context",
  "target_dir": ".cursor/rules",
  "dry_run": false
}
```

**Output:**
```json
{
  "synced": [
    {
      "source": "context/referral-system.md",
      "target": ".cursor/rules/referral-system.mdc",
      "action": "updated"
    }
  ],
  "skipped": [
    {
      "source": "context/main-overview.md",
      "reason": "unchanged"
    }
  ]
}
```

## Rule Parsing Logic

### Frontmatter Format

Standard `.mdc` / `RULE.md` file structure:

```markdown
---
description: "Human-readable description of what this rule covers"
globs: "src/components/**/*.tsx"
alwaysApply: false
---

# Rule Title

Markdown body content with conventions, patterns, architecture docs, etc.
```

### Parsing Rules

1. Frontmatter is delimited by `---` on its own line
2. `globs` can be a single string or an array of strings
3. `alwaysApply: true` implies `mode: always`
4. If `globs` are present and `alwaysApply` is false, `mode` defaults to `auto`
5. If no `globs` and `alwaysApply` is false, `mode` defaults to `agent-requested`
6. If no frontmatter exists, treat as a plain markdown file with `mode: manual`

### Activation Mode Determination

```
alwaysApply: true                          → mode: always
alwaysApply: false + globs present         → mode: auto
alwaysApply: false + no globs              → mode: agent-requested
no frontmatter                             → mode: manual
```

## Agent Parsing Logic

### File Location & Format

Agents live as individual `.md` files in `.cursor/agents/` (project) or `~/.cursor/agents/` (global).

### Frontmatter Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | filename | Unique identifier |
| `description` | string | required | Main agent reads this to decide when to delegate |
| `model` | string | `"inherit"` | `"inherit"`, `"fast"`, or specific model ID |
| `readonly` | boolean | `false` | If true, read-only analysis only |
| `is_background` | boolean | `false` | If true, runs in parallel |

### Parsing Rules

1. `name` defaults to filename without extension
2. Markdown body becomes the agent's system prompt / instructions
3. All agents are on-demand — never auto-injected
4. If no frontmatter, treat entire file as instructions

### Behavior in Claude Code

Context Bridge does not replicate Cursor's subagent execution model (parallel workers, git worktrees, isolated context). It makes agent definitions available as loadable role instructions that Claude Code can adopt for task-specific behavioral guidance.

## Skill Parsing Logic

### File Location & Format

Skills are directories under `.cursor/skills/` (project) or `~/.cursor/skills/` (global), each containing a `SKILL.md` plus optional `scripts/`, `references/`, and `assets/` subdirectories.

### Frontmatter Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | directory name | Must match parent directory name |
| `description` | string | required | Used by agents to decide when to activate |
| `license` | string | optional | License name or path |
| `metadata` | object | optional | Author, version, tags, etc. |

### Three-Level Loading

1. **Discovery** — `get_context_index` returns skill name + description only
2. **Activation** — `get_skill` loads the full SKILL.md instructions
3. **Deep reference** — `get_skill_file` loads individual supporting files on demand

## Context Routing Algorithm

When `get_active_rules` is called:

```
1. ALWAYS rules → include immediately
2. AUTO rules → for each rule:
   a. Match glob patterns against input files using minimatch
   b. If any match → include rule
3. AGENT-REQUESTED rules → for each rule:
   a. If task_description provided → score against rule description
   b. If score above threshold → include rule
   c. Otherwise → skip (available via get_context_index)
4. MANUAL rules → never auto-included
5. Deduplicate by name
6. Return combined set
```

Agents and skills are always on-demand — never auto-injected. The AI browses the index and loads what it needs.

## Configuration

### `.cursor-bridge/config.yaml`

```yaml
# Cursor context directories
rules_directory: ".cursor/rules"
agents_directory: ".cursor/agents"
skills_directory: ".cursor/skills"

# Scan user-level (global) directories
scan_user_directories: true

# Censi integration (optional)
censi:
  enabled: true
  output_directory: "context"
  auto_sync_to_cursor: false
```

## Integration Points

### Claude Code

```json
{
  "mcpServers": {
    "cursor-bridge": {
      "command": "npx",
      "args": ["cursor-bridge-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "cursor-bridge": {
      "command": "npx",
      "args": ["cursor-bridge-mcp"],
      "cwd": "."
    }
  }
}
```

### Running Both with Censi

When paired with Censi, the typical MCP config includes both:

```json
{
  "mcpServers": {
    "censi": {
      "command": "npx",
      "args": ["censi-mcp"],
      "cwd": "${workspaceFolder}"
    },
    "cursor-bridge": {
      "command": "npx",
      "args": ["cursor-bridge-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Censi handles code analysis and context generation. Cursor Bridge handles Cursor-specific context routing and format translation. The SaaS Build plugin orchestrates both.

## Gitignore Recommendations

```gitignore
# DO commit these:
# .cursor/rules/*.mdc
# .cursor/rules/*/RULE.md
# .cursor/agents/*.md
# .cursor/skills/*/SKILL.md
# .cursor-bridge/config.yaml
```

## Future Considerations

- **Bidirectional sync** — when context is created via Claude Code, auto-place in correct `.cursor/` directory
- **Agent composition** — for tasks matching multiple agent descriptions, compose a combined instruction set
- **AGENTS.md support** — parse the open `AGENTS.md` format alongside Cursor-specific formats
- **Rule templates** — starter `.mdc` templates for common stacks
- **VS Code Extension wrapper** — status bar showing active rules, command palette for context queries
- **Cursor team rules** — support Cursor's team rules if accessible via local config

## Open Questions

1. **Agent behavioral fidelity** — should `readonly: true` be enforced (refuse to edit files) or advisory?

2. **Skill script execution** — should the bridge allow Claude Code to execute scripts from a skill's `scripts/` directory, or just provide content? Providing content is the safe default.

3. **Global vs. project precedence** — when the same name exists in both `~/.cursor/` and `.cursor/`, project-scoped wins (matching Cursor's behavior).

4. **Censi auto-discovery** — should Cursor Bridge automatically detect Censi's output directory, or require explicit config? Auto-discovery via checking for `.censi/config.yaml` seems cleanest.

5. **Format evolution** — Cursor recently moved from `.mdc` files to `RULE.md` in folder structures. The bridge should support both and normalize to a common internal model. Monitor Cursor's docs for further format changes.
