# Cursor Bridge MCP

A local MCP server that gives Claude Code (and any MCP-compatible AI tool) native understanding of Cursor's context ecosystem — rules, agents, and skills.

## Why

Most teams aren't all-in on one AI tool. Some developers prefer Cursor, others use Claude Code, and some switch between both depending on the task. But Cursor's context system — rules, agents, and skills — only works inside Cursor. Claude Code ignores `.cursor/` entirely and reads only `CLAUDE.md`.

That leaves teams with a choice: maintain parallel context systems that drift apart, or pick one tool and lose the other's strengths. Cursor Bridge eliminates this by making Cursor's context files consumable by any MCP-compatible AI tool. Write your conventions once in `.cursor/rules/`, define your agents in `.cursor/agents/`, package your skills in `.cursor/skills/` — and every developer on the team gets the same context regardless of which tool they use.

## What It Does

Cursor Bridge reads `.cursor/rules/`, `.cursor/agents/`, and `.cursor/skills/`, applies Cursor's activation logic (glob matching, always-apply, description-based discovery), and serves the right context to any AI tool on demand.

- **Rules** are routed intelligently — always-apply rules inject automatically, glob-matched rules activate based on the files you're working on, and description-matched rules surface when the task is relevant
- **Agents** are served as loadable role instructions — when a task matches an agent's description, the AI can adopt that agent's behavioral guidance
- **Skills** are served as on-demand knowledge packages — the AI browses the index and loads what it needs, including supporting scripts and references

## Installation

### Option 1: Install from npm (once published)

```bash
npm install -g cursor-bridge-mcp
```

### Option 2: Install from GitHub

```bash
npm install -g github:theamazingwolf/cursor-bridge-mcp
```

### Option 3: Clone and build locally

```bash
git clone https://github.com/theamazingwolf/cursor-bridge-mcp.git
cd cursor-bridge-mcp
npm install
npm run build
npm link
```

## MCP Configuration

After installing, add Cursor Bridge to your AI tool's MCP config.

### Claude Code

Add to `.claude/settings.json` (global) or `.claude/settings.local.json` (project):

```json
{
  "mcpServers": {
    "cursor-bridge": {
      "command": "cursor-bridge-mcp"
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cursor-bridge": {
      "command": "cursor-bridge-mcp"
    }
  }
}
```

If you haven't installed globally, use the full path to the built entry point instead:

```json
{
  "mcpServers": {
    "cursor-bridge": {
      "command": "node",
      "args": ["/path/to/cursor-bridge-mcp/dist/index.js"]
    }
  }
}
```

## Tools

### `get_active_rules`

Returns rules that apply to your current files and/or task. This is the primary tool — call it when starting work or switching file context.

```json
{
  "files": ["src/components/Button.tsx"],
  "task_description": "Refactoring the button component"
}
```

Rules are matched by activation mode:
- **always** — `alwaysApply: true` rules are always included
- **auto** — rules with `globs` patterns are included when files match
- **agent-requested** — rules with no globs are included when the task description overlaps with the rule's description

### `get_context_index`

Returns a lightweight menu of all available rules, agents, and skills — descriptions only, no content. Use this to discover what's available.

```json
{
  "types": ["rule", "agent", "skill"]
}
```

### `get_rule`

Fetches the full content of a specific rule by name.

```json
{ "name": "data-models-relationships" }
```

### `get_agent`

Fetches the full definition of a Cursor agent — including its system prompt / instructions.

```json
{ "name": "security-auditor" }
```

### `get_skill`

Fetches the full content of a skill package.

```json
{
  "name": "pdf-processing",
  "include_supporting_files": true
}
```

### `get_skill_file`

Fetches a specific supporting file from within a skill directory.

```json
{
  "skill_name": "pdf-processing",
  "file_path": "scripts/extract-text.py"
}
```

## Usage with Claude Code

Add a `CLAUDE.md` to any project with a `.cursor/` directory to tell Claude Code to use the bridge automatically. Here's a template:

```markdown
## Cursor Bridge MCP

When the cursor-bridge MCP is connected, use it to read Cursor context files
instead of reading .cursor/ files directly.

- On session start, call `get_context_index` to discover available context
- When working on files, call `get_active_rules` with current file paths and/or
  a task description to get relevant rules with full content
- Use `get_rule`, `get_agent`, `get_skill` to load specific items by name
- Use `get_skill_file` to load supporting files from skill packages

The bridge applies Cursor's activation logic (glob matching, always-apply,
description relevance) so you get the right context automatically.
```

This way Claude Code knows to call the MCP tools rather than manually reading and interpreting `.cursor/` files. The bridge handles the routing logic — which rules apply, which don't — so the AI doesn't have to.

## Cursor Context Formats

### Rules (`.cursor/rules/`)

Standard `.mdc` or `RULE.md` files with YAML frontmatter:

```markdown
---
description: "React component conventions"
globs: "src/components/**/*.tsx"
alwaysApply: false
---

# Component Patterns

Your conventions here...
```

Both `.mdc` files directly in the rules directory and `RULE.md` files in subdirectories are supported.

### Agents (`.cursor/agents/`)

Markdown files with agent metadata in frontmatter:

```markdown
---
description: "Reviews code for security vulnerabilities"
model: inherit
readonly: true
is_background: true
---

You are a security specialist...
```

### Skills (`.cursor/skills/`)

Directory-based packages with a `SKILL.md` and optional `scripts/`, `references/`, `assets/` subdirectories:

```
.cursor/skills/pdf-processing/
├── SKILL.md
├── scripts/extract-text.py
└── references/form-fields.md
```

## Configuration

Optionally create `.cursor-bridge/config.yaml` to customize directory paths:

```yaml
rules_directory: ".cursor/rules"
agents_directory: ".cursor/agents"
skills_directory: ".cursor/skills"
```

All paths are relative to the workspace root. If no config file exists, the defaults above are used.

## How It Works

- **No file watchers** — the index rebuilds from disk on each tool call, parsing only YAML frontmatter (not full file content). This keeps every call fresh and avoids platform-specific reliability issues.
- **Lazy content loading** — full markdown bodies are only read when a tool specifically needs them (e.g., `get_rule`, `get_active_rules` for matched rules). The index itself never loads content.
- **No network access** — pure local file parsing. No AI calls, no external APIs.
- **No code execution** — skill scripts are served as text content, never executed.

## Development

```bash
npm install
npm run build
npm test
```
