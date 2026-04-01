import { describe, it, expect } from 'vitest';
import { parseAgentFrontmatter } from '../parser/agent-parser.js';
import path from 'path';

const fixtures = path.resolve(import.meta.dirname, 'fixtures/.cursor/agents');

describe('parseAgentFrontmatter', () => {
  it('parses agent with all fields', async () => {
    const agent = await parseAgentFrontmatter(path.join(fixtures, 'security-auditor.md'));
    expect(agent.name).toBe('security-auditor');
    expect(agent.description).toBe('Reviews API endpoints for security vulnerabilities');
    expect(agent.model).toBe('inherit');
    expect(agent.readonly).toBe(true);
    expect(agent.isBackground).toBe(true);
    expect(agent.instructions).toBeNull();
  });

  it('parses agent with minimal fields — defaults applied', async () => {
    const agent = await parseAgentFrontmatter(path.join(fixtures, 'code-reviewer.md'));
    expect(agent.name).toBe('code-reviewer'); // from filename
    expect(agent.description).toBe('Reviews code changes for quality and consistency');
    expect(agent.model).toBe('inherit'); // default
    expect(agent.readonly).toBe(false); // default
    expect(agent.isBackground).toBe(false); // default
  });
});
