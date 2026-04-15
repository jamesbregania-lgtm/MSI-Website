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

    allMachines = Array.isArray(MACHINE_RECORDS) ? MACHINE_RECORDS : [];
    document.getElementById('machine-count').textContent = allMachines.length;
    filteredMachines = allMachines;
    currentPage = 1;
    try {
        renderTable(filteredMachines);
    } catch (error) {
        const tbody = document.getElementById('machine-tbody');
        tbody.innerHTML = `<tr><td colspan="8" class="loading-row">Failed to render records. Please refresh.</td></tr>`;
        console.error('Render table error:', error);
    }

    refreshMachinesFromServer();
}

displayClientData();

async function refreshMachinesFromServer() {
    if (!client) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`/client/${encodeURIComponent(CLIENT_ID)}/machines`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return;
        }

        const payload = await response.json();
        if (!payload.ok || !Array.isArray(payload.machineRecords)) {
            return;
        }

        allMachines = payload.machineRecords;
        filteredMachines = allMachines;
        currentPage = 1;
        document.getElementById('machine-count').textContent = allMachines.length;
        renderTable(filteredMachines);
    } catch (error) {
        // Keep preloaded rows when refresh fails.
        console.warn('Machine refresh failed; using preloaded records.', error);
    }
}

// Format for date display
function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const rawDate = String(dateStr).trim();
    const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
    ];
    const ymdMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10);
        const day = parseInt(ymdMatch[3], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${monthNames[month - 1]} ${day}, ${year}`;
        }
    }
    const dmyMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10);
        const year = parseInt(dmyMatch[3], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${monthNames[month - 1]} ${day}, ${year}`;
        }
    }
    const date = new Date(rawDate);
    if (!Number.isNaN(date.getTime())) {
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    return rawDate;
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
    const rawDate = String(dateStr).trim();
    const dmyMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
        const d = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
        return isNaN(d.getTime()) ? null : d;
    }
    const ymdMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
        const d = new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function getTodayDateString() {
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
}

function getPartsCatalogLocation(record) {
    const unitKey = Object.keys(PARTS_CATALOG).find(
        key => key.toUpperCase() === (record?.unit || '').toUpperCase().trim()
    ) || '';
    const modelMap = unitKey ? (PARTS_CATALOG[unitKey] || {}) : {};
    const modelKey = Object.keys(modelMap).find(
        key => key.toUpperCase() === (record?.model || '').toUpperCase().trim()
    ) || '';

    return { unitKey, modelKey, modelMap };
}


function getMaintenanceAnchorDate(dateInstalled, record) {
    let anchorDate = null;

    if (record?.maintenanceServiceDate) {
        anchorDate = parseDateStr(record.maintenanceServiceDate);
    }

    if (!anchorDate) {
        anchorDate = parseDateStr(dateInstalled);
    }

    return anchorDate;
}

function calculateNextMaintenanceResult(dateInstalled, runningHoursSeconds, record, maintenanceIntervalDays = 750) {
    const anchorDate = getMaintenanceAnchorDate(dateInstalled, record);

    if (!anchorDate) {
        return { label: '—', date: null };
    }

    // Calculate maintenance date from the most recent maintenance anchor.
    const maintenanceDate = new Date(anchorDate);
    maintenanceDate.setDate(anchorDate.getDate() + maintenanceIntervalDays);
    
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const label = `${monthNames[maintenanceDate.getMonth()]} ${maintenanceDate.getDate()}, ${maintenanceDate.getFullYear()}`;
    
    return { label, date: maintenanceDate };
}

