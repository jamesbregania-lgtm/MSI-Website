/* ── SECTION SWITCHING ── */
function switchSection(name, el) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('section-' + name).classList.add('active');
    el.classList.add('active');
}

/* ── MODAL HELPERS ── */
function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function closeOnOverlay(event, id) {
    if (event.target === event.currentTarget) closeModal(id);
}

/* ── EDIT EMPLOYEE ── */
function openEditEmployee(username, fullName, dept, branch) {
    document.getElementById('editEmpUsername').value = username;
    document.getElementById('editEmpFullName').value = fullName;
    document.getElementById('editEmpDept').value     = dept;
    document.getElementById('editEmpBranch').value   = branch;
    openModal('modal-edit-employee');
}

/* ── RESET PASSWORD ── */
function openResetPass(username) {
    document.getElementById('resetPassUsername').value      = username;
    document.getElementById('resetPassDisplay').textContent = username;
    openModal('modal-reset-pass');
}

/* ── TOGGLE EMPLOYEE STATUS ── */
function toggleEmployee(username, status) {
    if (!confirm(`${status === 'inactive' ? 'Deactivate' : 'Reactivate'} account "${username}"?`)) return;
    document.getElementById('toggleEmpUsername').value = username;
    document.getElementById('toggleEmpStatus').value   = status;
    document.getElementById('form-toggle-emp').submit();
}

/* ── EDIT CLIENT ── */
function openEditClient(id, name, location) {
    document.getElementById('editClientId').value       = id;
    document.getElementById('editClientName').value     = name;
    document.getElementById('editClientLocation').value = location || '';
    openModal('modal-edit-client');
}

/* ── TOGGLE CLIENT STATUS ── */
function toggleClient(id, status) {
    if (!confirm(`${status === 'inactive' ? 'Deactivate' : 'Reactivate'} client "${id}"?`)) return;
    document.getElementById('toggleCliId').value     = id;
    document.getElementById('toggleCliStatus').value = status;
    document.getElementById('form-toggle-cli').submit();
}

/* ── EMPLOYEE TABLE FILTER ── */
let currentEmpStatusFilter = 'all';

function filterByStatus(status, el) {
    currentEmpStatusFilter = status;
    document.querySelectorAll('.filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    applyEmpFilters();
}

function filterAccounts() { applyEmpFilters(); }

function applyEmpFilters() {
    const q = document.getElementById('accountSearch').value.toLowerCase().trim();
    document.querySelectorAll('.emp-row').forEach(row => {
        const matchQ = !q || row.innerText.toLowerCase().includes(q);
        const matchS = currentEmpStatusFilter === 'all' || row.dataset.status === currentEmpStatusFilter;
        row.style.display = matchQ && matchS ? '' : 'none';
    });
}

/* ── CLIENT TABLE FILTER ── */
let currentCliStatusFilter = 'all';

function filterClientsByStatus(status, el) {
    currentCliStatusFilter = status;
    document.querySelectorAll('#section-clients .filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    applyCliFilters();
}

function filterClients() { applyCliFilters(); }

function applyCliFilters() {
    const q = document.getElementById('clientSearch').value.toLowerCase().trim();
    document.querySelectorAll('.cli-row').forEach(row => {
        const matchQ = !q || row.innerText.toLowerCase().includes(q);
        const matchS = currentCliStatusFilter === 'all' || row.dataset.status === currentCliStatusFilter;
        row.style.display = matchQ && matchS ? '' : 'none';
    });
}

/* ── TITLE-CASE: Edit Employee Full Name ── */
const editEmpFullName = document.getElementById('editEmpFullName');
if (editEmpFullName) {
    editEmpFullName.addEventListener('input', () => {
        const pos = editEmpFullName.selectionStart;
        editEmpFullName.value = editEmpFullName.value
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
        editEmpFullName.setSelectionRange(pos, pos);
    });
}

/* ── UPPERCASE: Edit Employee Dept & Invite Dept ── */
['editEmpDept', 'inviteDeptInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { el.value = el.value.toUpperCase(); });
});

/* ── FLASH AUTO-DISMISS ── */
const flashMsg = document.getElementById('flashMsg');
if (flashMsg) {
    setTimeout(() => {
        flashMsg.style.transition = 'opacity 0.5s';
        flashMsg.style.opacity    = '0';
        flashMsg.style.pointerEvents = 'none';
        setTimeout(() => { flashMsg.style.display = 'none'; }, 500);
    }, 4000);
}

/* ── CLOSE ALL MODALS ON LOAD (safety reset) ── */
document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('open'));

/* ── URL HASH: jump to clients tab ── */
(function () {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'clients') {
        const btn = document.querySelector('[data-section="clients"]');
        if (btn) switchSection('clients', btn);
    }
})();