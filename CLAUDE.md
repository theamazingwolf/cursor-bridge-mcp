# Claude Code Instructions

## Cursor Bridge MCP

This project includes a Cursor Bridge MCP server. When the `cursor-bridge` MCP is connected, use it to read Cursor context files instead of reading `.cursor/` files directly.

### On session start

Call `get_context_index` to discover available rules, agents, and skills.

### When working on files

Call `get_active_rules` with the files you're editing and/or a description of the current task. This returns only the rules that are relevant — always-apply rules, glob-matched rules, and description-matched rules — with full content.

### When you need specific context

- `get_rule` — load a specific rule by name
- `get_agent` — load an agent's full instructions by name
- `get_skill` — load a skill's instructions and optionally its supporting file list
- `get_skill_file` — load a specific supporting file from a skill

### Why use the bridge instead of reading files directly

The bridge applies Cursor's activation logic (glob matching, always-apply, description relevance) so you get the right context automatically rather than reading every file and deciding yourself.