function getMaintenanceStatus(dateInstalled, runningHoursSeconds, record, warningDays = 30) {
    const result = calculateNextMaintenanceResult(dateInstalled, runningHoursSeconds, record);
    if (!result.date) {
        return {
            date: null,
            isOverdue: false,
            isDueSoon: false,
            label: '—'
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((result.date - today) / (1000 * 60 * 60 * 24));

    return {
        date: result.date,
        isOverdue: diffDays < 0,
        isDueSoon: diffDays >= 0 && diffDays <= warningDays,
        label: result.label
    };
}

function calculateNextMaintenance(dateInstalled, runningHoursSeconds, record) {
    return calculateNextMaintenanceResult(dateInstalled, runningHoursSeconds, record).label;
}

// Returns true if maintenance is overdue or within the next 30 calendar days
// Fix: Use Math.floor instead of Math.ceil for more accurate "within 30 days" calculation
function isWithin30Days(dateInstalled, runningHoursSeconds, record) {
    const s = getMaintenanceStatus(dateInstalled, runningHoursSeconds, record, 30);
    return s.isOverdue || s.isDueSoon;
}

// Parts warning logic: warn 7 days before expiry; each part keeps its own anchor date.
function getPartStatus(currentHours, part, record) {
    let anchorDate = null;
    let serviceHoursBase = null;

    // Per-part override: if this part was manually marked as serviced, use that date first.
    if (record?.partServiceDates && part?.name) {
        const servicedDate = record.partServiceDates[part.name];
        if (servicedDate) {
            anchorDate = parseDateStr(servicedDate);
        }
    }

    if (record?.partServiceHours && part?.name) {
        const baseHours = Number(record.partServiceHours[part.name]);
        if (Number.isFinite(baseHours)) {
            serviceHoursBase = baseHours;
        }
    }

    // Fallback to machine install date.
    // Important: a normal machine record update must NOT reset all parts.
    if (!anchorDate) {
        anchorDate = parseDateStr(record.dateInstalled);
    }

    // Final fallback
    if (!anchorDate) {
        anchorDate = new Date();
    }

    let expiryDate = null;
    let isOverdue = false;
    let isDueSoon = false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // =========================
    // ✅ MONTH-BASED
    // =========================
    if (part.expiryMonths) {
        expiryDate = addMonths(anchorDate, part.expiryMonths);
    }

    // =========================
    // ✅ HOURS-BASED
    // =========================
    else if (part.expiryHours) {
        const usedHours = serviceHoursBase == null
            ? currentHours
            : Math.max(0, currentHours - serviceHoursBase);
        const hoursLeft = part.expiryHours - usedHours;

        expiryDate = new Date(anchorDate);

        if (!isNaN(hoursLeft)) {
            const daysRemaining = Math.round(hoursLeft / 24);
            expiryDate.setDate(expiryDate.getDate() + daysRemaining);
        }
    }

    // =========================
    // ❗ SAFETY CHECK
    // =========================
    if (!expiryDate || isNaN(expiryDate.getTime())) {
        return {
            expiryDate: null,
            isOverdue: false,
            isDueSoon: false,
            label: 'No expiry set'
        };
    }

    // =========================
    // STATUS CHECK
    // =========================
    const diffDays = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

    isOverdue = diffDays < 0;
    isDueSoon = diffDays >= 0 && diffDays <= 7;  // Parts warn 7 days before expiry

    // =========================
    // FORMAT DATE
    // =========================
    const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
    ];
    const dayNames = [
        'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'
    ];

    const formattedDate = `${dayNames[expiryDate.getDay()]}, ${monthNames[expiryDate.getMonth()]} ${expiryDate.getDate()}, ${expiryDate.getFullYear()}`;

    // =========================
    // FINAL LABEL - NO "OVERDUE" prefix
    // =========================
    const label = formattedDate;

    return {
        expiryDate,
        isOverdue,
        isDueSoon,
        label
    };
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

const PARTS_CATALOG = {
  CIJ: {
    '9450': [
      { name: 'ENM 38941 GUTTER BLOCK', expiryMonths: 4 },
      { name: 'ENM 47458 EHV COVER', expiryMonths: 6 },
      { name: 'ENM 49967 EQUIP PRINT HEADBOARD', expiryMonths: 6 },
      { name: 'ENM 46408 FOUR ELECTOVALVE BLOCK', expiryMonths: 4 },
      { name: 'ENM 38980 MODULATION ASSEMBLY', expiryMonths: 6 },
      { name: 'A40846 RECOVERY TOOL', expiryHours: 8000 },
      { name: 'ENM 40209 AIR FILTER' , expiryHours: 8000},
      { name: 'ENM 19134 INK FILTER' , expiryHours: 8000},
      { name: 'ENM 40830 IP54 OUTLET FOAM FILTER' , expiryHours: 8000},
      { name: 'ENM 5629 PRESSURE PUMP' , expiryHours: 8000}
      
    ],
    '9410': [
      { name: 'ENM 38941 GUTTER BLOCK', expiryMonths: 4 },
      { name: 'ENM 47458 EHV COVER', expiryMonths: 6 },
      { name: 'ENM 49967 EQUIP PRINT HEADBOARD', expiryMonths: 6 },
      { name: 'ENM 46408 FOUR ELECTOVALVE BLOCK', expiryMonths: 4 },
      { name: 'ENM 38980 MODULATION ASSEMBLY', expiryMonths: 6 },
      { name: 'A40846 RECOVERY TOOL', expiryHours: 8000 },
      { name: 'ENM 40209 AIR FILTER' , expiryHours: 8000},
      { name: 'ENM 19134 INK FILTER' , expiryHours: 8000},
      { name: 'ENM 40830 IP54 OUTLET FOAM FILTER' , expiryHours: 8000},
      { name: 'ENM 5629 PRESSURE PUMP' , expiryHours: 8000}
    ],
    '9450S': [
      { name: 'ENM 38941 GUTTER BLOCK', expiryMonths: 4 },
      { name: 'ENM 47458 EHV COVER', expiryMonths: 6 },
      { name: 'ENM 49967 EQUIP PRINT HEADBOARD', expiryMonths: 6 },
      { name: 'ENM 46408 FOUR ELECTOVALVE BLOCK', expiryMonths: 4 },
      { name: 'ENM 38980 MODULATION ASSEMBLY', expiryMonths: 6 },
      { name: 'A40846 RECOVERY TOOL', expiryHours: 8000 },
      { name: 'ENM 40209 AIR FILTER' , expiryHours: 8000},
      { name: 'ENM 19134 INK FILTER' , expiryHours: 8000},
      { name: 'ENM 40830 IP54 OUTLET FOAM FILTER' , expiryHours: 8000},
      { name: 'ENM 5629 PRESSURE PUMP' , expiryHours: 8000}
    ],
    '9450E': [
      { name: 'ENM 38941 GUTTER BLOCK', expiryMonths: 4 },
      { name: 'ENM 47458 EHV COVER', expiryMonths: 6 },
      { name: 'ENM 49967 EQUIP PRINT HEADBOARD', expiryMonths: 6 },
      { name: 'ENM 46408 FOUR ELECTOVALVE BLOCK', expiryMonths: 4 },
      { name: 'ENM 38980 MODULATION ASSEMBLY', expiryMonths: 6 },
      { name: 'A40846 RECOVERY TOOL', expiryHours: 8000 },
      { name: 'ENM 40209 AIR FILTER' , expiryHours: 8000},
      { name: 'ENM 19134 INK FILTER' , expiryHours: 8000},
      { name: 'ENM 40830 IP54 OUTLET FOAM FILTER' , expiryHours: 8000},
      { name: 'ENM 5629 PRESSURE PUMP' , expiryHours: 8000}
    ]
  },
  // Other units: models/parts to be added later
  TTO: {},
  'P&A': {},
  DOD: {},
  LASER: {},
  SUNINE: {},
  ANSER: {},
};

function addMonths(date, months) {
    const d = new Date(date);
    const originalDay = d.getDate();

    d.setMonth(d.getMonth() + months);

    // Fix overflow (e.g., Feb 30 → Feb 28)
    if (d.getDate() < originalDay) {
        d.setDate(0);
    }

    return d;
}

function hasDueSoonPart(record) {
    const { unitKey, modelKey } = getPartsCatalogLocation(record);
    if (!unitKey) return false;
    if (!modelKey) return false;

    const parts = (PARTS_CATALOG[unitKey] || {})[modelKey];
    const currentHours = (record._runningSeconds || 0) / 3600;
    
    // Check each part - if ANY part is overdue OR due soon, return true
    for (const p of parts) {
        const s = getPartStatus(currentHours, p, record);
        if (s.isOverdue || s.isDueSoon) {
            return true;  // Warning icon should appear
        }
    }
    return false;
}

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
        const warn = isWithin30Days(r.dateInstalled, r._runningSeconds, r) || hasDueSoonPart(r);

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
    const maintenanceStatus = getMaintenanceStatus(record.dateInstalled, record._runningSeconds, record, 30);
    const { unitKey, modelKey } = getPartsCatalogLocation(record);
    const partsForModel = unitKey && modelKey ? ((PARTS_CATALOG[unitKey] || {})[modelKey] || []) : [];
    const currentHours = (record._runningSeconds || 0) / 3600;

    const detailParts = [];

    if (maintenanceStatus.label !== '—') {
        detailParts.push({
            name: 'MAINTENANCE',
            date: maintenanceStatus.label
        });
    }

    partsForModel.forEach(part => {
        const partStatus = getPartStatus(currentHours, part, record);
        detailParts.push({
            name: part.name,
            date: partStatus.label || '—'
        });
    });

    const detailListItems = detailParts.length
        ? detailParts.map(item => `<li class="detail-parts-item">
                <span class="detail-parts-name">${escapeHtml(item.name)}</span>
                <span class="detail-parts-date">${escapeHtml(item.date)}</span>
            </li>`).join('')
        : `<div class="detail-parts-empty">No parts data found for this model.</div>`;

    const statusClass = (record.status || '').toLowerCase() === 'active' ? 'status-active'
        : (record.status || '').toLowerCase() === 'decommissioned' ? 'status-decommissioned'
        : 'status-inactive';

    detailList.innerHTML = `
        <div class="detail-identity">
            <div class="detail-identity-cell">
                <div class="detail-identity-label">Unit</div>
                <div class="detail-identity-value">${escapeHtml(record.unit || '—')}</div>
            </div>
            <div class="detail-identity-cell">
                <div class="detail-identity-label">Model</div>
                <div class="detail-identity-value">${escapeHtml(record.model || '—')}</div>
            </div>
            <div class="detail-identity-cell">
                <div class="detail-identity-label">Serial No.</div>
                <div class="detail-identity-value">${escapeHtml(record.serialNo || '—')}</div>
            </div>
        </div>
        <div class="detail-field">
            <span class="detail-field-label">Installed</span>
            <span class="detail-field-value">${formatDateDisplay(record.dateInstalled)}</span>
        </div>
        <div class="detail-field">
            <span class="detail-field-label">Running Hours</span>
            <span class="detail-field-value">${formatRunningHoursOnly(record._runningSeconds)} hrs</span>
        </div>
        <div class="detail-field">
            <span class="detail-field-label">Maintenance</span>
            <span class="detail-field-value${nextMaintenance === 'Overdue' ? ' overdue' : ''}" id="detail-next-maintenance">${nextMaintenance}</span>
        </div>
        <div class="detail-field">
            <span class="detail-field-label">Status</span>
            <span class="detail-field-value"><span class="status-badge ${statusClass}">${escapeHtml(record.status || '—')}</span></span>
        </div>
        <div class="detail-field">
            <span class="detail-field-label">Description</span>
            <span class="detail-field-value" style="${!record.description ? 'color:var(--muted);font-style:italic;' : ''}">${escapeHtml(record.description || 'No description')}</span>
        </div>
        <div class="detail-field" style="border-bottom:none;">
            <span class="detail-field-label">Submitted By</span>
            <span class="detail-field-value">${escapeHtml(submittedByText)}</span>
        </div>
        <div class="detail-parts-section">
            <div class="detail-parts-heading">Parts / Maintenance</div>
            <ul class="detail-parts-list">${detailListItems}</ul>
        </div>
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
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editForm = document.getElementById('editForm');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
let editDraft = null;
let activeConfirmResolver = null;

function showConfirmDialog(options = {}) {
    const {
        title = 'Please Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        tone = 'default'
    } = options;

    if (!confirmOverlay || !confirmTitle || !confirmMessage || !confirmOkBtn || !confirmCancelBtn) {
        return Promise.resolve(window.confirm(message));
    }

    if (activeConfirmResolver) {
        activeConfirmResolver(false);
        activeConfirmResolver = null;
    }

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOkBtn.textContent = confirmText;
    confirmCancelBtn.textContent = cancelText;

    confirmOkBtn.classList.remove('is-warning', 'is-danger');
    if (tone === 'warning') confirmOkBtn.classList.add('is-warning');
    if (tone === 'danger') confirmOkBtn.classList.add('is-danger');

    confirmOverlay.style.display = 'grid';
    requestAnimationFrame(() => confirmOkBtn.focus());

    return new Promise((resolve) => {
        activeConfirmResolver = resolve;
    });
}

function resolveConfirmDialog(result) {
    if (!activeConfirmResolver) return;
    const resolver = activeConfirmResolver;
    activeConfirmResolver = null;
    confirmOverlay.style.display = 'none';
    resolver(result);
}

function clonePartMap(map) {
    if (!map || typeof map !== 'object') return {};
    return { ...map };
}

function buildEditDraft(record, index) {
    return {
        index,
        runningHours: formatRunningHoursOnly(record._runningSeconds),
        status: record.status || '',
        description: record.description || '',
        maintenanceServiceDate: record.maintenanceServiceDate || '',
        partServiceDates: clonePartMap(record.partServiceDates),
        partServiceHours: clonePartMap(record.partServiceHours)
    };
}

function clearEditDraft() {
    editDraft = null;
}

function syncEditDraftFromInputs() {
    if (!editDraft) return;
    editDraft.runningHours = document.getElementById('edit-runningHours').value || '0';
    editDraft.status = document.getElementById('edit-status').value || '';
    editDraft.description = document.getElementById('edit-description').value || '';
}

async function closeEditModal(discardChanges = false) {
    if (!discardChanges && hasEditDraftChanges()) {
        const shouldDiscard = await showConfirmDialog({
            title: 'Discard Changes?',
            message: 'You have unsaved updates in this form. Discard them?',
            confirmText: 'Discard',
            cancelText: 'Keep Editing',
            tone: 'warning'
        });
        if (!shouldDiscard) return;
    }

    editPopup.style.display = 'none';
    clearEditDraft();
}

function hasEditDraftChanges() {
    if (!editDraft) return false;
    const index = editDraft.index;
    const record = allMachines[index];
    if (!record) return false;

    const liveHours = formatRunningHoursOnly(record._runningSeconds);
    const draftHours = String(editDraft.runningHours || '0');
    const liveStatus = record.status || '';
    const liveDescription = record.description || '';
    const liveMaintenanceServiceDate = record.maintenanceServiceDate || '';

    const liveDates = JSON.stringify(clonePartMap(record.partServiceDates));
    const draftDates = JSON.stringify(clonePartMap(editDraft.partServiceDates));
    const livePartHours = JSON.stringify(clonePartMap(record.partServiceHours));
    const draftPartHours = JSON.stringify(clonePartMap(editDraft.partServiceHours));

    return (
        draftHours !== liveHours ||
        (editDraft.status || '') !== liveStatus ||
        (editDraft.description || '') !== liveDescription ||
        (editDraft.maintenanceServiceDate || '') !== liveMaintenanceServiceDate ||
        draftDates !== liveDates ||
        draftPartHours !== livePartHours
    );
}

function validateEditFormInputs() {
    const runningInput = document.getElementById('edit-runningHours');
    const statusInput = document.getElementById('edit-status');

    const runningRaw = String(runningInput.value || '').trim();
    const runningNum = Number(runningRaw);

    if (runningRaw === '') {
        return { valid: false, message: 'Running Hours is required.' };
    }
    if (!Number.isFinite(runningNum) || Number.isNaN(runningNum)) {
        return { valid: false, message: 'Running Hours must be a valid number.' };
    }
    if (runningNum < 0) {
        return { valid: false, message: 'Running Hours cannot be negative.' };
    }
    if (!Number.isInteger(runningNum)) {
        return { valid: false, message: 'Running Hours must be a whole number.' };
    }
    if (!statusInput.value) {
        return { valid: false, message: 'Status is required.' };
    }

    return { valid: true };
}

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

    editDraft = buildEditDraft(record, index);

    // Pre-fill editable fields
    document.getElementById('edit-runningHours').value = editDraft.runningHours;

    const statusSel = document.getElementById('edit-status');
    statusSel.value = editDraft.status;

    document.getElementById('edit-description').value = editDraft.description;

    syncEditDraftFromInputs();

    // Parts checker is fixed to this machine's existing unit/model.
    const { unitKey, modelKey } = getPartsCatalogLocation(record);

    renderPartsList(unitKey, modelKey, record._runningSeconds, record, editDraft);

    // Store which record we're editing
    editForm.dataset.index = index;

    editPopup.style.display = 'grid';
};
function renderPartsList(unitKey, modelKey, runningSeconds, record, draftState = null) {
    const partsBody = document.getElementById('parts-tbody');
    if (!unitKey || !modelKey) {
        partsBody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:var(--muted);padding:12px;">No parts data for this machine.</td></tr>`;
        return;
    }
    const parts = (PARTS_CATALOG[unitKey] || {})[modelKey] || [];
    if (!parts.length) {
        partsBody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:var(--muted);padding:12px;">No parts listed for this model.</td></tr>`;
        return;
    }
    const currentHours = (runningSeconds || 0) / 3600;
    const recordIndex = findMachineIndexByRecord(record);
    const statusRecord = draftState
        ? {
            ...record,
            maintenanceServiceDate: draftState.maintenanceServiceDate || '',
            partServiceDates: clonePartMap(draftState.partServiceDates),
            partServiceHours: clonePartMap(draftState.partServiceHours)
        }
        : record;

    const maintenanceStatus = getMaintenanceStatus(record.dateInstalled, runningSeconds, statusRecord, 30);
    let maintenanceRow = '';

    if (maintenanceStatus.isOverdue || maintenanceStatus.isDueSoon) {
        const maintenanceBadge = maintenanceStatus.isOverdue
            ? `<button type="button" class="parts-badge parts-badge-overdue parts-badge-action" title="Mark maintenance as completed today" onclick="markMaintenanceAsServiced(${recordIndex})">OVERDUE</button>`
            : `<button type="button" class="parts-badge parts-badge-soon parts-badge-action" title="Mark maintenance as completed today" onclick="markMaintenanceAsServiced(${recordIndex})">⚠ DUE SOON</button>`;
        const maintenanceRowClass = maintenanceStatus.isOverdue ? 'parts-row-overdue' : 'parts-row-soon';
        maintenanceRow = `<tr class="${maintenanceRowClass}">
            <td class="parts-cell-part">MAINTENANCE</td>
            <td class="parts-cell-status">
                <div class="parts-status-wrapper">
                    ${maintenanceBadge}
                    <span class="parts-expiry-label">${escapeHtml(maintenanceStatus.label)}</span>
                </div>
            </td>
        </tr>`;
    }

    const partRows = parts.map(p => {
        const s = getPartStatus(currentHours, p, statusRecord);
        if (!s.isOverdue && !s.isDueSoon) {
            return '';
        }

        let statusBadge, rowClass = '';
        let displayLabel = s.label;
        
        if (s.isOverdue) {
            statusBadge = `<button type="button" class="parts-badge parts-badge-overdue parts-badge-action" title="Mark this part as replaced today" onclick="markPartAsServiced(${recordIndex}, '${encodeURIComponent(p.name)}')">OVERDUE</button>`;
            rowClass = 'parts-row-overdue';
            // Remove "OVERDUE — " prefix from the label since badge already shows it
            displayLabel = s.label.replace(/^OVERDUE —\s*/, '');
        } else if (s.isDueSoon) {
            statusBadge = `<button type="button" class="parts-badge parts-badge-soon parts-badge-action" title="Mark this part as replaced today" onclick="markPartAsServiced(${recordIndex}, '${encodeURIComponent(p.name)}')">⚠ DUE SOON</button>`;
            rowClass = 'parts-row-soon';
            // Remove "DUE SOON — " prefix if it exists
            displayLabel = s.label.replace(/^DUE SOON —\s*/, '');
        }
        
        return `<tr class="${rowClass}">
            <td class="parts-cell-part">${escapeHtml(p.name)}</td>
            <td class="parts-cell-status">
                <div class="parts-status-wrapper">
                    ${statusBadge}
                    <span class="parts-expiry-label">${escapeHtml(displayLabel)}</span>
                </div>
            </td>
         </tr>`;
    }).join('');

    const alertRows = `${maintenanceRow}${partRows}`;
    partsBody.innerHTML = alertRows || `<tr><td colspan="2" style="text-align:center;color:var(--muted);padding:14px;font-size:13px;">No due soon or overdue items.</td></tr>`;
}

