const { getDb, mapClientRow } = require('./postgres');

async function listClients() {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT id, name, location, status
     FROM clients
     ORDER BY name ASC`
  );
  return rows.map(mapClientRow);
}

async function listActiveClients() {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT id, name, location, status
     FROM clients
     WHERE status != 'inactive'
     ORDER BY name ASC`
  );
  return rows.map(mapClientRow);
}

async function findClientById(clientId) {
  const key = String(clientId || '').toLowerCase();
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT id, name, location, status
     FROM clients
     WHERE lower(id) = $1
     LIMIT 1`,
    [key]
  );
  return rows[0] ? mapClientRow(rows[0]) : null;
}

async function findActiveClientByName(name) {
  const key = String(name || '').trim().toLowerCase();
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT id, name, location, status
     FROM clients
     WHERE lower(trim(name)) = $1 AND status != 'inactive'
     LIMIT 1`,
    [key]
  );
  return rows[0] ? mapClientRow(rows[0]) : null;
}

async function createClient(client) {
  const db = await getDb();
  const id = String(client.id || '').trim().toLowerCase();

  const existing = await db.query(
    'SELECT 1 AS found FROM clients WHERE id = $1 LIMIT 1',
    [id]
  );

  if (existing.rows[0]) {
    return false;
  }

  await db.query(
    `INSERT INTO clients (id, name, location, status, updated_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [
      id,
      String(client.name || '').trim(),
      String(client.location || '').trim(),
      String(client.status || 'active')
    ]
  );

  return true;
}

async function updateClient(clientId, updates) {
  const db = await getDb();
  const key = String(clientId || '').trim().toLowerCase();
  const target = await db.query(
    'SELECT id FROM clients WHERE id = $1 LIMIT 1',
    [key]
  );

  if (!target.rows[0]) {
    return false;
  }

  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    fields.push(`name = $${values.length + 1}`);
    values.push(String(updates.name || '').trim());
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'location')) {
    fields.push(`location = $${values.length + 1}`);
    values.push(String(updates.location || '').trim());
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    fields.push(`status = $${values.length + 1}`);
    values.push(String(updates.status || 'active'));
  }

  if (!fields.length) {
    return true;
  }

  fields.push('updated_at = NOW()');

  await db.query(
    `UPDATE clients
     SET ${fields.join(', ')}
     WHERE id = $${values.length + 1}`,
    [...values, key]
  );

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