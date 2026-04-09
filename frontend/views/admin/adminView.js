const dropdownBtn = document.getElementById('dropdownBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const searchInput = document.getElementById('searchInput');

const sheetBody = document.getElementById('sheetBody');
const tabs = document.getElementById('tabs');
const pageFrame = document.getElementById('pageFrame');
const emptyViewer = document.getElementById('emptyViewer');

const viewBtn = document.getElementById('viewBtn');
const controlsBtn = document.getElementById('controlsBtn');
const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');

const logoutBtn = document.getElementById('logoutBtn');

const rejectModal = document.getElementById('rejectModal');
const rejectCloseBtn = document.getElementById('rejectCloseBtn');
const rejectCancelBtn = document.getElementById('rejectCancelBtn');
const rejectConfirmBtn = document.getElementById('rejectConfirmBtn');
const rejectReasonSelect = document.getElementById('rejectReasonSelect');

const userControlsModal = document.getElementById('userControlsModal');
const userControlsCloseBtn = document.getElementById('userControlsCloseBtn');
const userControlsCancelBtn = document.getElementById('userControlsCancelBtn');
const selectedUserName = document.getElementById('selectedUserName');
const selectedUserStatus = document.getElementById('selectedUserStatus');
const userControlsHint = document.getElementById('userControlsHint');
const banUserBtn = document.getElementById('banUserBtn');
const unbanUserBtn = document.getElementById('unbanUserBtn');

let currentFilter = 'all_users';
let rows = [];
let selectedRow = null;
let loadedPages = [];
let activePageIndex = 0;
let denialReasons = [];

function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  document.cookie = 'authToken=; Max-Age=0; path=/; SameSite=Lax';
}

function getToken() {
  return localStorage.getItem('authToken');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function ensureAdminAccess() {
  try {
    const me = await apiGet('/api/me');
    if (String(me?.profile_type || '').toLowerCase() !== 'admin') {
      window.location.href = '/home';
      return false;
    }
    return true;
  } catch (error) {
    clearAuth();
    window.location.href = '/';
    return false;
  }
}

async function apiGet(url) {
  const res = await fetch(url, {
    headers: authHeaders(),
    credentials: 'same-origin',
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      message = data?.message || message;
    } catch (error) {
      message = await res.text();
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }

  return res.json();
}

async function apiPatch(url, bodyObj = {}) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'same-origin',
    body: JSON.stringify(bodyObj),
  });

  let data = null;
  try {
    data = await res.json();
  } catch (error) {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

function setViewerEmpty() {
  pageFrame.style.display = 'none';
  emptyViewer.style.display = 'flex';
  emptyViewer.innerHTML = 'Select a row on the left and click <b>View</b>.';
  renderTabs([]);
}

function renderTabs(pages) {
  tabs.innerHTML = '';

  const maxTabs = 10;
  for (let i = 0; i < maxTabs; i += 1) {
    const hasPage = i < pages.length;
    const btn = document.createElement('button');
    btn.className = `tab${hasPage ? '' : ' disabled'}`;
    btn.textContent = hasPage ? `${i + 1}` : 'N/A';

    if (hasPage && i === activePageIndex) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      if (!hasPage) return;
      activePageIndex = i;
      renderTabs(loadedPages);
      showPage(i);
    });

    tabs.appendChild(btn);
  }
}

function showPage(index) {
  const page = loadedPages[index];
  if (!page) return;

  const html =
    page.html ||
    `<html><body><pre>No HTML found for page ${index + 1}</pre></body></html>`;

  emptyViewer.style.display = 'none';
  pageFrame.style.display = 'block';

  const doc = pageFrame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
}

async function loadLeftTable() {
  rows = await apiGet(`/api/admin/queue?filter=${encodeURIComponent(currentFilter)}`);
  renderLeftTable();
}