window.markMaintenanceAsServiced = async function(index) {
    const record = allMachines[index];
    if (!record || !editDraft || editDraft.index !== index) return;

    const shouldApply = await showConfirmDialog({
        title: 'Confirm Maintenance Completion',
        message: 'Mark preventive maintenance as completed today?',
        confirmText: 'Apply Update',
        cancelText: 'Cancel',
        tone: 'warning'
    });
    if (!shouldApply) return;

    const todayStr = getTodayDateString();
    editDraft.maintenanceServiceDate = todayStr;

    const { unitKey, modelKey } = getPartsCatalogLocation(record);

    renderPartsList(unitKey, modelKey, record._runningSeconds || 0, record, editDraft);
};

window.markPartAsServiced = async function(index, encodedPartName) {
    const record = allMachines[index];
    if (!record || !editDraft || editDraft.index !== index) return;

    const partName = decodeURIComponent(encodedPartName || '');
    if (!partName) return;

    const shouldApply = await showConfirmDialog({
        title: 'Confirm Part Replacement',
        message: `Mark "${partName}" as replaced today?`,
        confirmText: 'Apply Update',
        cancelText: 'Cancel',
        tone: 'warning'
    });
    if (!shouldApply) return;

    if (!editDraft.partServiceDates || typeof editDraft.partServiceDates !== 'object') {
        editDraft.partServiceDates = {};
    }
    if (!editDraft.partServiceHours || typeof editDraft.partServiceHours !== 'object') {
        editDraft.partServiceHours = {};
    }

    // Use current date as the new anchor date for this part.
    const todayStr = getTodayDateString();
    syncEditDraftFromInputs();

    editDraft.partServiceDates[partName] = todayStr;
    editDraft.partServiceHours[partName] = Number(editDraft.runningHours) || ((record._runningSeconds || 0) / 3600);

    const { unitKey, modelKey } = getPartsCatalogLocation(record);

    renderPartsList(unitKey, modelKey, record._runningSeconds || 0, record, editDraft);
};

