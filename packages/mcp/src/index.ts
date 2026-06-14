#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pathToFileURL } from 'node:url';
import { createApiClient } from './api-client.js';
import { createQuotaTools, type QuotaTool } from './tools.js';

export interface ServerConfig {
  baseUrl: string;
  token: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const baseUrl = env.QUOTA_API_URL?.trim();
  if (baseUrl === undefined || baseUrl === '') {
    throw new Error('QUOTA_API_URL is required');
  }

  const token = env.QUOTA_API_TOKEN?.trim();
  if (token === undefined || token === '') {
    throw new Error('QUOTA_API_TOKEN is required');
  }

  return { baseUrl, token };
}

export function createQuotaMcpServer(config: ServerConfig): McpServer {
  const server = new McpServer({
    name: 'quota-mcp',
    version: '0.1.0',
  });
  const api = createApiClient(config);
  const tools: QuotaTool[] = Object.values(createQuotaTools(api));

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (input: unknown) => tool.handler(input)
    );
  }

  return server;
}

export async function main(): Promise<void> {
  try {
    const server = createQuotaMcpServer(readConfig());
    await server.connect(new StdioServerTransport());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`quota-mcp: ${message}`);
    process.exit(1);
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
