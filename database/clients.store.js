const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : __dirname;
const DB_FILE = path.join(DATA_DIR, 'clients.json');
const LEGACY_DB_FILE = path.join(__dirname, 'clients.json');

const SEED_CLIENTS = [
  { id: 'cdo', name: 'CDO', location: 'Patricia Murillo', status: 'active' },
  { id: 'bsp', name: 'BSP', location: 'Janine Avila', status: 'active' },
  { id: 'alaska', name: 'Alaska', location: 'Neil Ella', status: 'active' },
  { id: 'interphil', name: 'Interphil', location: 'ABI', status: 'active' },
  { id: 'del-monte', name: 'Del Monte', location: 'Caamba', status: 'active' },
  { id: 'lamoiyan', name: 'Lamoiyan', location: 'Bicutan', status: 'active' },
  { id: 'monde', name: 'Monde', location: 'Cainta', status: 'active' },
  { id: 'purefoods', name: 'Purefoods', location: 'Gen Trias', status: 'active' }
];

async function ensureDbFile() {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });

  try {
    await fs.access(DB_FILE);
  } catch {
    try {
      const legacyRaw = await fs.readFile(LEGACY_DB_FILE, 'utf8');
      const legacyParsed = JSON.parse(legacyRaw);
      const safeLegacy = Array.isArray(legacyParsed) ? legacyParsed : SEED_CLIENTS;
      await fs.writeFile(DB_FILE, JSON.stringify(safeLegacy, null, 2), 'utf8');
    } catch {
      await fs.writeFile(DB_FILE, JSON.stringify(SEED_CLIENTS, null, 2), 'utf8');
    }
  }
}

async function readClients() {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeClients(clients) {
  await fs.writeFile(DB_FILE, JSON.stringify(clients, null, 2), 'utf8');
}

async function listClients() {
  return readClients();
}

async function listActiveClients() {
  const clients = await readClients();
  return clients.filter(c => c.status !== 'inactive');
}

async function findClientById(clientId) {
  const clients = await readClients();
  const key = String(clientId || '').toLowerCase();
  return clients.find(c => String(c.id || '').toLowerCase() === key) || null;
}

async function findActiveClientByName(name) {
  const clients = await listActiveClients();
  const key = String(name || '').trim().toLowerCase();
  return clients.find(c => String(c.name || '').trim().toLowerCase() === key) || null;
}

async function createClient(client) {
  const clients = await readClients();
  if (clients.some(c => c.id === client.id)) {
    return false;
  }

  clients.push(client);
  await writeClients(clients);
  return true;
}

async function updateClient(clientId, updates) {
  const clients = await readClients();
  const target = clients.find(c => c.id === clientId);

  if (!target) {
    return false;
  }

  Object.assign(target, updates);
  await writeClients(clients);
  return true;
}

async function setClientStatus(clientId, status) {
  return updateClient(clientId, { status });
}

module.exports = {
  listClients,
  listActiveClients,
  findClientById,
  findActiveClientByName,
  createClient,
  updateClient,
  setClientStatus
};