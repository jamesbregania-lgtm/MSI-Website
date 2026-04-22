const { getDb } = require('./sqlite');

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

async function listMachinesByClientId(clientId) {
  const key = String(clientId || '').trim().toLowerCase();
  const db = await getDb();
  const rows = await db.all(
    `SELECT *
     FROM machines
     WHERE lower(trim(client_id)) = ?
     ORDER BY id DESC`,
    [key]
  );
  return rows.map(mapMachineRow);
}

async function addMachine(machine) {
  const db = await getDb();
  await db.run(
    `INSERT INTO machines
    (
      client_id, client_name, location, unit, model, serial_no, date_installed,
      running_hours, status, description, submitted_by, maintenance_service_date,
      part_service_dates, part_service_hours, updates_json, reports_json, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      String(machine.clientId || '').trim().toLowerCase(),
      machine.clientName ? String(machine.clientName) : null,
      machine.location ? String(machine.location) : null,
      machine.unit ? String(machine.unit) : null,
      String(machine.model || '').trim(),
      String(machine.serialNo || '').trim(),
      String(machine.dateInstalled || '').trim(),
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

async function updateMachine(key, updates) {
  const db = await getDb();
  const target = await db.get(
    `SELECT *
     FROM machines
     WHERE lower(trim(client_id)) = ?
       AND lower(trim(serial_no)) = ?
       AND lower(trim(model)) = ?
       AND trim(date_installed) = ?
     LIMIT 1`,
    [
      String(key.clientId || '').trim().toLowerCase(),
      String(key.serialNo || '').trim().toLowerCase(),
      String(key.model || '').trim().toLowerCase(),
      String(key.dateInstalled || '').trim()
    ]
  );

  if (!target) {
    return null;
  }

  const current = mapMachineRow(target);
  const nextPartServiceDates = updates.partServiceDates && typeof updates.partServiceDates === 'object'
    ? updates.partServiceDates
    : current.partServiceDates;
  const nextPartServiceHours = updates.partServiceHours && typeof updates.partServiceHours === 'object'
    ? updates.partServiceHours
    : current.partServiceHours;
  const nextUpdates = Array.isArray(updates.updates) ? updates.updates : current.updates;

  await db.run(
    `UPDATE machines
     SET running_hours = ?,
         status = ?,
         description = ?,
         maintenance_service_date = ?,
         part_service_dates = ?,
         part_service_hours = ?,
         updates_json = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      Number.isFinite(Number(updates.runningHours)) ? Number(updates.runningHours) : current.runningHours,
      updates.status !== undefined ? String(updates.status) : current.status,
      updates.description !== undefined ? String(updates.description || '') : current.description,
      updates.maintenanceServiceDate !== undefined ? String(updates.maintenanceServiceDate || '') : current.maintenanceServiceDate,
      JSON.stringify(nextPartServiceDates),
      JSON.stringify(nextPartServiceHours),
      JSON.stringify(nextUpdates),
      target.id
    ]
  );

  const updated = await db.get('SELECT * FROM machines WHERE id = ?', [target.id]);
  return mapMachineRow(updated);
}

async function appendMachineReport(key, report) {
  const db = await getDb();
  const target = await db.get(
    `SELECT *
     FROM machines
     WHERE lower(trim(client_id)) = ?
       AND lower(trim(serial_no)) = ?
       AND lower(trim(model)) = ?
       AND trim(date_installed) = ?
     LIMIT 1`,
    [
      String(key.clientId || '').trim().toLowerCase(),
      String(key.serialNo || '').trim().toLowerCase(),
      String(key.model || '').trim().toLowerCase(),
      String(key.dateInstalled || '').trim()
    ]
  );

  if (!target) {
    return null;
  }

  const mapped = mapMachineRow(target);
  const reports = Array.isArray(mapped.reports) ? mapped.reports.slice() : [];
  const updates = Array.isArray(mapped.updates) ? mapped.updates.slice() : [];
  reports.push(report);

  // Keep Machine History aligned with the saved report team and tie report to update row.
  if (report && report.submittedBy && updates.length > 0) {
    const requestedIndex = Number(report.updateIndex);
    const hasRequestedIndex = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < updates.length;
    const updateTarget = hasRequestedIndex
      ? updates[requestedIndex]
      : updates[updates.length - 1];

    updateTarget.submittedBy = String(report.submittedBy);
    updateTarget.report = { ...report };
  }

  await db.run(
    `UPDATE machines
     SET reports_json = ?, updates_json = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [JSON.stringify(reports), JSON.stringify(updates), target.id]
  );

  const updated = await db.get('SELECT * FROM machines WHERE id = ?', [target.id]);
  return mapMachineRow(updated);
}

module.exports = {
  listMachinesByClientId,
  addMachine,
  updateMachine,
  appendMachineReport
};
