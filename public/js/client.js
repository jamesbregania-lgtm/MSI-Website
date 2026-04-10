let allMachines = [];
let filteredMachines = [];
let currentDetailIndex = null;
let currentPage = 1;
const PAGE_SIZE = 10;

const client = CLIENTS.find(c => c.id.toLowerCase() === decodeURIComponent(CLIENT_ID).toLowerCase());

function displayClientData() {
    if (!client) {
        document.title = 'Client not found — MSI';
        document.getElementById('page-title').textContent = 'Client not found';
        document.getElementById('profile-name').textContent = 'Client not found';
        document.getElementById('profile-location').textContent = '';
        document.getElementById('machine-tbody').innerHTML =
            `<tr><td colspan="8" class="loading-row">No client matched "${CLIENT_ID}".</td></tr>`;
        return;
    }

    document.title = `${client.name} — MSI`;
    document.getElementById('profile-name').textContent = client.name;
    document.getElementById('profile-location').textContent = client.location || 'N/A';
    document.getElementById('profile-avatar').textContent = client.name.charAt(0).toUpperCase();

    if (APPS_SCRIPT_URL) {
        loadMachines(client.name);
    } else {
        allMachines = Array.isArray(MACHINE_RECORDS) ? MACHINE_RECORDS : [];
        document.getElementById('machine-count').textContent = allMachines.length;
        filteredMachines = allMachines;
        currentPage = 1;
        renderTable(filteredMachines);
    }
}

displayClientData();