function renderLeftTable() {
  sheetBody.innerHTML = '';
  const q = searchInput.value.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    if (!q) return true;
    const name = (row.name || '').toLowerCase();
    const templateName = (row.template_name || '').toLowerCase();
    const status = (row.status || '').toLowerCase();

    return (
      name.includes(q) ||
      templateName.includes(q) ||
      status.includes(q) ||
      String(row.id).includes(q)
    );
  });

  const MIN_ROWS = 14;
  const totalRows = Math.max(MIN_ROWS, filtered.length);

  for (let i = 0; i < totalRows; i += 1) {
    const row = filtered[i];
    const tr = document.createElement('tr');

    if (row && selectedRow && row.id === selectedRow.id && row.template_mongo_id === selectedRow.template_mongo_id) {
      tr.classList.add('selected');
    }

    if (row) {
      tr.innerHTML = `
        <td>${row.id ?? ''}</td>
        <td>${row.name ?? ''}</td>
        <td>${row.template_name ?? ''}</td>
        <td>${row.status ?? ''}</td>
      `;

      tr.addEventListener('click', () => {
        selectedRow = row;
        renderLeftTable();
      });
    } else {
      tr.innerHTML = '<td></td><td></td><td></td><td></td>';
    }

    sheetBody.appendChild(tr);
  }
}

function selectedTemplateIdOrAlert() {
  if (!selectedRow) {
    alert('Select a template row first.');
    return null;
  }

  if (!selectedRow.template_mongo_id) {
    alert('Select a template row that has a template.');
    return null;
  }

  return selectedRow.template_mongo_id;
}

function selectedUserIdOrAlert() {
  if (!selectedRow) {
    alert('Select a user row first.');
    return null;
  }

  if (!selectedRow.id) {
    alert('This row does not contain a valid user.');
    return null;
  }

  return selectedRow.id;
}

async function refreshAfterReview() {
  selectedRow = null;
  loadedPages = [];
  activePageIndex = 0;
  setViewerEmpty();
  await loadLeftTable();
}

function openRejectModal() {
  rejectModal.classList.add('show');
  rejectModal.setAttribute('aria-hidden', 'false');
}

function closeRejectModal() {
  rejectModal.classList.remove('show');
  rejectModal.setAttribute('aria-hidden', 'true');
}

function populateDenialReasons() {
  rejectReasonSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a reason…';
  rejectReasonSelect.appendChild(placeholder);

  denialReasons.forEach((reason) => {
    const opt = document.createElement('option');
    opt.value = reason.code;
    opt.textContent = reason.text;
    rejectReasonSelect.appendChild(opt);
  });
}

function openUserControlsModal() {
  if (!selectedRow) {
    alert('Select a user row on the left first.');
    return;
  }

  const currentStatus = String(selectedRow.status || '').toLowerCase();
  const isBanned = currentStatus === 'banned';
  const isAdmin = currentStatus === 'admin';

  selectedUserName.textContent = selectedRow.name || `User ${selectedRow.id}`;
  selectedUserStatus.textContent = `Status: ${selectedRow.status || 'Unknown'}`;

  if (isAdmin) {
    userControlsHint.textContent = 'Admin accounts cannot be banned or unbanned from this popup.';
  } else if (isBanned) {
    userControlsHint.textContent = 'This account is currently banned. You can unban it below.';
  } else {
    userControlsHint.textContent = 'This account is active. You can ban it below.';
  }

  banUserBtn.disabled = isBanned || isAdmin;
  unbanUserBtn.disabled = !isBanned || isAdmin;

  userControlsModal.classList.add('show');
  userControlsModal.setAttribute('aria-hidden', 'false');
}

function closeUserControlsModal() {
  userControlsModal.classList.remove('show');
  userControlsModal.setAttribute('aria-hidden', 'true');
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    clearAuth();
    window.location.href = '/';
  });
}

