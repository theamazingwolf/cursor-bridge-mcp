#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const workspaceRoot = process.cwd();
  const server = createServer(workspaceRoot);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cursor Bridge MCP server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
