const { getDb, mapAccountRow } = require('./postgres');

async function readAccounts() {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT username, password_hash, role, full_name, department, branch, status
     FROM accounts
     ORDER BY username ASC`
  );
  return rows.map(mapAccountRow);
}

async function findActiveAccountByUsername(username) {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT username, password_hash, role, full_name, department, branch, status
     FROM accounts
     WHERE username = $1 AND status != 'inactive'
     LIMIT 1`,
    [String(username || '').trim().toLowerCase()]
  );
  return rows[0] ? mapAccountRow(rows[0]) : null;
}

async function listUserAccounts() {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT username, password_hash, role, full_name, department, branch, status
     FROM accounts
     WHERE role = 'user'
     ORDER BY full_name ASC`
  );
  return rows.map(mapAccountRow);
}

async function usernameExists(username) {
  const db = await getDb();
  const { rows } = await db.query(
    'SELECT 1 AS found FROM accounts WHERE username = $1 LIMIT 1',
    [String(username || '').trim().toLowerCase()]
  );
  return Boolean(rows[0]);
}

async function createUserAccount(account) {
  const db = await getDb();
  const username = String(account.username || '').trim().toLowerCase();

  const existing = await db.query(
    'SELECT 1 AS found FROM accounts WHERE username = $1 LIMIT 1',
    [username]
  );

  if (existing.rows[0]) {
    return false;
  }

  await db.query(
    `INSERT INTO accounts
    (username, password_hash, role, full_name, department, branch, status, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
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
  const target = await db.query(
    `SELECT username FROM accounts
     WHERE username = $1 AND role = 'user'
     LIMIT 1`,
    [key]
  );

  if (!target.rows[0]) {
    return false;
  }

  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, 'fullName')) {
    fields.push(`full_name = $${values.length + 1}`);
    values.push(String(updates.fullName || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'department')) {
    fields.push(`department = $${values.length + 1}`);
    values.push(String(updates.department || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'branch')) {
    fields.push(`branch = $${values.length + 1}`);
    values.push(String(updates.branch || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    fields.push(`status = $${values.length + 1}`);
    values.push(String(updates.status || 'active'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'passwordHash')) {
    fields.push(`password_hash = $${values.length + 1}`);
    values.push(String(updates.passwordHash || ''));
  }

  if (!fields.length) {
    return true;
  }

  fields.push(`updated_at = NOW()`);

  await db.query(
    `UPDATE accounts
     SET ${fields.join(', ')}
     WHERE username = $${values.length + 1} AND role = 'user'`,
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