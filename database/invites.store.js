const { getDb, normalizeToken, mapInviteRow } = require('./postgres');

async function createInvite(invite) {
  const db = await getDb();
  const token = normalizeToken(invite.token);

  await db.query(
    `INSERT INTO invites
    (token, email, role, branch, department, status, created_at, expires_at, accepted_at, accepted_username)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (token) DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      branch = EXCLUDED.branch,
      department = EXCLUDED.department,
      status = EXCLUDED.status,
      created_at = EXCLUDED.created_at,
      expires_at = EXCLUDED.expires_at,
      accepted_at = EXCLUDED.accepted_at,
      accepted_username = EXCLUDED.accepted_username`,
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
  const { rows } = await db.query(
    `SELECT token, email, role, branch, department, status, created_at, expires_at, accepted_at, accepted_username
     FROM invites
     WHERE token = $1
     LIMIT 1`,
    [key]
  );

  return rows[0] ? mapInviteRow(rows[0]) : null;
}

async function updateInvite(token, updates) {
  const key = normalizeToken(token);
  const db = await getDb();
  const target = await db.query('SELECT token FROM invites WHERE token = $1 LIMIT 1', [key]);

  if (!target.rows[0]) {
    return false;
  }

  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, 'email')) {
    fields.push(`email = $${values.length + 1}`);
    values.push(String(updates.email || '').trim().toLowerCase());
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'role')) {
    fields.push(`role = $${values.length + 1}`);
    values.push(String(updates.role || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'branch')) {
    fields.push(`branch = $${values.length + 1}`);
    values.push(String(updates.branch || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'department')) {
    fields.push(`department = $${values.length + 1}`);
    values.push(String(updates.department || ''));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    fields.push(`status = $${values.length + 1}`);
    values.push(String(updates.status || 'pending'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'createdAt')) {
    fields.push(`created_at = $${values.length + 1}`);
    values.push(updates.createdAt ? String(updates.createdAt) : null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'expiresAt')) {
    fields.push(`expires_at = $${values.length + 1}`);
    values.push(updates.expiresAt ? String(updates.expiresAt) : null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'acceptedAt')) {
    fields.push(`accepted_at = $${values.length + 1}`);
    values.push(updates.acceptedAt ? String(updates.acceptedAt) : null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'acceptedUsername')) {
    fields.push(`accepted_username = $${values.length + 1}`);
    values.push(updates.acceptedUsername ? String(updates.acceptedUsername) : null);
  }

  if (!fields.length) {
    return true;
  }

  await db.query(
    `UPDATE invites
     SET ${fields.join(', ')}
     WHERE token = $${values.length + 1}`,
    [...values, key]
  );

  return true;
}

module.exports = {
  createInvite,
  findInviteByToken,
  updateInvite
};