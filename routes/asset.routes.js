const express = require('express');
const clients = require('../data/clients');
const machines = require('../data/machines');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Parts catalog with all models and their parts
const PARTS_CATALOG = {
  CIJ: {
    '9450': [
      { name: 'ENM 38941 GUTTER BLOCK', expiryMonths: 4 },
      { name: 'ENM 47458 EHV COVER', expiryMonths: 6 },
      { name: 'ENM 49967 EQUIP PRINT HEADBOARD', expiryMonths: 6 },
      { name: 'ENM 46408 FOUR ELECTOVALVE BLOCK', expiryMonths: 4 },
      { name: 'ENM 38980 MODULATION ASSEMBLY', expiryMonths: 6 },
      { name: 'PREVENTIVE MAINTENANCE', expiryHours: 8000 }
    ],
    '9410': [
      { name: 'ENM 38941 GUTTER BLOCK', expiryMonths: 4 },
      { name: 'ENM 47458 EHV COVER', expiryMonths: 6 },
      { name: 'ENM 49967 EQUIP PRINT HEADBOARD', expiryMonths: 6 },
      { name: 'ENM 46408 FOUR ELECTOVALVE BLOCK', expiryMonths: 4 },
      { name: 'ENM 38980 MODULATION ASSEMBLY', expiryMonths: 6 },
      { name: 'PREVENTIVE MAINTENANCE', expiryHours: 8000 }
    ],
    '9450S': [
      { name: 'ENM 38941 GUTTER BLOCK', expiryMonths: 4 },
      { name: 'ENM 47458 EHV COVER', expiryMonths: 6 },
      { name: 'ENM 49967 EQUIP PRINT HEADBOARD', expiryMonths: 6 },
      { name: 'ENM 46408 FOUR ELECTOVALVE BLOCK', expiryMonths: 4 },
      { name: 'ENM 38980 MODULATION ASSEMBLY', expiryMonths: 6 },
      { name: 'PREVENTIVE MAINTENANCE', expiryHours: 8000 }
    ],
    '9450E': [
      { name: 'ENM 38941 GUTTER BLOCK', expiryMonths: 4 },
      { name: 'ENM 47458 EHV COVER', expiryMonths: 6 },
      { name: 'ENM 49967 EQUIP PRINT HEADBOARD', expiryMonths: 6 },
      { name: 'ENM 46408 FOUR ELECTOVALVE BLOCK', expiryMonths: 4 },
      { name: 'ENM 38980 MODULATION ASSEMBLY', expiryMonths: 6 },
      { name: 'PREVENTIVE MAINTENANCE', expiryHours: 8000 }
    ]
  },
  TTO: {},
  'P&A': {},
  DOD: {},
  LASER: {},
  SUNINE: {},
  ANSER: {}
};

router.get('/new-machine', requireAuth, (req, res) => {
  const activeClients = clients
    .filter(c => c.status !== 'inactive')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedClientId = req.query.clientId || '';

  res.render('user_asset_form', {
    currentUser: req.session.user,
    clients: activeClients,
    selectedClientId,
    success: null,
    error: null,
    savedAsset: null,
    partsCatalog: PARTS_CATALOG
  });
});

router.post('/new-machine', requireAuth, (req, res) => {
  const activeClients = clients.filter(c => c.status !== 'inactive');
  let { clientId, unit, model, serialNo, dateInstalled, runningHours, status, description, history } = req.body;

  // Normalize model to uppercase for consistency
  if (model) {
    model = model.toUpperCase().trim();
  }

  // Fallback: if clientId is empty but clientName was submitted, match by name.
  if (!clientId && req.body.clientName) {
    const matched = activeClients.find(
      c => c.name.toLowerCase() === req.body.clientName.trim().toLowerCase()
    );
    if (matched) clientId = matched.id;
  }

  // Validate all required fields including unit
  if (!clientId || !unit || !model || !serialNo || !dateInstalled || !runningHours || !status) {
    return res.render('user_asset_form', {
      currentUser: req.session.user,
      clients: activeClients,
      selectedClientId: clientId || '',
      success: null,
      error: 'Please fill in all required fields (Client, Unit, Model, Serial No, Date Installed, Running Hours, Status).',
      savedAsset: null,
      partsCatalog: PARTS_CATALOG
    });
  }

  const client = clients.find(c => c.id === clientId);

  // Convert date format into dd/mm/yyyy for consistent display/storage
  let installedDate = dateInstalled || '';
  const ymdMatch = installedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    installedDate = `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  }

  const dmyMatch = installedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0');
    const month = String(dmyMatch[2]).padStart(2, '0');
    const year = dmyMatch[3];
    installedDate = `${day}/${month}/${year}`;
  }

  const asset = {
    clientId,
    clientName: client ? client.name : 'Unknown Client',
    location: client ? client.location : 'Unknown',
    unit,
    model,
    serialNo,
    dateInstalled: installedDate,
    runningHours,
    status,
    description,
    history: history || '',
    submittedBy: req.session.user
      ? req.session.user.fullName || req.session.user.username || 'Unknown User'
      : 'Unknown User'
  };

  machines.push(asset);

  res.render('user_asset_form', {
    currentUser: req.session.user,
    clients: activeClients,
    selectedClientId: clientId,
    success: 'Printer asset request submitted successfully.',
    error: null,
    savedAsset: asset,
    partsCatalog: PARTS_CATALOG
  });
});

module.exports = router;