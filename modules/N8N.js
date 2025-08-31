import axios from 'axios';

// Configuration N8N
const N8N_BASE_URL = process.env.N8N_URL || 'https://n8n.mydigipal.com';
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_USERNAME = process.env.N8N_BASIC_AUTH_USER;
const N8N_PASSWORD = process.env.N8N_BASIC_AUTH_PASSWORD;

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  
  if (N8N_API_KEY) {
    headers['X-N8N-API-KEY'] = N8N_API_KEY;
  } else if (N8N_USERNAME && N8N_PASSWORD) {
    const auth = Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }
  
  return headers;
}

export function getTools() {
  return [
    {
      name: 'test_connection',
      description: 'Tester la connexion à N8N',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'list_workflows',
      description: 'Lister tous les workflows N8N',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_workflow',
      description: 'Obtenir les détails d\'un workflow',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID du workflow' }
        },
        required: ['id']
      }
    },
    {
      name: 'execute_workflow',
      description: 'Exécuter un workflow',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID du workflow' },
          data: { type: 'object', description: 'Données d\'entrée', default: {} }
        },
        required: ['id']
      }
    },
    {
      name: 'activate_workflow',
      description: 'Activer un workflow',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID du workflow' }
        },
        required: ['id']
      }
    },
    {
      name: 'deactivate_workflow',
      description: 'Désactiver un workflow',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID du workflow' }
        },
        required: ['id']
      }
    },
    {
      name: 'create_workflow',
      description: 'Créer un nouveau workflow',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom du workflow' },
          nodes: { type: 'array', description: 'Nœuds du workflow' },
          connections: { type: 'object', description: 'Connexions entre nœuds' }
        },
        required: ['name', 'nodes', 'connections']
      }
    },
    {
      name: 'update_workflow',
      description: 'Mettre à jour un workflow existant',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID du workflow' },
          name: { type: 'string', description: 'Nouveau nom' },
          nodes: { type: 'array', description: 'Nouveaux nœuds' },
          connections: { type: 'object', description: 'Nouvelles connexions' }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_workflow',
      description: 'Supprimer un workflow',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID du workflow' }
        },
        required: ['id']
      }
    },
    {
      name: 'get_execution_history',
      description: 'Obtenir l\'historique d\'exécution d\'un workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: { type: 'string', description: 'ID du workflow' },
          limit: { type: 'number', description: 'Nombre max d\'exécutions', default: 10 }
        },
        required: ['workflowId']
      }
    },
    {
      name: 'get_execution_details',
      description: 'Obtenir les détails d\'une exécution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { type: 'string', description: 'ID de l\'exécution' }
        },
        required: ['executionId']
      }
    },
    {
      name: 'create_mercedes_scraper',
      description: 'Créer un workflow spécialisé pour scraper Mercedes-Kroely',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Localisation (Colmar, Metz, etc.)', default: 'Colmar' },
          sheetId: { type: 'string', description: 'ID du Google Sheet de destination' }
        },
        required: ['sheetId']
      }
    }
  ];
}

export async function handleTool(actionName, args) {
  switch (actionName) {
    case 'test_connection':
      return await testConnection();
    case 'list_workflows':
      return await listWorkflows();
    case 'get_workflow':
      return await getWorkflow(args.id);
    case 'execute_workflow':
      return await executeWorkflow(args.id, args.data || {});
    case 'activate_workflow':
      return await activateWorkflow(args.id);
    case 'deactivate_workflow':
      return await deactivateWorkflow(args.id);
    case 'create_workflow':
      return await createWorkflow(args.name, args.nodes, args.connections);
    case 'update_workflow':
      return await updateWorkflow(args.id, args.name, args.nodes, args.connections);
    case 'delete_workflow':
      return await deleteWorkflow(args.id);
    case 'get_execution_history':
      return await getExecutionHistory(args.workflowId, args.limit || 10);
    case 'get_execution_details':
      return await getExecutionDetails(args.executionId);
    case 'create_mercedes_scraper':
      return await createMercedesScraper(args.location || 'Colmar', args.sheetId);
    default:
      throw new Error(`Action N8N inconnue: ${actionName}`);
  }
}

export async function healthCheck() {
  try {
    await axios.get(`${N8N_BASE_URL}/api/v1/workflows?limit=1`, {
      headers: getAuthHeaders(),
      timeout: 5000,
    });
    return { status: 'healthy', url: N8N_BASE_URL };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function testConnection() {
  try {
    const response = await axios.get(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { content: [{ type: 'text', text: '✅ Connexion réussie à N8N!' }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `❌ Erreur de connexion: ${error.message}` }], isError: true };
  }
}

async function listWorkflows() {
  try {
    const response = await axios.get(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });

    const workflows = response.data.data || response.data;
    let result = `Workflows trouvés (${workflows.length}):\n\n`;
    workflows.forEach((workflow) => {
      const status = workflow.active ? '🟢 Actif' : '🔴 Inactif';
      result += `- ${workflow.name} (ID: ${workflow.id}) - ${status}\n`;
    });

    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    throw new Error(`Impossible de lister les workflows: ${error.message}`);
  }
}

async function getWorkflow(workflowId) {
  try {
    const response = await axios.get(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });

    const workflow = response.data.data || response.data;
    return {
      content: [{ 
        type: 'text', 
        text: `Workflow: ${workflow.name}\nID: ${workflow.id}\nActif: ${workflow.active ? 'Oui' : 'Non'}\nNodes: ${workflow.nodes?.length || 0}\nDernière mise à jour: ${workflow.updatedAt || 'N/A'}`
      }]
    };
  } catch (error) {
    throw new Error(`Impossible de récupérer le workflow: ${error.message}`);
  }
}