dropdownBtn.addEventListener('click', () => {
  dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

document.addEventListener('click', (e) => {
  if (!dropdownMenu.contains(e.target) && !dropdownBtn.contains(e.target)) {
    dropdownMenu.style.display = 'none';
  }
});

dropdownMenu.querySelectorAll('div').forEach((item) => {
  item.addEventListener('click', async () => {
    dropdownMenu.querySelectorAll('div').forEach((entry) => entry.classList.remove('active'));
    item.classList.add('active');

    currentFilter = item.dataset.filter;
    dropdownMenu.style.display = 'none';

    selectedRow = null;
    loadedPages = [];
    setViewerEmpty();

    await loadLeftTable();
  });
});

searchInput.addEventListener('input', () => renderLeftTable());

viewBtn.addEventListener('click', async () => {
  if (!selectedRow) {
    alert('Select a row on the left first.');
    return;
  }

  if (!selectedRow.template_mongo_id) {
    alert('This row does not have a template to view.');
    return;
  }

  try {
    activePageIndex = 0;
    const data = await apiGet(`/api/templates/${selectedRow.template_mongo_id}/pages`);
    loadedPages = Array.isArray(data.pages) ? data.pages : [];
    renderTabs(loadedPages);

    if (!loadedPages.length) {
      pageFrame.style.display = 'none';
      emptyViewer.style.display = 'flex';
      emptyViewer.textContent = 'No pages found for this template.';
      return;
    }

    showPage(0);
  } catch (error) {
    console.error(error);
    alert('Could not load template pages.');
  }
});

controlsBtn.addEventListener('click', () => {
  openUserControlsModal();
});

banUserBtn.addEventListener('click', async () => {
  const userId = selectedUserIdOrAlert();
  if (!userId) return;

  const ok = confirm(`Ban ${selectedRow.name || `user ${userId}`}?`);
  if (!ok) return;

  try {
    await apiPatch(`/api/admin/users/${userId}/ban`);
    closeUserControlsModal();
    alert('User banned successfully.');
    await refreshAfterReview();
  } catch (error) {
    console.error(error);
    alert(`Ban failed: ${error.message}`);
  }
});

unbanUserBtn.addEventListener('click', async () => {
  const userId = selectedUserIdOrAlert();
  if (!userId) return;

  const ok = confirm(`Unban ${selectedRow.name || `user ${userId}`}?`);
  if (!ok) return;

  try {
    await apiPatch(`/api/admin/users/${userId}/unban`);
    closeUserControlsModal();
    alert('User unbanned successfully.');
    await refreshAfterReview();
  } catch (error) {
    console.error(error);
    alert(`Unban failed: ${error.message}`);
  }
});

approveBtn.addEventListener('click', async () => {
  const templateId = selectedTemplateIdOrAlert();
  if (!templateId) return;

  const ok = confirm('Approve this template and publish it for all users?');
  if (!ok) return;

  try {
    await apiPatch(`/api/admin/templates/${templateId}/approve`, {});
    alert('Template approved and published.');
    await refreshAfterReview();
  } catch (error) {
    console.error(error);
    alert(`Approve failed: ${error.message}`);
  }
});

rejectBtn.addEventListener('click', async () => {
  const templateId = selectedTemplateIdOrAlert();
  if (!templateId) return;

  if (!denialReasons.length) {
    try {
      denialReasons = await apiGet('/api/admin/denial-reasons');
    } catch (error) {
      console.error(error);
      alert('Could not load denial reasons.');
      return;
    }
  }

  populateDenialReasons();
  openRejectModal();
});

rejectCloseBtn.addEventListener('click', closeRejectModal);
rejectCancelBtn.addEventListener('click', closeRejectModal);
userControlsCloseBtn.addEventListener('click', closeUserControlsModal);
userControlsCancelBtn.addEventListener('click', closeUserControlsModal);

rejectModal.addEventListener('click', (e) => {
  if (e.target === rejectModal) closeRejectModal();
});

userControlsModal.addEventListener('click', (e) => {
  if (e.target === userControlsModal) closeUserControlsModal();
});

rejectConfirmBtn.addEventListener('click', async () => {
  const templateId = selectedTemplateIdOrAlert();
  if (!templateId) return;

  const reason_code = rejectReasonSelect.value;
  if (!reason_code) {
    alert('Please select a reason.');
    return;
  }

  try {
    await apiPatch(`/api/admin/templates/${templateId}/reject`, { reason_code });
    closeRejectModal();
    alert('Template denied. The user will see the reason and can re-submit.');
    await refreshAfterReview();
  } catch (error) {
    console.error(error);
    alert(`Reject failed: ${error.message}`);
  }
});

(async function init() {
  setViewerEmpty();

  const allowed = await ensureAdminAccess();
  if (!allowed) return;

  try {
    denialReasons = await apiGet('/api/admin/denial-reasons');
  } catch (error) {
    denialReasons = [];
  }

  try {
    await loadLeftTable();
  } catch (error) {
    console.error(error);
    alert('Failed to load admin data.');
  }
})();
