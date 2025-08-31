#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const RENDER_MCP_URL = 'https://mydigipal-mcp-server.onrender.com/mcp';

const server = new Server(
  { name: 'mydigipal-http-client', version: '1.0.0' },
  { capabilities: { tools: { listTools: true, callTool: true } } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const response = await axios.post(RENDER_MCP_URL, {
    method: 'tools/list'
  });
  return response.data;
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const response = await axios.post(RENDER_MCP_URL, {
    method: 'tools/call',
    params: request.params
  });
  return response.data;
});

const transport = new StdioServerTransport();
await server.connect(transport);
