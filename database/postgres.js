const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DATABASE_URL || '';
const PGHOST = process.env.PGHOST || '';
const PGPORT = process.env.PGPORT || '';
const PGDATABASE = process.env.PGDATABASE || '';
const PGUSER = process.env.PGUSER || '';
const PGPASSWORD = process.env.PGPASSWORD || '';
const PGSSLMODE = String(process.env.PGSSLMODE || '').trim().toLowerCase();
const PGSSL = String(process.env.PGSSL || '').trim().toLowerCase();

const ACCOUNTS_JSON = path.join(__dirname, 'accounts.json');
const CLIENTS_JSON = path.join(__dirname, 'clients.json');
const INVITES_JSON = path.join(__dirname, 'invites.json');
const MACHINES_JSON = path.join(__dirname, 'machines.json');

const SEED_ACCOUNTS = [
  {
    username: 'admin_account',
    passwordHash: '$2b$10$JEmpsrG2mSDgFYaVTgfy/.G2AXaBKQKmjrwRlg8w/4/vpXxjfeqPy',
    role: 'admin',
    fullName: 'MSI System Administrator',
    department: 'ADMIN',
    branch: 'Silang',
    status: 'active'
  },
  {
    username: 'user_account',
    passwordHash: '$2b$10$x/MoQao0HdVNrfnuP7y3c.toEBNSPv4P6qAj/DSiFaVNC9sAyyJOm',
    role: 'user',
    fullName: 'MSI Employee User',
    department: 'OPERATIONS',
    branch: 'Davao',
    status: 'active'
  }
];

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

let pool = null;
let initializationPromise = null;

function normalizeToken(token) {
  return String(token || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, '');
}

function safeString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

async function readJsonArray(filePath, fallback = []) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getSslOption() {
  if (PGSSLMODE === 'disable' || PGSSL === 'disable') {
    return false;
  }

  if (DATABASE_URL) {
    return { rejectUnauthorized: false };
  }

  if (PGSSLMODE === 'require' || PGSSL === 'true' || PGSSL === 'require') {
    return { rejectUnauthorized: false };
  }

  return false;
}

function getPool() {
  if (!pool) {
    if (!DATABASE_URL && (!PGHOST || !PGDATABASE || !PGUSER)) {
      throw new Error('Missing Postgres configuration. Set DATABASE_URL or PGHOST, PGDATABASE, and PGUSER.');
    }

    if (DATABASE_URL) {
      pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: getSslOption(),
        family: 4,
        max: 10
      });
    } else {
      pool = new Pool({
        host: PGHOST,
        port: PGPORT ? Number(PGPORT) : 5432,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        ssl: getSslOption(),
        family: 4,
        max: 10
      });
    }
  }

  return pool;
}

