const express = require('express');
const bcrypt = require('bcryptjs');
const {
  listUserAccounts,
  usernameExists,
  createUserAccount,
  updateUserAccount,
  resetUserPassword,
  setUserStatus
} = require('../database/accounts.store');
const {
  listClients,
  createClient,
  updateClient,
  setClientStatus
} = require('../database/clients.store');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const usernameRegex = /^[a-z_]{4,20}$/;
const passwordRegex = /^.{8,}$/;
const nameRegex = /^[A-Za-z\s.-]+$/;

function properCase(value = '') {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function slugify(value = '') {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function renderAdmin(req, res, { success = null, error = null } = {}) {
  const userAccounts = (await listUserAccounts())
    .slice()
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const sortedClients = (await listClients()).slice().sort((a, b) => a.name.localeCompare(b.name));

  res.render('admin_account', {
    currentUser: req.session.user,
    accounts: userAccounts,
    clients: sortedClients,
    success,
    error
  });
}

router.get('/', requireAdmin, (req, res) => {
  return renderAdmin(req, res);
});

router.post('/employees/create', requireAdmin, async (req, res) => {
  let { username, password, fullName, department, branch } = req.body;

  username = String(username || '').trim().toLowerCase();
  fullName = properCase(fullName || '');
  department = String(department || '').trim().toUpperCase();
  branch = properCase(branch || '');

  if (!usernameRegex.test(username)) {
    return await renderAdmin(req, res, {
      error: 'Username must be 4-20 characters using lowercase letters and underscore only.',
      modal: 'create-employee'
    });
  }

  if (!passwordRegex.test(password || '')) {
    return await renderAdmin(req, res, {
      error: 'Password must be at least 8 characters long.',
      modal: 'create-employee'
    });
  }

  if (!nameRegex.test(fullName)) {
    return await renderAdmin(req, res, {
      error: 'Full name must contain letters and spaces only.'
    });
  }

  if (await usernameExists(username)) {
    return await renderAdmin(req, res, { error: 'Username already exists.' });
  }

  await createUserAccount({
    username,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'user',
    fullName,
    department,
    branch,
    status: 'active'
  });

  return await renderAdmin(req, res, { success: 'Employee account created successfully.' });
});

router.post('/employees/update', requireAdmin, async (req, res) => {
  const { username } = req.body;

  const fullName = properCase(req.body.fullName || '');
  const department = String(req.body.department || '').trim().toUpperCase();
  const branch = properCase(req.body.branch || '');

  if (!nameRegex.test(fullName)) {
    return await renderAdmin(req, res, { error: 'Invalid full name.' });
  }

  const updated = await updateUserAccount(username, {
    fullName,
    department,
    branch
  });

  if (!updated) {
    return await renderAdmin(req, res, { error: 'Employee account not found.' });
  }

  return await renderAdmin(req, res, { success: 'Employee account updated successfully.' });
});

router.post('/employees/reset-password', requireAdmin, async (req, res) => {
  const { username, newPassword } = req.body;

  if (!passwordRegex.test(newPassword || '')) {
    return await renderAdmin(req, res, {
      error: 'New password must be at least 8 characters long.'
    });
  }

  const updated = await resetUserPassword(username, await bcrypt.hash(newPassword, 10));

  if (!updated) {
    return await renderAdmin(req, res, { error: 'Employee account not found.' });
  }

  return await renderAdmin(req, res, { success: 'Password reset successfully.' });
});

router.post('/employees/toggle', requireAdmin, async (req, res) => {
  const { username, status } = req.body;
  const updated = await setUserStatus(username, status === 'inactive' ? 'inactive' : 'active');

  if (!updated) {
    return await renderAdmin(req, res, { error: 'Employee account not found.' });
  }

  return await renderAdmin(req, res, { success: 'Employee status updated successfully.' });
});

router.post('/clients/create', requireAdmin, async (req, res) => {
  const clientName = properCase(req.body.clientName || '');
  const location = properCase(req.body.location || '');
  const id = slugify(clientName);

  if (!clientName) {
    return await renderAdmin(req, res, { error: 'Client name is required.' });
  }

  const created = await createClient({
    id,
    name: clientName,
    location,
    status: 'active'
  });

  if (!created) {
    return await renderAdmin(req, res, { error: 'Client already exists.' });
  }

  return res.redirect('/admin_account#clients');
});

router.post('/clients/update', requireAdmin, async (req, res) => {
  const { clientId } = req.body;
  const updated = await updateClient(clientId, {
    name: properCase(req.body.clientName || ''),
    location: properCase(req.body.location || '')
  });

  if (!updated) {
    return await renderAdmin(req, res, { error: 'Client not found.' });
  }

  return res.redirect('/admin_account#clients');
});

router.post('/clients/toggle', requireAdmin, async (req, res) => {
  const { clientId, status } = req.body;
  const updated = await setClientStatus(clientId, status === 'inactive' ? 'inactive' : 'active');

  if (!updated) {
    return await renderAdmin(req, res, { error: 'Client not found.' });
  }

  return res.redirect('/admin_account#clients');
});

module.exports = router;