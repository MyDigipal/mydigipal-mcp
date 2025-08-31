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

// Importer les modules
import n8nModule from './modules/n8n.js';

// Charger les variables d'environnement
dotenv.config();

console.error('MyDigiPal MCP Server démarré!');

// Configuration générale
const PORT = process.env.PORT || 3000;
const IS_RENDER = process.env.RENDER || process.env.NODE_ENV === 'production';

// Créer le serveur MCP
const server = new Server(
  {
    name: 'mydigipal-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {
        listTools: true,
        callTool: true,
      },
    },
  }
);

// Modules disponibles (on commence juste avec N8N)
const modules = {
  n8n: n8nModule,
};

// Collecter tous les outils de tous les modules
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

// Liste des outils disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getAllTools(),
  };
});

// Gestionnaire d'appels d'outils
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
    console.error(`Erreur lors de l'exécution de ${name}:`, error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    return {
      content: [{ type: 'text', text: `Erreur: ${error.message}` }],
      isError: true,
    };
  }
});

// Fonction de test de santé
async function globalHealthCheck() {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    modules: {},
    overall: 'healthy'
  };
  
  for (const [moduleName, module] of Object.entries(modules)) {
    try {
      if (module && module.healthCheck) {
        healthStatus.modules[moduleName] = await module.healthCheck();
      }
    } catch (error) {
      healthStatus.modules[moduleName] = { status: 'error', error: error.message };
      healthStatus.overall = 'degraded';
    }
  }
  
  return healthStatus;
}

// Démarrer le serveur
async function main() {
  if (IS_RENDER) {
    // Mode Render : serveur HTTP
    const app = express();
    
    app.use(express.json());
    
    app.get('/', (req, res) => {
      res.json({ 
        service: 'MyDigiPal MCP Server',
        version: '1.0.0',
        modules: Object.keys(modules),
        tools_count: getAllTools().length,
        timestamp: new Date().toISOString()
      });
    });
    
    app.get('/health', async (req, res) => {
      try {
        const health = await globalHealthCheck();
        const statusCode = health.overall === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(500).json({ 
          status: 'error', 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.error(`MyDigiPal MCP Server HTTP en écoute sur le port ${PORT}`);
    });
    
  } else {
    // Mode local : stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MyDigiPal MCP Server connecté via stdio');
  }
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejetée non gérée:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Erreur lors du démarrage du serveur:', error);
  process.exit(1);
});