async function loadMachines(clientName) {
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?client=${encodeURIComponent(clientName)}`);
        const data = await res.json();
        allMachines = Array.isArray(data) ? data : [];
        document.getElementById('machine-count').textContent = allMachines.length;
        filteredMachines = allMachines;
        currentPage = 1;
        renderTable(filteredMachines);
    } catch (err) {
        allMachines = Array.isArray(MACHINE_RECORDS) ? MACHINE_RECORDS : [];
        document.getElementById('machine-count').textContent = allMachines.length;
        filteredMachines = allMachines;
        currentPage = 1;
        renderTable(filteredMachines);
    }
}

// Format for date display
function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
    ];
    const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10);
        const day = parseInt(ymdMatch[3], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${monthNames[month - 1]} ${day}, ${year}`;
        }
    }
    const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10);
        const year = parseInt(dmyMatch[3], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${monthNames[month - 1]} ${day}, ${year}`;
        }
    }
    const date = new Date(dateStr);
    if (!Number.isNaN(date.getTime())) {
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    return dateStr;
}

function parseRunningHoursToSeconds(value) {
    if (value == null || value === '') return 0;
    let text = String(value).trim();
    const colonParts = text.split(':').map(part => part.trim());
    if (colonParts.length >= 2 && colonParts.every(part => /^\d+$/.test(part))) {
        let seconds = 0;
        if (colonParts.length === 3) {
            seconds = Number(colonParts[0]) * 3600 + Number(colonParts[1]) * 60 + Number(colonParts[2]);
        } else if (colonParts.length === 2) {
            seconds = Number(colonParts[0]) * 60 + Number(colonParts[1]);
        }
        return seconds;
    }
    if (!Number.isNaN(Number(text))) {
        return Math.round(Number(text) * 3600);
    }
    return 0;
}

function formatRunningHoursOnly(seconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const hrs = Math.floor(totalSeconds / 3600);
    return String(hrs);
}

// Helper: parse a date string (dd/mm/yyyy or yyyy-mm-dd) into a Date object
function parseDateStr(dateStr) {
    if (!dateStr) return null;
    const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
        const d = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
        return isNaN(d.getTime()) ? null : d;
    }
    const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
        const d = new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}


function calculateNextMaintenanceResult(dateInstalled, runningHoursSeconds, record, maintenanceIntervalHours = 14000) {
    if (!runningHoursSeconds && runningHoursSeconds !== 0) return { label: '—', date: null };

    const currentHours = runningHoursSeconds / 3600;
    const hoursRemaining = maintenanceIntervalHours - currentHours;

    if (hoursRemaining <= 0) {
        return { label: 'Overdue', date: null };
    }

    // Determine the anchor date:
    // 1. If the record has update entries, use the date of the LATEST update.
    // 2. Otherwise fall back to the original install date.
    let anchorDate = null;

    if (record && Array.isArray(record.updates) && record.updates.length > 0) {
        const lastUpdate = record.updates[record.updates.length - 1];
        anchorDate = parseDateStr(lastUpdate.date);
    }

    // Fall back to install date if no update date was resolved
    if (!anchorDate) {
        anchorDate = parseDateStr(dateInstalled);
    }

    // Last resort: use today so the UI never breaks
    if (!anchorDate) {
        anchorDate = new Date();
        anchorDate.setHours(0, 0, 0, 0);
    }

    const daysRemaining = hoursRemaining / 24;
    const maintenanceDate = new Date(anchorDate);
    maintenanceDate.setDate(anchorDate.getDate() + Math.round(daysRemaining));

    const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
    ];
    const label = `${monthNames[maintenanceDate.getMonth()]} ${maintenanceDate.getDate()}, ${maintenanceDate.getFullYear()}`;
    return { label, date: maintenanceDate };
}

function calculateNextMaintenance(dateInstalled, runningHoursSeconds, record) {
    return calculateNextMaintenanceResult(dateInstalled, runningHoursSeconds, record).label;
}

// Returns true if maintenance is overdue or falls within the next 30 days
function isWithin30Days(dateInstalled, runningHoursSeconds, record) {
    const result = calculateNextMaintenanceResult(dateInstalled, runningHoursSeconds, record);
    if (result.label === 'Overdue') return true;
    if (!result.date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = (result.date - today) / (1000 * 60 * 60 * 24);
    return diff <= 30;
}

function findMachineIndexByRecord(record) {
    if (!record || !Array.isArray(allMachines)) return -1;
    const idx = allMachines.findIndex(r =>
        (r.serialNo || '') === (record.serialNo || '') &&
        (r.model || '') === (record.model || '') &&
        (r.dateInstalled || '') === (record.dateInstalled || '')
    );
    return idx >= 0 ? idx : -1;
}

//  Pagination helpers 

function getTotalPages(records) {
    return Math.max(1, Math.ceil(records.length / PAGE_SIZE));
}

function getPageSlice(records, page) {
    const start = (page - 1) * PAGE_SIZE;
    return records.slice(start, start + PAGE_SIZE);
}

function renderPagination(records) {
    const total = getTotalPages(records);
    const bar = document.getElementById('pagination-bar');
    const pages = document.getElementById('pagination-pages');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (records.length === 0) {
        bar.style.display = 'none';
        return;
    }

    bar.style.display = 'flex';
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= total;

    pages.innerHTML = '';
    const pageLabel = document.createElement('span');
    pageLabel.className = 'page-num-btn';
    pageLabel.textContent = currentPage;
    pages.appendChild(pageLabel);
}

function goToPage(p) {
    const total = getTotalPages(filteredMachines);
    currentPage = Math.max(1, Math.min(p, total));
    renderTable(filteredMachines);
}

window.changePage = function(delta) {
    goToPage(currentPage + delta);
};

//  Warning icon SVG 
const WARNING_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
     fill="#e67e22" class="warning-icon" aria-label="Maintenance due soon">
  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
</svg>`;

//  Table rendering ─

function renderTable(records) {
    const tbody = document.getElementById('machine-tbody');

    if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No records found.</td></tr>`;
        document.getElementById('pagination-bar').style.display = 'none';
        return;
    }

    records.forEach(r => {
        if (typeof r._runningSeconds === 'undefined') {
            r._runningSeconds = parseRunningHoursToSeconds(r.runningHours);
        }
    });

    const pageRecords = getPageSlice(records, currentPage);
    const globalOffset = (currentPage - 1) * PAGE_SIZE;

    tbody.innerHTML = pageRecords.map((r, i) => {
        const globalI = globalOffset + i;
        const recordIndex = findMachineIndexByRecord(r);

        // Pass the full record so the calculation uses the correct anchor date
        const nextMaintenance = calculateNextMaintenance(r.dateInstalled, r._runningSeconds, r);
        const warn = isWithin30Days(r.dateInstalled, r._runningSeconds, r);

        // The # cell is clickable (shows warning icon) when maintenance is near
        const numCell = warn
            ? `<td class="warn-cell">
                 <span class="maintenance-warning" title="Maintenance due soon — click to update"
                       onclick="event.stopPropagation(); openEditModal(${recordIndex})">
                   ${WARNING_ICON_SVG}
                 </span>
               </td>`
            : `<td>${globalI + 1}</td>`;

        return `
            <tr class="clickable-row" onclick="showDetails(${recordIndex})">
                ${numCell}
                <td>${r.unit || '—'}</td>
                <td>${r.model || '—'}</td>
                <td>${r.serialNo || '—'}</td>
                <td>${formatDateDisplay(r.dateInstalled)}</td>
                <td class="running-hours" data-index="${recordIndex}">${formatRunningHoursOnly(r._runningSeconds)}</td>
                <td>${r.status || '—'}</td>
                <td class="${nextMaintenance === 'Overdue' ? 'overdue' : ''}">${nextMaintenance}</td>
            </tr>
        `;
    }).join('');

    renderPagination(records);
}

function filterSerial() {
    const q = document.getElementById('serialSearch').value.toLowerCase().trim();
    filteredMachines = allMachines.filter(r =>
        [r.unit, r.model, r.serialNo, r.dateInstalled, r.runningHours, r.status, r.description]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q))
    );
    currentPage = 1;
    renderTable(filteredMachines);
}

//  Detail popup 

const detailPopup = document.getElementById('detailPopup');
const detailList = document.getElementById('detailList');
const closePopup = document.getElementById('closePopup');

window.showDetails = function(index) {
    const record = allMachines[index];
    if (!record) return;

    if (typeof record._runningSeconds === 'undefined') {
        record._runningSeconds = parseRunningHoursToSeconds(record.runningHours);
    }

    const submittedByText = record.submittedBy && record.submittedBy.trim()
        ? record.submittedBy
        : 'Unknown User';

    // Pass full record so anchor date is resolved correctly
    const nextMaintenance = calculateNextMaintenance(record.dateInstalled, record._runningSeconds, record);
    const historyRows = buildHistoryRows(record);

    detailList.innerHTML = `
        <dt>Unit</dt><dd>${record.unit || '—'}</dd>
        <dt>Model</dt><dd>${record.model || '—'}</dd>
        <dt>Serial No.</dt><dd>${record.serialNo || '—'}</dd>
        <dt>Date Installed</dt><dd>${formatDateDisplay(record.dateInstalled)}</dd>
        <dt>Running Hours</dt><dd>${formatRunningHoursOnly(record._runningSeconds)} hrs</dd>
        <dt>Maintenance</dt><dd id="detail-next-maintenance" class="${nextMaintenance === 'Overdue' ? 'overdue' : ''}">${nextMaintenance}</dd>
        <dt>Status</dt><dd>${record.status || '—'}</dd>
        <dt>Description</dt><dd>${record.description || '—'}</dd>
        <dt>Submitted By</dt><dd>${submittedByText}</dd>
    `;

    // Show/hide View History button
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    viewHistoryBtn.style.display = 'inline-flex';
    viewHistoryBtn.onclick = () => openHistoryModal(index);

    detailPopup.style.display = 'grid';
    currentDetailIndex = index;
};

closePopup.addEventListener('click', () => {
    detailPopup.style.display = 'none';
    currentDetailIndex = null;
});

detailPopup.addEventListener('click', (e) => {
    if (e.target === detailPopup) {
        detailPopup.style.display = 'none';
        currentDetailIndex = null;
    }
});

//  Unit update history builder ─

function buildHistoryRows(record) {
    const rows = [];
    // Original install row
    rows.push({
        date: record.dateInstalled,
        tech: record.submittedBy || 'Unknown User',
        status: record.status || '—',
        isOriginal: true
    });
    // Additional updates
    if (Array.isArray(record.updates)) {
        record.updates.forEach(u => {
            rows.push({
                date: u.date || '—',
                tech: u.submittedBy || 'Unknown User',
                status: u.status || '—',
                isOriginal: false,
                detail: u
            });
        });
    }
    return rows;
}

//  History modal ─

const historyPopup = document.getElementById('historyPopup');
const historyList = document.getElementById('historyList');
const closeHistoryPopup = document.getElementById('closeHistoryPopup');

function openHistoryModal(index) {
    const record = allMachines[index];
    if (!record) return;

    const rows = buildHistoryRows(record);

    historyList.innerHTML = rows.map((row) => `
        <tr>
            <td>${formatDateDisplay(row.date)}</td>
            <td>${row.tech}</td>
            <td>${row.status}</td>
        </tr>
    `).join('');

    historyPopup.style.display = 'grid';
}

closeHistoryPopup.addEventListener('click', () => {
    historyPopup.style.display = 'none';
});

historyPopup.addEventListener('click', (e) => {
    if (e.target === historyPopup) {
        historyPopup.style.display = 'none';
    }
});

//  Edit / Update modal ─

const editPopup = document.getElementById('editPopup');
const closeEditPopup = document.getElementById('closeEditPopup');
const editForm = document.getElementById('editForm');

window.openEditModal = function(index) {
    const record = allMachines[index];
    if (!record) return;

    if (typeof record._runningSeconds === 'undefined') {
        record._runningSeconds = parseRunningHoursToSeconds(record.runningHours);
    }

    // Display only (not editable)
    document.getElementById('edit-unit-display').textContent = record.unit || '—';
    document.getElementById('edit-model-display').textContent = record.model || '—';
    document.getElementById('edit-serial-display').textContent = record.serialNo || '—';

    // Pre-fill editable fields
    document.getElementById('edit-runningHours').value = formatRunningHoursOnly(record._runningSeconds);

    const statusSel = document.getElementById('edit-status');
    statusSel.value = record.status || '';

    document.getElementById('edit-description').value = record.description || '';
    document.getElementById('edit-history').value = record.history || '';

    // Store which record we're editing
    editForm.dataset.index = index;

    editPopup.style.display = 'grid';
};

closeEditPopup.addEventListener('click', () => {
    editPopup.style.display = 'none';
});

editPopup.addEventListener('click', (e) => {
    if (e.target === editPopup) {
        editPopup.style.display = 'none';
    }
});

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = parseInt(editForm.dataset.index, 10);
    const record = allMachines[index];
    if (!record) return;

    const newRunningHours = parseInt(document.getElementById('edit-runningHours').value, 10) || 0;
    const newStatus = document.getElementById('edit-status').value;
    const newDescription = document.getElementById('edit-description').value;
    const newHistory = document.getElementById('edit-history').value;

    if (!Array.isArray(record.updates)) record.updates = [];

    // Record TODAY as the anchor date for this update.
    // calculateNextMaintenanceResult will use this date going forward so that
    // the next maintenance is projected from "now" with the new running hours.
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

    record.updates.push({
        date: todayStr,
        submittedBy: typeof CURRENT_USER_FULLNAME !== 'undefined' ? CURRENT_USER_FULLNAME : 'Unknown User',
        status: newStatus,
        runningHours: newRunningHours,
        description: newDescription,
        history: newHistory
    });

    // Apply updated values to the record
    record.runningHours = newRunningHours;
    record._runningSeconds = newRunningHours * 3600;
    record.status = newStatus;
    record.description = newDescription;
    record.history = newHistory;

    editPopup.style.display = 'none';

    // Re-render — warning icon will disappear automatically if the new
    // maintenance date is now more than 30 days away
    renderTable(filteredMachines);

    // Refresh detail popup if it is still open for this record
    if (detailPopup.style.display !== 'none' && currentDetailIndex === index) {
        showDetails(index);
    }

    showToast('Record updated successfully.');
});

function showToast(message) {
    let toast = document.getElementById('update-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'update-toast';
        toast.style.cssText = `
            position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
            background: #1e7c3a; color: #fff; padding: 12px 24px;
            border-radius: 8px; font-size: 14px; font-weight: 600;
            box-shadow: 0 4px 16px rgba(0,0,0,0.18); z-index: 9999;
            transition: opacity 0.4s;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}