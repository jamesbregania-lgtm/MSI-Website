let state = null;
let initializationPromise = null;

const SEED_ACCOUNTS = [
  {
    username: 'admin_account',
    passwordHash: '$2a$10$VmIUzDx21IaoiHoedyw4eO56jtOM4Tzkco1/9RqZ5Ix2SbOoqGrNi',
    role: 'admin',
    fullName: 'MSI System Administrator',
    department: 'ADMIN',
    branch: 'Silang',
    status: 'active'
  },
  {
    username: 'user_account',
    passwordHash: '$2a$10$i.4ePyGvZY2JTTRStKhVm.0OV/xqzH/qQDWT6FDFDyZMM/SjX/Cda',
    role: 'user',
    fullName: 'MSI Employee User',
    department: 'OPERATIONS',
    branch: 'Davao',
    status: 'active'
  }
];

const REAL_USER_NAMES = [
  'Andrei Santos',
  'Bianca Reyes',
  'Carlo Mendoza',
  'Denise Alvarez',
  'Ethan Cruz',
  'Frances Pineda',
  'Gabriel Navarro',
  'Hannah Garcia',
  'Ian Bautista',
  'Jasmine Flores',
  'Kevin Ramos',
  'Lia Romero',
  'Marco Villanueva',
  'Nina Ortega',
  'Owen Castillo',
  'Paula Navarro',
  'Quinn Herrera',
  'Rhea Domingo',
  'Sean Tan',
  'Trina Aquino'
];

for (let index = 1; index <= 20; index += 1) {
  const suffix = String(index).padStart(2, '0');
  SEED_ACCOUNTS.push({
    username: `user_${suffix}`,
    passwordHash: '$2a$10$i.4ePyGvZY2JTTRStKhVm.0OV/xqzH/qQDWT6FDFDyZMM/SjX/Cda',
    role: 'user',
    fullName: REAL_USER_NAMES[index - 1],
    department: 'OPERATIONS',
    branch: 'Davao',
    status: 'active'
  });
}

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

function normalizeToken(token) {
  return String(token || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, '');
}

function mapAccountRow(row) {
  return {
    username: row.username,
    passwordHash: row.passwordHash,
    role: row.role,
    fullName: row.fullName,
    department: row.department,
    branch: row.branch,
    status: row.status
  };
}

function mapClientRow(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location || '',
    status: row.status
  };
}

function cloneReport(report) {
  return { ...report };
}

function mapMachineRow(row) {
  return {
    clientId: row.clientId,
    clientName: row.clientName || 'Unknown Client',
    location: row.location || 'Unknown',
    unit: row.unit || '',
    model: row.model || '',
    serialNo: row.serialNo || '',
    dateInstalled: row.dateInstalled || '',
    runningHours: Number(row.runningHours || 0),
    status: row.status || '',
    description: row.description || '',
    submittedBy: row.submittedBy || '',
    maintenanceServiceDate: row.maintenanceServiceDate || '',
    partServiceDates: { ...(row.partServiceDates || {}) },
    partServiceHours: { ...(row.partServiceHours || {}) },
    updates: Array.isArray(row.updates) ? row.updates.map(cloneReport) : [],
    reports: Array.isArray(row.reports) ? row.reports.map(cloneReport) : []
  };
}

function mapInviteRow(row) {
  return {
    token: row.token,
    email: row.email,
    role: row.role,
    branch: row.branch,
    department: row.department,
    status: row.status,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    acceptedUsername: row.acceptedUsername
  };
}

async function getDb() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      state = {
        accounts: SEED_ACCOUNTS.map(account => ({ ...account })),
        clients: SEED_CLIENTS.map(client => ({ ...client })),
        invites: [],
        machines: []
      };

      return state;
    })();
  }

  return initializationPromise;
}

function getDbConfigSummary() {
  return {
    mode: 'memory',
    host: 'localhost',
    database: 'in-memory',
    ssl: false
  };
}

module.exports = {
  getDb,
  getDbConfigSummary,
  normalizeToken,
  mapAccountRow,
  mapClientRow,
  mapMachineRow,
  mapInviteRow
};