function mapAccountRow(row) {
  return {
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    fullName: row.full_name,
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

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function mapMachineRow(row) {
  return {
    clientId: row.client_id,
    clientName: row.client_name || 'Unknown Client',
    location: row.location || 'Unknown',
    unit: row.unit || '',
    model: row.model || '',
    serialNo: row.serial_no || '',
    dateInstalled: row.date_installed || '',
    runningHours: Number(row.running_hours || 0),
    status: row.status || '',
    description: row.description || '',
    submittedBy: row.submitted_by || '',
    maintenanceServiceDate: row.maintenance_service_date || '',
    partServiceDates: safeJsonParse(row.part_service_dates, {}),
    partServiceHours: safeJsonParse(row.part_service_hours, {}),
    updates: safeJsonParse(row.updates_json, []),
    reports: safeJsonParse(row.reports_json, [])
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
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    acceptedUsername: row.accepted_username
  };
}

async function createTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invites (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      branch TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT,
      expires_at TEXT,
      accepted_at TEXT,
      accepted_username TEXT
    );

    CREATE TABLE IF NOT EXISTS machines (
      id BIGSERIAL PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_name TEXT,
      location TEXT,
      unit TEXT,
      model TEXT,
      serial_no TEXT,
      date_installed TEXT,
      running_hours DOUBLE PRECISION,
      status TEXT,
      description TEXT,
      submitted_by TEXT,
      maintenance_service_date TEXT,
      part_service_dates TEXT,
      part_service_hours TEXT,
      updates_json TEXT,
      reports_json TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(client_id, serial_no, model, date_installed)
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_role_status ON accounts(role, status);
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
    CREATE INDEX IF NOT EXISTS idx_machines_client ON machines(client_id);
  `);
}

async function seedAccountsIfNeeded(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM accounts');
  if (rows[0].count > 0) return;

  const legacy = await readJsonArray(ACCOUNTS_JSON, SEED_ACCOUNTS);
  const seedRows = legacy.length ? legacy : SEED_ACCOUNTS;

  for (const acc of seedRows) {
    await client.query(
      `INSERT INTO accounts
      (username, password_hash, role, full_name, department, branch, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (username) DO NOTHING`,
      [
        String(acc.username || '').trim().toLowerCase(),
        String(acc.passwordHash || ''),
        String(acc.role || 'user'),
        String(acc.fullName || ''),
        String(acc.department || ''),
        String(acc.branch || ''),
        String(acc.status || 'active')
      ]
    );
  }
}

async function seedClientsIfNeeded(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM clients');
  if (rows[0].count > 0) return;

  const legacy = await readJsonArray(CLIENTS_JSON, SEED_CLIENTS);
  const seedRows = legacy.length ? legacy : SEED_CLIENTS;

  for (const item of seedRows) {
    await client.query(
      `INSERT INTO clients
      (id, name, location, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING`,
      [
        String(item.id || '').trim().toLowerCase(),
        String(item.name || '').trim(),
        String(item.location || '').trim(),
        String(item.status || 'active')
      ]
    );
  }
}

async function seedInvitesIfNeeded(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM invites');
  if (rows[0].count > 0) return;

  const invites = await readJsonArray(INVITES_JSON, []);

  for (const invite of invites) {
    const token = normalizeToken(invite.token);
    if (!token) continue;

    await client.query(
      `INSERT INTO invites
      (token, email, role, branch, department, status, created_at, expires_at, accepted_at, accepted_username)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (token) DO NOTHING`,
      [
        token,
        String(invite.email || '').trim().toLowerCase(),
        String(invite.role || ''),
        String(invite.branch || ''),
        String(invite.department || ''),
        String(invite.status || 'pending'),
        invite.createdAt ? String(invite.createdAt) : null,
        invite.expiresAt ? String(invite.expiresAt) : null,
        invite.acceptedAt ? String(invite.acceptedAt) : null,
        invite.acceptedUsername ? String(invite.acceptedUsername) : null
      ]
    );
  }
}

async function seedMachinesIfNeeded(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM machines');
  if (rows[0].count > 0) return;

  const machines = await readJsonArray(MACHINES_JSON, []);

  for (const machine of machines) {
    await client.query(
      `INSERT INTO machines
      (
        client_id, client_name, location, unit, model, serial_no, date_installed,
        running_hours, status, description, submitted_by, maintenance_service_date,
        part_service_dates, part_service_hours, updates_json, reports_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (client_id, serial_no, model, date_installed) DO NOTHING`,
      [
        String(machine.clientId || '').trim().toLowerCase(),
        machine.clientName ? String(machine.clientName) : null,
        machine.location ? String(machine.location) : null,
        machine.unit ? String(machine.unit) : null,
        machine.model ? String(machine.model) : null,
        machine.serialNo ? String(machine.serialNo) : null,
        machine.dateInstalled ? String(machine.dateInstalled) : null,
        Number.isFinite(Number(machine.runningHours)) ? Number(machine.runningHours) : 0,
        machine.status ? String(machine.status) : null,
        machine.description ? String(machine.description) : '',
        machine.submittedBy ? String(machine.submittedBy) : null,
        machine.maintenanceServiceDate ? String(machine.maintenanceServiceDate) : '',
        JSON.stringify(machine.partServiceDates && typeof machine.partServiceDates === 'object' ? machine.partServiceDates : {}),
        JSON.stringify(machine.partServiceHours && typeof machine.partServiceHours === 'object' ? machine.partServiceHours : {}),
        JSON.stringify(Array.isArray(machine.updates) ? machine.updates : []),
        JSON.stringify(Array.isArray(machine.reports) ? machine.reports : [])
      ]
    );
  }
}

async function getDb() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const client = await getPool().connect();
      try {
        await createTables(client);
        await seedAccountsIfNeeded(client);
        await seedClientsIfNeeded(client);
        await seedInvitesIfNeeded(client);
        await seedMachinesIfNeeded(client);
      } finally {
        client.release();
      }

      return getPool();
    })();
  }

  return initializationPromise;
}

function getDbConfigSummary() {
  if (DATABASE_URL) {
    const url = new URL(DATABASE_URL);
    return {
      mode: 'url',
      host: url.hostname,
      database: url.pathname.replace(/^\//, ''),
      ssl: Boolean(getSslOption())
    };
  }

  return {
    mode: 'params',
    host: PGHOST,
    database: PGDATABASE,
    ssl: Boolean(getSslOption())
  };
}

module.exports = {
  getDb,
  getPool,
  getDbConfigSummary,
  normalizeToken,
  mapAccountRow,
  mapClientRow,
  mapMachineRow,
  mapInviteRow
};