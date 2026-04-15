const fs = require('fs/promises');
const path = require('path');

const DB_FILE = path.join(__dirname, 'machines.json');

async function ensureDbFile() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, '[]\n', 'utf8');
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

module.exports = {
  listMachinesByClientId,
  addMachine,
  updateMachine
};
