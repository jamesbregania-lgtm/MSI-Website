const { getDb, mapMachineRow } = require('./postgres');

async function listMachinesByClientId(clientId) {
  const key = String(clientId || '').trim().toLowerCase();
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT *
     FROM machines
     WHERE lower(trim(client_id)) = $1
     ORDER BY id DESC`,
    [key]
  );
  return rows.map(mapMachineRow);
}

async function addMachine(machine) {
  const db = await getDb();
  await db.query(
    `INSERT INTO machines
    (
      client_id, client_name, location, unit, model, serial_no, date_installed,
      running_hours, status, description, submitted_by, maintenance_service_date,
      part_service_dates, part_service_hours, updates_json, reports_json, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
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
  const target = await db.query(
    `SELECT *
     FROM machines
     WHERE lower(trim(client_id)) = $1
       AND lower(trim(serial_no)) = $2
       AND lower(trim(model)) = $3
       AND trim(date_installed) = $4
     LIMIT 1`,
    [
      String(key.clientId || '').trim().toLowerCase(),
      String(key.serialNo || '').trim().toLowerCase(),
      String(key.model || '').trim().toLowerCase(),
      String(key.dateInstalled || '').trim()
    ]
  );

  if (!target.rows[0]) {
    return null;
  }

  const current = mapMachineRow(target.rows[0]);
  const nextPartServiceDates = updates.partServiceDates && typeof updates.partServiceDates === 'object'
    ? updates.partServiceDates
    : current.partServiceDates;
  const nextPartServiceHours = updates.partServiceHours && typeof updates.partServiceHours === 'object'
    ? updates.partServiceHours
    : current.partServiceHours;
  const nextUpdates = Array.isArray(updates.updates) ? updates.updates : current.updates;

  await db.query(
    `UPDATE machines
     SET running_hours = $1,
       status = $2,
       description = $3,
       maintenance_service_date = $4,
       part_service_dates = $5,
       part_service_hours = $6,
       updates_json = $7,
         updated_at = NOW()
     WHERE id = $8`,
    [
      Number.isFinite(Number(updates.runningHours)) ? Number(updates.runningHours) : current.runningHours,
      updates.status !== undefined ? String(updates.status) : current.status,
      updates.description !== undefined ? String(updates.description || '') : current.description,
      updates.maintenanceServiceDate !== undefined ? String(updates.maintenanceServiceDate || '') : current.maintenanceServiceDate,
      JSON.stringify(nextPartServiceDates),
      JSON.stringify(nextPartServiceHours),
      JSON.stringify(nextUpdates),
      target.rows[0].id
    ]
  );

  const updated = await db.query('SELECT * FROM machines WHERE id = $1', [target.rows[0].id]);
  return mapMachineRow(updated.rows[0]);
}

async function appendMachineReport(key, report) {
  const db = await getDb();
  const target = await db.query(
    `SELECT *
     FROM machines
     WHERE lower(trim(client_id)) = $1
       AND lower(trim(serial_no)) = $2
       AND lower(trim(model)) = $3
       AND trim(date_installed) = $4
     LIMIT 1`,
    [
      String(key.clientId || '').trim().toLowerCase(),
      String(key.serialNo || '').trim().toLowerCase(),
      String(key.model || '').trim().toLowerCase(),
      String(key.dateInstalled || '').trim()
    ]
  );

  if (!target.rows[0]) {
    return null;
  }

  const mapped = mapMachineRow(target.rows[0]);
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

  await db.query(
    `UPDATE machines
     SET reports_json = $1,
         updates_json = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [JSON.stringify(reports), JSON.stringify(updates), target.rows[0].id]
  );

  const updated = await db.query('SELECT * FROM machines WHERE id = $1', [target.rows[0].id]);
  return mapMachineRow(updated.rows[0]);
}

module.exports = {
  listMachinesByClientId,
  addMachine,
  updateMachine,
  appendMachineReport
};