// Helper function to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

closeEditPopup.addEventListener('click', async () => {
    await closeEditModal();
});

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', async () => {
        await closeEditModal();
    });
}

if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', () => {
        resolveConfirmDialog(true);
    });
}

if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
        resolveConfirmDialog(false);
    });
}

if (confirmOverlay) {
    confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) {
            resolveConfirmDialog(false);
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (!confirmOverlay || confirmOverlay.style.display === 'none' || !activeConfirmResolver) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        resolveConfirmDialog(false);
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        resolveConfirmDialog(true);
    }
});

document.getElementById('edit-runningHours').addEventListener('input', syncEditDraftFromInputs);
document.getElementById('edit-status').addEventListener('change', syncEditDraftFromInputs);
document.getElementById('edit-description').addEventListener('input', syncEditDraftFromInputs);

editPopup.addEventListener('click', (e) => {
    if (e.target === editPopup) {
        closeEditModal();
    }
});

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    syncEditDraftFromInputs();

    const index = parseInt(editForm.dataset.index, 10);
    const record = allMachines[index];
    if (!record) return;

    const validation = validateEditFormInputs();
    if (!validation.valid) {
        showToast(validation.message, 'warning');
        return;
    }

    if (!hasEditDraftChanges()) {
        showToast('No changes to save.', 'info');
        return;
    }

    const confirmSave = await showConfirmDialog({
        title: 'Save Update?',
        message: 'Apply these machine updates now?',
        confirmText: 'Save Update',
        cancelText: 'Review Again',
        tone: 'default'
    });
    if (!confirmSave) return;

    const newRunningHours = parseInt(document.getElementById('edit-runningHours').value, 10) || 0;
    const newStatus = document.getElementById('edit-status').value;
    const newDescription = document.getElementById('edit-description').value;

    if (!Array.isArray(record.updates)) record.updates = [];

    const todayStr = getTodayDateString();

    record.updates.push({
        date: todayStr,
        submittedBy: typeof CURRENT_USER_FULLNAME !== 'undefined' ? CURRENT_USER_FULLNAME : 'Unknown User',
        status: newStatus,
        runningHours: newRunningHours,
        description: newDescription
    });

    // Apply updated values to the record
    record.runningHours = newRunningHours;
    record._runningSeconds = newRunningHours * 3600;
    record.status = newStatus;
    record.description = newDescription;

    if (editDraft) {
        record.maintenanceServiceDate = editDraft.maintenanceServiceDate || '';
        record.partServiceDates = clonePartMap(editDraft.partServiceDates);
        record.partServiceHours = clonePartMap(editDraft.partServiceHours);
    }

    try {
        const response = await fetch(`/client/${encodeURIComponent(CLIENT_ID)}/machines/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                serialNo: record.serialNo,
                model: record.model,
                dateInstalled: record.dateInstalled,
                runningHours: newRunningHours,
                status: newStatus,
                description: newDescription,
                maintenanceServiceDate: editDraft ? editDraft.maintenanceServiceDate || '' : '',
                partServiceDates: editDraft ? clonePartMap(editDraft.partServiceDates) : {},
                partServiceHours: editDraft ? clonePartMap(editDraft.partServiceHours) : {},
                updates: record.updates
            })
        });

        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            throw new Error(payload.error || 'Failed to save updates.');
        }

        Object.assign(record, payload.machine);
        record._runningSeconds = (Number(payload.machine.runningHours) || 0) * 3600;

        // Keep the modal open after saving so user can continue updating parts.
        // Modal will close only when the user explicitly closes it.
        editDraft = buildEditDraft(record, index);

        const { unitKey, modelKey } = getPartsCatalogLocation(record);

        renderPartsList(unitKey, modelKey, record._runningSeconds, record, editDraft);

        // Re-render — warning icon will disappear automatically if the new
        // maintenance date is now more than 30 days away
        renderTable(filteredMachines);

        // Refresh detail popup if it is still open for this record
        if (detailPopup.style.display !== 'none' && currentDetailIndex === index) {
            showDetails(index);
        }

        showToast('Record updated successfully.', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to save updates.', 'warning');
    }
});

function showToast(message, type = 'success') {
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

    if (type === 'warning') {
        toast.style.background = '#b45309';
    } else if (type === 'info') {
        toast.style.background = '#2a6499';
    } else {
        toast.style.background = '#1e7c3a';
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}