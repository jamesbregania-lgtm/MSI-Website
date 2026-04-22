const { getDb, normalizeToken } = require('./sqlite');

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

async function createInvite(invite) {
  const db = await getDb();
  const token = normalizeToken(invite.token);

  await db.run(
    `INSERT OR REPLACE INTO invites
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

  return invite;
}

async function findInviteByToken(token) {
  const key = normalizeToken(token);
  if (!key) {
    return null;
  }

  const db = await getDb();
  const row = await db.get(
    `SELECT token, email, role, branch, department, status, created_at, expires_at, accepted_at, accepted_username
     FROM invites
     WHERE token = ?
     LIMIT 1`,
    [key]
  );

  return row ? mapInviteRow(row) : null;
}

async function updateInvite(token, updates) {
  const key = normalizeToken(token);
  const db = await getDb();
  const target = await db.get('SELECT token FROM invites WHERE token = ? LIMIT 1', [key]);

  if (!target) {
    return false;
  }

  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, 'email')) {
    fields.push('email = ?');
    values.push(String(updates.email || '').trim().toLowerCase());
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'role')) {
    fields.push('role = ?');
    values.push(String(updates.role || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'branch')) {
    fields.push('branch = ?');
    values.push(String(updates.branch || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'department')) {
    fields.push('department = ?');
    values.push(String(updates.department || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    fields.push('status = ?');
    values.push(String(updates.status || 'pending'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'createdAt')) {
    fields.push('created_at = ?');
    values.push(updates.createdAt ? String(updates.createdAt) : null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'expiresAt')) {
    fields.push('expires_at = ?');
    values.push(updates.expiresAt ? String(updates.expiresAt) : null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'acceptedAt')) {
    fields.push('accepted_at = ?');
    values.push(updates.acceptedAt ? String(updates.acceptedAt) : null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'acceptedUsername')) {
    fields.push('accepted_username = ?');
    values.push(updates.acceptedUsername ? String(updates.acceptedUsername) : null);
  }

  if (!fields.length) {
    return true;
  }

  await db.run(
    `UPDATE invites
     SET ${fields.join(', ')}
     WHERE token = ?`,
    [...values, key]
  );

  return true;
}

module.exports = {
  createInvite,
  findInviteByToken,
  updateInvite
};