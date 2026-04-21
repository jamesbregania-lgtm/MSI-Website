const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : __dirname;
const DB_FILE = path.join(DATA_DIR, 'machines.json');
const LEGACY_DB_FILE = path.join(__dirname, 'machines.json');

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
      await fs.writeFile(DB_FILE, '[]\n', 'utf8');
    }
  }
}

async function readMachines() {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeMachines(machines) {
  await fs.writeFile(DB_FILE, JSON.stringify(machines, null, 2), 'utf8');
}

async function listMachinesByClientId(clientId) {
  const machines = await readMachines();
  const key = String(clientId || '').trim().toLowerCase();
  return machines.filter(m => String(m.clientId || '').trim().toLowerCase() === key);
}

async function addMachine(machine) {
  const machines = await readMachines();
  machines.push({
    ...machine,
    clientId: String(machine.clientId || '').trim().toLowerCase(),
    serialNo: String(machine.serialNo || '').trim(),
    model: String(machine.model || '').trim(),
    dateInstalled: String(machine.dateInstalled || '').trim()
  });
  await writeMachines(machines);
}

function isSameMachine(machine, key) {
  return (
    String(machine.clientId || '').trim().toLowerCase() === String(key.clientId || '').trim().toLowerCase() &&
    String(machine.serialNo || '').trim().toLowerCase() === String(key.serialNo || '').trim().toLowerCase() &&
    String(machine.model || '').trim().toLowerCase() === String(key.model || '').trim().toLowerCase() &&
    String(machine.dateInstalled || '').trim() === String(key.dateInstalled || '').trim()
  );
}

async function updateMachine(key, updates) {
  const machines = await readMachines();
  const target = machines.find(machine => isSameMachine(machine, key));

  if (!target) {
    return null;
  }

  Object.assign(target, updates);
  await writeMachines(machines);
  return target;
}

async function appendMachineReport(key, report) {
  const machines = await readMachines();
  const target = machines.find(machine => isSameMachine(machine, key));

  if (!target) {
    return null;
  }

  if (!Array.isArray(target.reports)) {
    target.reports = [];
  }

  target.reports.push(report);

  // Keep Machine History aligned with the saved report team and tie report to update row.
  if (report && report.submittedBy && Array.isArray(target.updates) && target.updates.length > 0) {
    const requestedIndex = Number(report.updateIndex);
    const hasRequestedIndex = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < target.updates.length;
    const updateTarget = hasRequestedIndex
      ? target.updates[requestedIndex]
      : target.updates[target.updates.length - 1];

    updateTarget.submittedBy = String(report.submittedBy);
    updateTarget.report = { ...report };
  }

  await writeMachines(machines);
  return target;
}

module.exports = {
  listMachinesByClientId,
  addMachine,
  updateMachine,
  appendMachineReport
};
