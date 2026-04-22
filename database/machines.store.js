const { getDb } = require('./memory');

function cloneMachine(machine) {
  return {
    ...machine,
    partServiceDates: { ...(machine.partServiceDates || {}) },
    partServiceHours: { ...(machine.partServiceHours || {}) },
    updates: Array.isArray(machine.updates) ? machine.updates.map(item => ({ ...item })) : [],
    reports: Array.isArray(machine.reports) ? machine.reports.map(item => ({ ...item })) : []
  };
}

async function listMachinesByClientId(clientId) {
  const key = String(clientId || '').trim().toLowerCase();
  const db = await getDb();
  return db.machines
    .filter(machine => String(machine.clientId || '').trim().toLowerCase() === key)
    .slice()
    .reverse()
    .map(cloneMachine);
}

async function addMachine(machine) {
  const db = await getDb();
  const clientIdKey = String(machine.clientId || '').trim().toLowerCase();
  const identity = {
    clientId: clientIdKey,
    clientName: machine.clientName ? String(machine.clientName) : null,
    location: machine.location ? String(machine.location) : null,
    unit: machine.unit ? String(machine.unit) : null,
    model: String(machine.model || '').trim(),
    serialNo: String(machine.serialNo || '').trim(),
    dateInstalled: String(machine.dateInstalled || '').trim(),
    runningHours: Number.isFinite(Number(machine.runningHours)) ? Number(machine.runningHours) : 0,
    status: machine.status ? String(machine.status) : null,
    description: machine.description ? String(machine.description) : '',
    submittedBy: machine.submittedBy ? String(machine.submittedBy) : null,
    maintenanceServiceDate: machine.maintenanceServiceDate ? String(machine.maintenanceServiceDate) : '',
    partServiceDates: machine.partServiceDates && typeof machine.partServiceDates === 'object' ? machine.partServiceDates : {},
    partServiceHours: machine.partServiceHours && typeof machine.partServiceHours === 'object' ? machine.partServiceHours : {},
    updates: Array.isArray(machine.updates) ? machine.updates : [],
    reports: Array.isArray(machine.reports) ? machine.reports : []
  };

  db.machines.push(identity);
}

async function updateMachine(key, updates) {
  const db = await getDb();
  const target = db.machines.find(machine => (
    String(machine.clientId || '').trim().toLowerCase() === String(key.clientId || '').trim().toLowerCase() &&
    String(machine.serialNo || '').trim().toLowerCase() === String(key.serialNo || '').trim().toLowerCase() &&
    String(machine.model || '').trim().toLowerCase() === String(key.model || '').trim().toLowerCase() &&
    String(machine.dateInstalled || '').trim() === String(key.dateInstalled || '').trim()
  ));

  if (!target) {
    return null;
  }

  target.runningHours = Number.isFinite(Number(updates.runningHours)) ? Number(updates.runningHours) : target.runningHours;
  target.status = updates.status !== undefined ? String(updates.status) : target.status;
  target.description = updates.description !== undefined ? String(updates.description || '') : target.description;
  target.maintenanceServiceDate = updates.maintenanceServiceDate !== undefined ? String(updates.maintenanceServiceDate || '') : target.maintenanceServiceDate;
  target.partServiceDates = updates.partServiceDates && typeof updates.partServiceDates === 'object' ? updates.partServiceDates : target.partServiceDates;
  target.partServiceHours = updates.partServiceHours && typeof updates.partServiceHours === 'object' ? updates.partServiceHours : target.partServiceHours;
  target.updates = Array.isArray(updates.updates) ? updates.updates : target.updates;

  return cloneMachine(target);
}

async function appendMachineReport(key, report) {
  const db = await getDb();
  const target = db.machines.find(machine => (
    String(machine.clientId || '').trim().toLowerCase() === String(key.clientId || '').trim().toLowerCase() &&
    String(machine.serialNo || '').trim().toLowerCase() === String(key.serialNo || '').trim().toLowerCase() &&
    String(machine.model || '').trim().toLowerCase() === String(key.model || '').trim().toLowerCase() &&
    String(machine.dateInstalled || '').trim() === String(key.dateInstalled || '').trim()
  ));

  if (!target) {
    return null;
  }

  const reports = Array.isArray(target.reports) ? target.reports.slice() : [];
  const updates = Array.isArray(target.updates) ? target.updates.slice() : [];
  reports.push({ ...report });

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

  target.reports = reports;
  target.updates = updates;

  return cloneMachine(target);
}

module.exports = {
  listMachinesByClientId,
  addMachine,
  updateMachine,
  appendMachineReport
};
