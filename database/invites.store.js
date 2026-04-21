const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : __dirname;
const DB_FILE = path.join(DATA_DIR, 'invites.json');
const LEGACY_DB_FILE = path.join(__dirname, 'invites.json');

async function ensureDbFile() {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });

  try {
    await fs.access(DB_FILE);
  } catch {
    try {
      const legacyRaw = await fs.readFile(LEGACY_DB_FILE, 'utf8');
      const legacyParsed = JSON.parse(legacyRaw);
      const safeLegacy = Array.isArray(legacyParsed) ? legacyParsed : [];
      await fs.writeFile(DB_FILE, JSON.stringify(safeLegacy, null, 2), 'utf8');
    } catch {
      await fs.writeFile(DB_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  }
}

async function readInvites() {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeInvites(invites) {
  await fs.writeFile(DB_FILE, JSON.stringify(invites, null, 2), 'utf8');
}

async function createInvite(invite) {
  const invites = await readInvites();
  invites.push(invite);
  await writeInvites(invites);
  return invite;
}

async function findInviteByToken(token) {
  const invites = await readInvites();
  const key = String(token || '').trim();
  return invites.find(invite => String(invite.token || '').trim() === key) || null;
}

async function updateInvite(token, updates) {
  const invites = await readInvites();
  const key = String(token || '').trim();
  const target = invites.find(invite => String(invite.token || '').trim() === key);

  if (!target) {
    return false;
  }

  Object.assign(target, updates);
  await writeInvites(invites);
  return true;
}

module.exports = {
  createInvite,
  findInviteByToken,
  updateInvite
};