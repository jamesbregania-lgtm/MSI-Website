const express = require('express');
const { listActiveClients, findClientById } = require('../database/clients.store');
const { listMachinesByClientId, updateMachine } = require('../database/machines.store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:clientId/machines', requireAuth, async (req, res) => {
  try {
    const clientId = String(req.params.clientId || '').trim();
    const client = await findClientById(clientId);

    if (!client) {
      return res.status(404).json({ ok: false, error: 'Client not found.' });
    }

    const machineRecords = await listMachinesByClientId(client.id);
    return res.json({ ok: true, machineRecords });
  } catch (error) {
    console.error('Failed to load client machines:', error);
    return res.status(500).json({ ok: false, error: 'Failed to load machine records.' });
  }
});

router.get('/:clientId', requireAuth, async (req, res) => {
  try {
    const activeClients = await listActiveClients();
    const clientId = req.params.clientId;
    const client = await findClientById(clientId);
    const machineRecords = client ? await listMachinesByClientId(client.id) : [];

    res.render('client', {
      currentUser: req.session.user,
      clientId,
      clients: activeClients,
      machineRecords
    });
  } catch (error) {
    console.error('Failed to render client page:', error);
    res.status(500).render('client', {
      currentUser: req.session.user,
      clientId: req.params.clientId || '',
      clients: [],
      machineRecords: []
    });
  }
});

router.post('/:clientId/machines/update', requireAuth, async (req, res) => {
  const clientId = String(req.params.clientId || '').trim();
  const {
    serialNo,
    model,
    dateInstalled,
    runningHours,
    status,
    description,
    maintenanceServiceDate,
    partServiceDates,
    partServiceHours,
    updates
  } = req.body || {};

  if (!serialNo || !model || !dateInstalled) {
    return res.status(400).json({ ok: false, error: 'Missing machine identity fields.' });
  }

  const parsedRunningHours = Number(runningHours);
  if (!Number.isFinite(parsedRunningHours) || parsedRunningHours < 0) {
    return res.status(400).json({ ok: false, error: 'Invalid runningHours value.' });
  }

  if (!status || typeof status !== 'string') {
    return res.status(400).json({ ok: false, error: 'Status is required.' });
  }

  const safeUpdates = Array.isArray(updates) ? updates : [];

  const machine = await updateMachine(
    { clientId, serialNo, model, dateInstalled },
    {
      runningHours: parsedRunningHours,
      status: String(status),
      description: String(description || ''),
      maintenanceServiceDate: String(maintenanceServiceDate || ''),
      partServiceDates: partServiceDates && typeof partServiceDates === 'object' ? partServiceDates : {},
      partServiceHours: partServiceHours && typeof partServiceHours === 'object' ? partServiceHours : {},
      updates: safeUpdates
    }
  );

  if (!machine) {
    return res.status(404).json({ ok: false, error: 'Machine record not found.' });
  }

  return res.json({ ok: true, machine });
});

module.exports = router;