import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { buildIndex } from './index/context-index.js';
import { getActiveRules } from './router/context-router.js';
import type { ContextIndex } from './types/index.js';
import { parseFullFile } from './parser/frontmatter.js';

export function createServer(workspaceRoot: string) {
  const server = new McpServer({
    name: 'cursor-bridge',
    version: '0.1.0',
  });

  async function rebuildIndex(): Promise<ContextIndex> {
    const config = await loadConfig(workspaceRoot);
    return buildIndex(workspaceRoot, config);
  }

  // get_active_rules
  server.tool(
    'get_active_rules',
    'Returns rules that apply to a given set of files and/or task description. Call at session start or when switching file context.',
    {
      files: z.array(z.string()).optional().describe('File paths relative to workspace root'),
      task_description: z.string().optional().describe('Description of the current task for agent-requested rule matching'),
    },
    async ({ files, task_description }) => {
      if (!files?.length && !task_description) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: "At least one of 'files' or 'task_description' must be provided" }) }],
          isError: true,
        };
      }
      const index = await rebuildIndex();
      const result = await getActiveRules(index, files, task_description);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // get_context_index
  server.tool(
    'get_context_index',
    'Returns a lightweight menu of all available context — rules, agents, and skills — with descriptions only, no content.',
    {
      types: z.array(z.enum(['rule', 'agent', 'skill'])).optional().describe('Which context types to include. Defaults to all three.'),
    },
    async ({ types }) => {
      const index = await rebuildIndex();
      const requestedTypes = types ?? ['rule', 'agent', 'skill'];
      const result: Record<string, unknown[]> = {};

      if (requestedTypes.includes('rule')) {
        result.rules = Array.from(index.rules.values()).map((r) => ({
          name: r.name,
          description: r.description,
          mode: r.mode,
          globs: r.globs,
        }));
      }

      if (requestedTypes.includes('agent')) {
        result.agents = Array.from(index.agents.values()).map((a) => ({
          name: a.name,
          description: a.description,
          model: a.model,
          readonly: a.readonly,
          is_background: a.isBackground,
        }));
      }

      if (requestedTypes.includes('skill')) {
        result.skills = Array.from(index.skills.values()).map((s) => ({
          name: s.name,
          description: s.description,
          supporting_files: s.supportingFiles,
        }));
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // get_rule
  server.tool(
    'get_rule',
    'Fetches the full content of a specific rule by name.',
    {
      name: z.string().describe('Rule name (as shown in get_context_index)'),
    },
    async ({ name }) => {
      const index = await rebuildIndex();
      const rule = index.rules.get(name);
      if (!rule) {
        const available = Array.from(index.rules.keys()).join(', ');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Rule '${name}' not found. Available rules: ${available}` }) }],
          isError: true,
        };
      }
      const { content } = await parseFullFile(rule.filePath);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ name: rule.name, description: rule.description, content }, null, 2),
        }],
      };
    }
  );

  // get_agent
  server.tool(
    'get_agent',
    'Fetches the full definition of a Cursor agent by name.',
    {
      name: z.string().describe('Agent name (as shown in get_context_index)'),
    },
    async ({ name }) => {
      const index = await rebuildIndex();
      const agent = index.agents.get(name);
      if (!agent) {
        const available = Array.from(index.agents.keys()).join(', ');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Agent '${name}' not found. Available agents: ${available}` }) }],
          isError: true,
        };
      }
      const { content } = await parseFullFile(agent.filePath);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            name: agent.name,
            description: agent.description,
            model: agent.model,
            readonly: agent.readonly,
            is_background: agent.isBackground,
            instructions: content,
          }, null, 2),
        }],
      };
    }
  );

  // get_skill
  server.tool(
    'get_skill',
    'Fetches the full content of a skill package.',
    {
      name: z.string().describe('Skill name (as shown in get_context_index)'),
      include_supporting_files: z.boolean().optional().default(false).describe('If true, include supporting file paths'),
    },
    async ({ name, include_supporting_files }) => {
      const index = await rebuildIndex();
      const skill = index.skills.get(name);
      if (!skill) {
        const available = Array.from(index.skills.keys()).join(', ');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Skill '${name}' not found. Available skills: ${available}` }) }],
          isError: true,
        };
      }
      const { content } = await parseFullFile(skill.filePath);
      const result: Record<string, unknown> = {
        name: skill.name,
        description: skill.description,
        metadata: skill.metadata,
        instructions: content,
      };
      if (include_supporting_files) {
        result.supporting_files = skill.supportingFiles;
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // get_skill_file
  server.tool(
    'get_skill_file',
    'Fetches a specific supporting file from within a skill directory.',
    {
      skill_name: z.string().describe('Name of the parent skill'),
      file_path: z.string().describe("Relative path within the skill directory (e.g., 'scripts/extract-text.py')"),
    },
    async ({ skill_name, file_path }) => {
      const index = await rebuildIndex();
      const skill = index.skills.get(skill_name);
      if (!skill) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Skill '${skill_name}' not found.` }) }],
          isError: true,
        };
      }

      // Path traversal prevention
      const path = await import('path');
      const resolved = path.resolve(skill.directoryPath, file_path);
      if (!resolved.startsWith(skill.directoryPath)) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Invalid file path: must be within the skill directory' }) }],
          isError: true,
        };
      }

      // Normalize for comparison
      const normalizedFilePath = file_path.replace(/\\/g, '/');
      if (!skill.supportingFiles.includes(normalizedFilePath)) {
        const available = skill.supportingFiles.join(', ');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `File '${file_path}' not found in skill '${skill_name}'. Available files: ${available}` }) }],
          isError: true,
        };
      }

      const fs = await import('fs/promises');
      try {
        const fileContent = await fs.readFile(resolved, 'utf-8');
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ skill_name, file_path: normalizedFilePath, content: fileContent }, null, 2),
          }],
        };
      } catch {
        const available = skill.supportingFiles.join(', ');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `File '${file_path}' not found in skill '${skill_name}'. Available files: ${available}` }) }],
          isError: true,
        };
      }
    }
  );

  return server;
}
