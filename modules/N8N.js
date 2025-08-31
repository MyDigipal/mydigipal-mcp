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
    await axios.get(`${N8N_BASE_URL}/api/v1/workflows`, {
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
        text: `Workflow: ${workflow.name}\nID: ${workflow.id}\nActif: ${workflow.active ? 'Oui' : 'Non'}\nNodes: ${workflow.nodes?.length || 0}`
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
        text: `✅ Workflow exécuté!\nID: ${execution.id || 'N/A'}\nStatut: ${execution.status || 'En cours'}`
      }]
    };
  } catch (error) {
    throw new Error(`Impossible d'exécuter le workflow: ${error.message}`);
  }
}

export default { getTools, handleTool, healthCheck };