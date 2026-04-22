const fs = require('fs/promises');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : __dirname;
const SQLITE_FILE = process.env.SQLITE_FILE
  ? path.resolve(process.env.SQLITE_FILE)
  : path.join(DATA_DIR, 'app.db');

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

let dbPromise = null;

function normalizeToken(token) {
  return String(token || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, '');
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

async function createTables(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      client_name TEXT,
      location TEXT,
      unit TEXT,
      model TEXT,
      serial_no TEXT,
      date_installed TEXT,
      running_hours REAL,
      status TEXT,
      description TEXT,
      submitted_by TEXT,
      maintenance_service_date TEXT,
      part_service_dates TEXT,
      part_service_hours TEXT,
      updates_json TEXT,
      reports_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(client_id, serial_no, model, date_installed)
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_role_status ON accounts(role, status);
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
    CREATE INDEX IF NOT EXISTS idx_machines_client ON machines(client_id);
  `);
}

async function seedAccountsIfNeeded(db) {
  const row = await db.get('SELECT COUNT(*) AS count FROM accounts');
  if (row.count > 0) return;

  const legacy = await readJsonArray(ACCOUNTS_JSON, SEED_ACCOUNTS);
  const seedRows = legacy.length ? legacy : SEED_ACCOUNTS;

  for (const acc of seedRows) {
    await db.run(
      `INSERT OR IGNORE INTO accounts
      (username, password_hash, role, full_name, department, branch, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

async function seedClientsIfNeeded(db) {
  const row = await db.get('SELECT COUNT(*) AS count FROM clients');
  if (row.count > 0) return;

  const legacy = await readJsonArray(CLIENTS_JSON, SEED_CLIENTS);
  const seedRows = legacy.length ? legacy : SEED_CLIENTS;

  for (const client of seedRows) {
    await db.run(
      `INSERT OR IGNORE INTO clients
      (id, name, location, status)
      VALUES (?, ?, ?, ?)`,
      [
        String(client.id || '').trim().toLowerCase(),
        String(client.name || '').trim(),
        String(client.location || '').trim(),
        String(client.status || 'active')
      ]
    );
  }
}

async function seedInvitesIfNeeded(db) {
  const row = await db.get('SELECT COUNT(*) AS count FROM invites');
  if (row.count > 0) return;

  const invites = await readJsonArray(INVITES_JSON, []);

  for (const invite of invites) {
    const token = normalizeToken(invite.token);
    if (!token) continue;

    await db.run(
      `INSERT OR IGNORE INTO invites
      (token, email, role, branch, department, status, created_at, expires_at, accepted_at, accepted_username)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

async function seedMachinesIfNeeded(db) {
  const row = await db.get('SELECT COUNT(*) AS count FROM machines');
  if (row.count > 0) return;

  const machines = await readJsonArray(MACHINES_JSON, []);

  for (const machine of machines) {
    await db.run(
      `INSERT OR IGNORE INTO machines
      (
        client_id, client_name, location, unit, model, serial_no, date_installed,
        running_hours, status, description, submitted_by, maintenance_service_date,
        part_service_dates, part_service_hours, updates_json, reports_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  if (!dbPromise) {
    dbPromise = (async () => {
      await fs.mkdir(path.dirname(SQLITE_FILE), { recursive: true });

      const db = await open({
        filename: SQLITE_FILE,
        driver: sqlite3.Database
      });

      await db.exec('PRAGMA journal_mode = WAL;');
      await db.exec('PRAGMA foreign_keys = ON;');

      await createTables(db);
      await seedAccountsIfNeeded(db);
      await seedClientsIfNeeded(db);
      await seedInvitesIfNeeded(db);
      await seedMachinesIfNeeded(db);

      return db;
    })();
  }

  return dbPromise;
}

module.exports = {
  getDb,
  normalizeToken
};
