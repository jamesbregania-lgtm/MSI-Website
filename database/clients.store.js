const { getDb } = require('./sqlite');

function mapClientRow(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location || '',
    status: row.status
  };
}

async function listClients() {
  const db = await getDb();
  const rows = await db.all(
    `SELECT id, name, location, status
     FROM clients
     ORDER BY name ASC`
  );
  return rows.map(mapClientRow);
}

async function listActiveClients() {
  const db = await getDb();
  const rows = await db.all(
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
  const row = await db.get(
    `SELECT id, name, location, status
     FROM clients
     WHERE lower(id) = ?
     LIMIT 1`,
    [key]
  );
  return row ? mapClientRow(row) : null;
}

async function findActiveClientByName(name) {
  const key = String(name || '').trim().toLowerCase();
  const db = await getDb();
  const row = await db.get(
    `SELECT id, name, location, status
     FROM clients
     WHERE lower(trim(name)) = ? AND status != 'inactive'
     LIMIT 1`,
    [key]
  );
  return row ? mapClientRow(row) : null;
}

async function createClient(client) {
  const db = await getDb();
  const id = String(client.id || '').trim().toLowerCase();

  const existing = await db.get(
    'SELECT 1 AS found FROM clients WHERE id = ? LIMIT 1',
    [id]
  );

  if (existing) {
    return false;
  }

  await db.run(
    `INSERT INTO clients (id, name, location, status, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
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
  const target = await db.get(
    'SELECT id FROM clients WHERE id = ? LIMIT 1',
    [key]
  );

  if (!target) {
    return false;
  }

  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    fields.push('name = ?');
    values.push(String(updates.name || '').trim());
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'location')) {
    fields.push('location = ?');
    values.push(String(updates.location || '').trim());
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    fields.push('status = ?');
    values.push(String(updates.status || 'active'));
  }

  if (!fields.length) {
    return true;
  }

  fields.push("updated_at = datetime('now')");

  await db.run(
    `UPDATE clients
     SET ${fields.join(', ')}
     WHERE id = ?`,
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