async function executeWorkflow(workflowId, inputData = {}) {
  try {
    const response = await axios.post(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/execute`, {
      data: inputData
    }, {
      headers: getAuthHeaders(),
      timeout: 60000,
    });

    const execution = response.data.data || response.data;
    return {
      content: [{ 
        type: 'text', 
        text: `✅ Workflow exécuté!\nID exécution: ${execution.id || 'N/A'}\nStatut: ${execution.status || 'En cours'}`
      }]
    };
  } catch (error) {
    throw new Error(`Impossible d'exécuter le workflow: ${error.message}`);
  }
}

async function activateWorkflow(workflowId) {
  try {
    await axios.post(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`, {}, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { content: [{ type: 'text', text: `✅ Workflow ${workflowId} activé!` }] };
  } catch (error) {
    throw new Error(`Impossible d'activer le workflow: ${error.message}`);
  }
}

async function deactivateWorkflow(workflowId) {
  try {
    await axios.post(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/deactivate`, {}, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { content: [{ type: 'text', text: `✅ Workflow ${workflowId} désactivé!` }] };
  } catch (error) {
    throw new Error(`Impossible de désactiver le workflow: ${error.message}`);
  }
}

async function createWorkflow(name, nodes, connections) {
  try {
    const workflowData = {
      name,
      nodes,
      connections
    };

    const response = await axios.post(`${N8N_BASE_URL}/api/v1/workflows`, workflowData, {
      headers: getAuthHeaders(),
      timeout: 30000,
    });

    const workflow = response.data.data || response.data;
    return {
      content: [{ 
        type: 'text', 
        text: `✅ Workflow "${name}" créé!\nID: ${workflow.id}\nStatut: ${workflow.active ? 'Actif' : 'Inactif'}`
      }]
    };
  } catch (error) {
    throw new Error(`Impossible de créer le workflow: ${error.message}`);
  }
}

async function updateWorkflow(workflowId, name, nodes, connections) {
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (nodes) updateData.nodes = nodes;
    if (connections) updateData.connections = connections;

    await axios.put(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, updateData, {
      headers: getAuthHeaders(),
      timeout: 30000,
    });

    return { content: [{ type: 'text', text: `✅ Workflow ${workflowId} mis à jour!` }] };
  } catch (error) {
    throw new Error(`Impossible de mettre à jour le workflow: ${error.message}`);
  }
}

async function deleteWorkflow(workflowId) {
  try {
    await axios.delete(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { content: [{ type: 'text', text: `✅ Workflow ${workflowId} supprimé!` }] };
  } catch (error) {
    throw new Error(`Impossible de supprimer le workflow: ${error.message}`);
  }
}

async function getExecutionHistory(workflowId, limit = 10) {
  try {
    const response = await axios.get(`${N8N_BASE_URL}/api/v1/executions?workflowId=${workflowId}&limit=${limit}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });

    const executions = response.data.data || response.data;
    let result = `Historique des exécutions (${executions.length}):\n\n`;
    executions.forEach((exec) => {
      const status = exec.status === 'success' ? '✅' : exec.status === 'error' ? '❌' : '⏳';
      result += `${status} ${exec.id} - ${exec.status} - ${new Date(exec.startedAt).toLocaleString()}\n`;
    });

    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    throw new Error(`Impossible de récupérer l'historique: ${error.message}`);
  }
}

async function getExecutionDetails(executionId) {
  try {
    const response = await axios.get(`${N8N_BASE_URL}/api/v1/executions/${executionId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });

    const execution = response.data.data || response.data;
    return {
      content: [{ 
        type: 'text', 
        text: `Exécution ${executionId}\nStatut: ${execution.status}\nDémarré: ${execution.startedAt}\nTerminé: ${execution.stoppedAt || 'En cours'}\nDurée: ${execution.duration || 'N/A'}ms`
      }]
    };
  } catch (error) {
    throw new Error(`Impossible de récupérer les détails: ${error.message}`);
  }
}

async function createMercedesScraper(location, sheetId) {
  const workflowName = `Mercedes-Kroely Scraper - ${location}`;
  const url = location === 'Colmar' 
    ? 'https://www.mercedes-kroely.fr/stock-mercedes-benz/vehicules-occasions?page=1&segments=1&pagPageId=18&localisations=Mercedes-Benz+Kroely+Colmar'
    : 'https://www.mercedes-kroely.fr/stock-mercedes-benz/vehicules-occasions';

  const nodes = [
    {
      id: 'start-node',
      name: 'Start',
      type: 'n8n-nodes-base.start',
      position: [240, 300],
      parameters: {},
      typeVersion: 1
    },
    {
      id: 'http-request',
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      position: [460, 300],
      parameters: {
        url: url,
        method: 'GET',
        options: {
          allowUnauthorizedCerts: true,
          ignoreHttpsErrors: true,
          timeout: 30000
        }
      },
      typeVersion: 4.2
    },
    {
      id: 'code-node',
      name: 'Extract Vehicle Data',
      type: 'n8n-nodes-base.code',
      position: [680, 300],
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: `
const $ = cheerio.load($input.first().json.body);
const vehicles = [];

// Sélecteurs multiples pour capturer différents layouts
const selectors = [
  '.vehicle-card', '.car-item', '.product-item', 
  '[data-vehicle]', '.listing-item', '.inventory-item',
  'article', '.result-item'
];

let foundElements = false;

for (const selector of selectors) {
  const elements = $(selector);
  if (elements.length > 0) {
    console.log(\`Trouvé \${elements.length} éléments avec sélecteur: \${selector}\`);
    foundElements = true;
    
    elements.each((i, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();
      
      // Filtrer uniquement les Mercedes
      if (text.includes('mercedes') || text.includes('benz')) {
        vehicles.push({
          URL: $el.find('a').first().attr('href') || url,
          Title: $el.find('h1, h2, h3, h4, h5, .title, .name').first().text().trim() || 'Mercedes-Benz',
          Description: text.trim().substring(0, 200),
          Make: 'Mercedes-Benz',
          Model: extractModel(text),
          Location: '${location}',
          Price: extractPrice($el.text()),
          Year: extractYear($el.text()),
          Mileage: extractMileage($el.text()),
          Fuel: extractFuel($el.text()),
          Transmission: extractTransmission($el.text()),
          ExtractedAt: new Date().toISOString()
        });
      }
    });
    
    if (vehicles.length > 0) break;
  }
}

// Fonctions d'extraction
function extractModel(text) {
  const models = ['classe a', 'classe b', 'classe c', 'classe e', 'classe s', 'gla', 'glb', 'glc', 'gle', 'gls', 'amg'];
  for (const model of models) {
    if (text.includes(model)) {
      return model.toUpperCase();
    }
  }
  return '';
}

function extractPrice(text) {
  const priceMatch = text.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/);
  return priceMatch ? priceMatch[1].replace(/\s/g, '') : '';
}

function extractYear(text) {
  const yearMatch = text.match(/(20\d{2})/);
  return yearMatch ? yearMatch[1] : '';
}

function extractMileage(text) {
  const mileageMatch = text.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/);
  return mileageMatch ? mileageMatch[1].replace(/\s/g, '') : '';
}

function extractFuel(text) {
  if (text.includes('essence')) return 'Essence';
  if (text.includes('diesel')) return 'Diesel';
  if (text.includes('hybride')) return 'Hybride';
  if (text.includes('électrique')) return 'Électrique';
  return '';
}

function extractTransmission(text) {
  if (text.includes('automatique')) return 'Automatique';
  if (text.includes('manuelle')) return 'Manuelle';
  return '';
}

console.log(\`Extraction terminée: \${vehicles.length} véhicules trouvés\`);

return vehicles.map(vehicle => ({json: vehicle}));
        `
      },
      typeVersion: 2
    },
    {
      id: 'sheets-node',
      name: 'Save to Google Sheets',
      type: 'n8n-nodes-base.googleSheets',
      position: [900, 300],
      parameters: {
        resource: 'sheet',
        operation: 'appendOrUpdate',
        documentId: {
          __rl: true,
          mode: 'id',
          value: sheetId
        },
        sheetName: {
          __rl: true,
          mode: 'list',
          value: 'gid=0'
        },
        columnToMatchOn: 'URL',
        options: {
          mappingMode: 'autoMapInputData'
        }
      },
      credentials: {
        googleSheetsOAuth2Api: {
          id: 'GA4_Credential',
          name: 'GA4 Credential'
        }
      },
      typeVersion: 4.4
    }
  ];

  const connections = {
    'Start': {
      main: [[{
        node: 'HTTP Request',
        type: 'main',
        index: 0
      }]]
    },
    'HTTP Request': {
      main: [[{
        node: 'Extract Vehicle Data',
        type: 'main',
        index: 0
      }]]
    },
    'Extract Vehicle Data': {
      main: [[{
        node: 'Save to Google Sheets',
        type: 'main',
        index: 0
      }]]
    }
  };

  return await createWorkflow(workflowName, nodes, connections);
}

export default { getTools, handleTool, healthCheck };
