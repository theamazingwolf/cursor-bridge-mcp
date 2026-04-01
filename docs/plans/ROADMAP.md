# ROADMAP

## Phases

| Phase | Feature | Status | PRD |
|-------|---------|--------|-----|
| 1 | Core Server and Context Routing | Planned | [01-core-server-and-context-routing.md](../../tasks/01-core-server-and-context-routing.md) |
| 2 | Censi Bridge Sync | Planned | [02-censi-bridge-sync.md](../../tasks/02-censi-bridge-sync.md) |

## Phase Summaries

**Phase 1 — Core Server and Context Routing**
Builds the complete MCP server: stdio entry point, parsers for all three Cursor context types (rules, agents, skills), a frontmatter-only context index that rebuilds on each call, activation-mode routing with glob matching, and the full MCP tool surface (6 tools). No file watchers — every call reads fresh from disk. This phase delivers a fully functional bridge that makes Cursor's context ecosystem consumable by Claude Code.
*Key deliverables:* `index.ts`, `server.ts`, `rule-parser.ts`, `agent-parser.ts`, `skill-parser.ts`, `context-index.ts`, `context-router.ts`, `get_active_rules`, `get_context_index`, `get_rule`, `get_agent`, `get_skill`, `get_skill_file`.

**Phase 2 — Censi Bridge Sync**
Adds the optional Censi-to-Cursor bridge: reads generated context docs from Censi's output directory, strips Censi-specific frontmatter, and writes `.mdc` files to `.cursor/rules/` for native Cursor consumption. Includes dry-run mode and auto-detection of Censi's config.
*Key deliverables:* `censi-adapter.ts`, `mdc-writer.ts`, `sync_from_censi`.

## Dependency Graph

Phase 2 → Phase 1
