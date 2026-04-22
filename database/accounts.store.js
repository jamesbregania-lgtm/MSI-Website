const { getDb } = require('./sqlite');

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

async function readAccounts() {
  const db = await getDb();
  const rows = await db.all(
    `SELECT username, password_hash, role, full_name, department, branch, status
     FROM accounts
     ORDER BY username ASC`
  );
  return rows.map(mapAccountRow);
}

async function findActiveAccountByUsername(username) {
  const db = await getDb();
  const row = await db.get(
    `SELECT username, password_hash, role, full_name, department, branch, status
     FROM accounts
     WHERE username = ? AND status != 'inactive'
     LIMIT 1`,
    [String(username || '').trim().toLowerCase()]
  );
  return row ? mapAccountRow(row) : null;
}

async function listUserAccounts() {
  const db = await getDb();
  const rows = await db.all(
    `SELECT username, password_hash, role, full_name, department, branch, status
     FROM accounts
     WHERE role = 'user'
     ORDER BY full_name ASC`
  );
  return rows.map(mapAccountRow);
}

async function usernameExists(username) {
  const db = await getDb();
  const row = await db.get(
    'SELECT 1 AS found FROM accounts WHERE username = ? LIMIT 1',
    [String(username || '').trim().toLowerCase()]
  );
  return Boolean(row);
}

async function createUserAccount(account) {
  const db = await getDb();
  const username = String(account.username || '').trim().toLowerCase();

  const existing = await db.get(
    'SELECT 1 AS found FROM accounts WHERE username = ? LIMIT 1',
    [username]
  );

  if (existing) {
    return false;
  }

  await db.run(
    `INSERT INTO accounts
    (username, password_hash, role, full_name, department, branch, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      username,
      String(account.passwordHash || ''),
      String(account.role || 'user'),
      String(account.fullName || ''),
      String(account.department || ''),
      String(account.branch || ''),
      String(account.status || 'active')
    ]
  );

  return true;
}

async function updateUserAccount(username, updates) {
  const db = await getDb();
  const key = String(username || '').trim().toLowerCase();
  const target = await db.get(
    `SELECT username FROM accounts
     WHERE username = ? AND role = 'user'
     LIMIT 1`,
    [key]
  );

  if (!target) {
    return false;
  }

  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, 'fullName')) {
    fields.push('full_name = ?');
    values.push(String(updates.fullName || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'department')) {
    fields.push('department = ?');
    values.push(String(updates.department || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'branch')) {
    fields.push('branch = ?');
    values.push(String(updates.branch || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    fields.push('status = ?');
    values.push(String(updates.status || 'active'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'passwordHash')) {
    fields.push('password_hash = ?');
    values.push(String(updates.passwordHash || ''));
  }

  if (!fields.length) {
    return true;
  }

  fields.push("updated_at = datetime('now')");

  await db.run(
    `UPDATE accounts
     SET ${fields.join(', ')}
     WHERE username = ? AND role = 'user'`,
    [...values, key]
  );

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