const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : __dirname;
const DB_FILE = path.join(DATA_DIR, 'accounts.json');
const LEGACY_DB_FILE = path.join(__dirname, 'accounts.json');

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

async function ensureDbFile() {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });

  try {
    await fs.access(DB_FILE);
  } catch {
    try {
      const legacyRaw = await fs.readFile(LEGACY_DB_FILE, 'utf8');
      const legacyParsed = JSON.parse(legacyRaw);
      const safeLegacy = Array.isArray(legacyParsed) ? legacyParsed : SEED_ACCOUNTS;
      await fs.writeFile(DB_FILE, JSON.stringify(safeLegacy, null, 2), 'utf8');
    } catch {
      await fs.writeFile(DB_FILE, JSON.stringify(SEED_ACCOUNTS, null, 2), 'utf8');
    }
  }
}

async function readAccounts() {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAccounts(accounts) {
  await fs.writeFile(DB_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

async function findActiveAccountByUsername(username) {
  const accounts = await readAccounts();
  return accounts.find(
    acc => acc.username === username && acc.status !== 'inactive'
  ) || null;
}

async function listUserAccounts() {
  const accounts = await readAccounts();
  return accounts.filter(acc => acc.role === 'user');
}

async function usernameExists(username) {
  const accounts = await readAccounts();
  return accounts.some(acc => acc.username === username);
}

async function createUserAccount(account) {
  const accounts = await readAccounts();

  if (accounts.some(acc => acc.username === account.username)) {
    return false;
  }

  accounts.push(account);
  await writeAccounts(accounts);
  return true;
}

async function updateUserAccount(username, updates) {
  const accounts = await readAccounts();
  const target = accounts.find(acc => acc.username === username && acc.role === 'user');

  if (!target) {
    return false;
  }

  Object.assign(target, updates);
  await writeAccounts(accounts);
  return true;
}

async function resetUserPassword(username, passwordHash) {
  return updateUserAccount(username, { passwordHash });
}

async function setUserStatus(username, status) {
  return updateUserAccount(username, { status });
}

module.exports = {
  readAccounts,
  findActiveAccountByUsername,
  listUserAccounts,
  usernameExists,
  createUserAccount,
  updateUserAccount,
  resetUserPassword,
  setUserStatus
};