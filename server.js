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

// Système de logs amélioré
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  console.error(logEntry);
  if (data) {
    console.error('Data:', JSON.stringify(data, null, 2));
  }
}

const PORT = process.env.PORT || 3000;
const IS_RENDER = process.env.RENDER || process.env.NODE_ENV === 'production';

log('info', 'MyDigiPal MCP Server démarrage...', {
  PORT,
  IS_RENDER,
  NODE_ENV: process.env.NODE_ENV,
  N8N_URL: process.env.N8N_URL,
  HAS_API_KEY: !!process.env.N8N_API_KEY
});

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
  log('debug', `Outils disponibles: ${allTools.length}`, allTools.map(t => t.name));
  return allTools;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('info', 'Requête ListTools reçue');
  const tools = getAllTools();
  log('info', `Retour de ${tools.length} outils`);
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  log('info', `Requête CallTool reçue: ${name}`, args);
  
  try {
    const [moduleName, actionName] = name.split(':');
    if (!moduleName || !actionName) {
      throw new McpError(ErrorCode.InvalidParams, `Format d'outil invalide: ${name}`);
    }
    
    const module = modules[moduleName];
    if (!module) {
      throw new McpError(ErrorCode.MethodNotFound, `Module inconnu: ${moduleName}`);
    }
    
    log('info', `Appel ${moduleName}.${actionName}`);
    const result = await module.handleTool(actionName, args);
    log('info', `Succès ${name}`, { resultType: typeof result });
    return result;

  } catch (error) {
    log('error', `Erreur ${name}: ${error.message}`, { 
      stack: error.stack,
      type: error.constructor.name 
    });
    return {
      content: [{ type: 'text', text: `Erreur: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  if (IS_RENDER) {
    log('info', 'Mode Render - Démarrage serveur HTTP');
    
    const app = express();
    app.use(express.json());
    
    // Middleware de logging pour toutes les requêtes
    app.use((req, res, next) => {
      log('info', `HTTP ${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body,
        query: req.query
      });
      next();
    });
    
    app.get('/', (req, res) => {
      log('info', 'GET / - Page d\'accueil');
      res.json({ 
        service: 'MyDigiPal MCP Server',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        tools_count: getAllTools().length,
        endpoints: ['/health', '/mcp', '/logs']
      });
    });

    app.get('/health', async (req, res) => {
      log('info', 'GET /health - Health check');
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          modules: {
            n8n: await n8nModule.healthCheck()
          }
        };
        log('info', 'Health check OK', health);
        res.json(health);
      } catch (error) {
        log('error', 'Health check failed', error);
        res.status(500).json({ status: 'error', error: error.message });
      }
    });

    // Nouveau endpoint pour MCP over HTTP
    app.post('/mcp', async (req, res) => {
      const { method, params } = req.body;
      log('info', `MCP ${method}`, params);
      
      try {
        if (method === 'tools/list') {
          const result = { tools: getAllTools() };
          log('info', 'MCP tools/list success', result);
          res.json(result);
        } else if (method === 'tools/call') {
          // Simuler l'appel comme si c'était une requête MCP normale
          const mockRequest = { params };
          const handlers = server._requestHandlers || new Map();
          const callHandler = handlers.get('tools/call');
          
          if (callHandler) {
            const result = await callHandler(mockRequest);
            log('info', 'MCP tools/call success');
            res.json(result);
          } else {
            throw new Error('Handler tools/call non trouvé');
          }
        } else {
          log('warn', `MCP method inconnue: ${method}`);
          res.status(404).json({ error: `Method not found: ${method}` });
        }
      } catch (error) {
        log('error', `MCP ${method} error: ${error.message}`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Endpoint pour voir les logs
    app.get('/logs', (req, res) => {
      res.json({ 
        message: 'Voir les logs dans la console Render',
        timestamp: new Date().toISOString()
      });
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      log('info', `Serveur HTTP démarré sur port ${PORT}`);
    });
    
  } else {
    log('info', 'Mode local - Démarrage stdio');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log('info', 'Serveur MCP connecté via stdio');
  }
}

process.on('uncaughtException', (error) => {
  log('fatal', 'Erreur non capturée', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('fatal', 'Promise rejetée', reason);
  process.exit(1);
});

main().catch((error) => {
  log('fatal', 'Erreur démarrage serveur', error);
  process.exit(1);
});
