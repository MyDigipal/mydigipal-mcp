#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import dotenv from 'dotenv';
import n8nModule from './modules/N8N.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const IS_RENDER = process.env.RENDER || process.env.NODE_ENV === 'production';

// Créer le serveur MCP
const server = new Server(
  { name: 'mydigipal-mcp', version: '1.0.0' },
  { capabilities: { tools: { listTools: true, callTool: true } } }
);

const modules = { n8n: n8nModule };

function getAllTools() {
  const allTools = [];
  Object.entries(modules).forEach(([moduleName, module]) => {
    if (module && module.getTools) {
      const moduleTools = module.getTools();
      moduleTools.forEach(tool => {
        tool.name = `${moduleName}:${tool.name}`;
        allTools.push(tool);
      });
    }
  });
  return allTools;
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: getAllTools(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const [moduleName, actionName] = name.split(':');
    if (!moduleName || !actionName) {
      throw new McpError(ErrorCode.InvalidParams, `Format d'outil invalide: ${name}`);
    }
    const module = modules[moduleName];
    if (!module) {
      throw new McpError(ErrorCode.MethodNotFound, `Module inconnu: ${moduleName}`);
    }
    return await module.handleTool(actionName, args);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Erreur: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  if (IS_RENDER) {
    // Mode Render : HTTP + WebSocket pour MCP
    const app = express();
    app.use(express.json());
    
    app.get('/', (req, res) => {
      res.json({ 
        service: 'MyDigiPal MCP Server',
        version: '1.0.0',
        mcp_endpoint: '/mcp',
        tools_count: getAllTools().length,
      });
    });

    // NOUVEAU : Endpoint MCP-over-HTTP
    app.post('/mcp', async (req, res) => {
      try {
        const { method, params } = req.body;
        
        if (method === 'tools/list') {
          const result = await server._requestHandlers.get('tools/list')();
          res.json(result);
        } else if (method === 'tools/call') {
          const result = await server._requestHandlers.get('tools/call')({ params });
          res.json(result);
        } else {
          res.status(404).json({ error: 'Method not found' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.error(`MyDigiPal MCP Server HTTP en écoute sur le port ${PORT}`);
    });
    
  } else {
    // Mode local : stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((error) => {
  console.error('Erreur lors du démarrage:', error);
  process.exit(1);
});
