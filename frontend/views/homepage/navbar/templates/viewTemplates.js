const API_BASE = '/api/templates';
const MAX_TEMPLATES = 10;

let templates = [];
let activeTemplateId = null;

let pubModal = null;
let pubListEl = null;
let pubTabsEl = null;
let pubFrameEl = null;
let pubTitleEl = null;
let pubMetaEl = null;
let pubDownloadBtn = null;
let pubCloseBtn = null;

let publishedResults = [];
let selectedPublishedTemplate = null;
let selectedPublishedPages = [];
let selectedPublishedPageIndex = 0;

let statusBoxEl = null;

function getToken() {
  return localStorage.getItem('authToken');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function initTemplateStore() {
  if (templates.length > 0) return;
  await reloadMyTemplatesFromServer({ fallbackIfEmpty: true });
}

export function setupTemplateControls() {
  const templateSelect = document.getElementById('templateSelect');
  const newTemplateButton = document.getElementById('newTemplateButton');
  const downloadTemplateButton = document.getElementById('downloadTemplateButton');
  const publishTemplateButton = document.getElementById('publishTemplateButton');
  const deleteTemplateButton = document.getElementById('deleteTemplateButton');
  const templateSearchInput = document.getElementById('templateSearchInput');
  const templateSearchButton = document.getElementById('templateSearchButton');
  const saveTemplateButton = document.getElementById('saveTemplateButton');

  if (
    !templateSelect ||
    !newTemplateButton ||
    !saveTemplateButton ||
    !downloadTemplateButton ||
    !publishTemplateButton ||
    !deleteTemplateButton ||
    !templateSearchInput ||
    !templateSearchButton
  ) {
    console.warn('setupTemplateControls: one or more template controls are missing');
    return;
  }

  ensureTemplateStatusBox();
  ensurePublishedLibraryModal();

  renderTemplateSelect();
  updateStatusBox();

  templateSelect.addEventListener('change', (e) => {
    const newId = e.target.value;
    setActiveTemplateById(newId);
    updateStatusBox();
  });

  newTemplateButton.addEventListener('click', () => {
    if (templates.length >= MAX_TEMPLATES) {
      alert(`You can only have up to ${MAX_TEMPLATES} templates per user.`);
      return;
    }

    const name = prompt('Template name:', `Template ${templates.length + 1}`);
    if (!name) return;

    document.dispatchEvent(new CustomEvent('beforeTemplateChange'));

    const tpl = createNewTemplate(name);
    renderTemplateSelect();
    setActiveTemplateIdAndNotify(tpl.id);
    updateStatusBox();
  });

  saveTemplateButton.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('beforeTemplateChange'));
    saveActiveTemplate();
  });

  downloadTemplateButton.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('beforeTemplateChange'));
    downloadActiveTemplate();
  });

  publishTemplateButton.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('beforeTemplateChange'));
    publishActiveTemplate();
  });

  deleteTemplateButton.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('beforeTemplateChange'));
    deleteActiveTemplate();
  });

  async function performPublishedSearch() {
    const term = templateSearchInput.value.trim();
    if (!term) {
      templateSearchInput.focus();
      return;
    }

    try {
      await openPublishedLibrary(term);
    } catch (err) {
      console.error(err);
      alert('Error searching published templates.');
    }
  }

  templateSearchButton.addEventListener('click', () => performPublishedSearch());

  templateSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performPublishedSearch();
    }
  });

  document.addEventListener('templateChanged', () => {
    renderTemplateSelect();
    updateStatusBox();
  });
}

export function getActiveTemplate() {
  return templates.find((t) => t.id === activeTemplateId) || null;
}

export function getTemplates() {
  return templates;
}

function createNewTemplate(name) {
  const tpl = {
    id: generateId(),
    name,
    pages: [
      {
        name: 'Home',
        content: '',
        style: {
          backgroundColor: '#ffffff',
          height: '700px',
          gridEnabled: true,
          width: '800px',
        },
      },
    ],
    publish_status: 'Draft',
    denied_reason_text: null,
    publishedAt: null,
  };
  templates.push(tpl);
  return tpl;
}

function setActiveTemplateById(id) {
  const tpl = templates.find((t) => t.id === id);
  if (!tpl) return;
  document.dispatchEvent(new CustomEvent('beforeTemplateChange'));
  setActiveTemplateIdAndNotify(id);
}

function setActiveTemplateIdAndNotify(id) {
  activeTemplateId = id;
  renderTemplateSelect();
  document.dispatchEvent(
    new CustomEvent('templateChanged', {
      detail: { templateId: activeTemplateId },
    })
  );
}

function renderTemplateSelect() {
  const select = document.getElementById('templateSelect');
  const newTemplateButton = document.getElementById('newTemplateButton');
  if (!select) return;

  select.innerHTML = templates
    .map((tpl) => {
      let labelTag = '';
      if (tpl.publish_status === 'Published') labelTag = ' (Published)';
      else if (tpl.publish_status === 'Requested') labelTag = ' (Pending)';
      else if (tpl.publish_status === 'Denied') labelTag = ' (Denied)';

      return `
        <option value="${tpl.id}" ${tpl.id === activeTemplateId ? 'selected' : ''}>
          ${tpl.name}${labelTag}
        </option>
      `;
    })
    .join('');

  if (newTemplateButton) {
    newTemplateButton.disabled = templates.length >= MAX_TEMPLATES;
  }
}

function generateId() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureTemplateStatusBox() {
  const templatePanel = document.querySelector('.template-controls');
  const templateLabel = document.querySelector('.template-label');
  if (!templatePanel || !templateLabel) return;

  let box = document.getElementById('templateStatusBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'templateStatusBox';
    box.style.display = 'none';
    box.style.padding = '8px 10px';
    box.style.borderRadius = '10px';
    box.style.fontSize = '12px';
    box.style.lineHeight = '1.2';
    box.style.border = '1px solid #ccc';
    box.style.background = '#f7f7f7';
    box.style.marginTop = '6px';

    templateLabel.insertAdjacentElement('afterend', box);
  }
  statusBoxEl = box;
}

function updateStatusBox() {
  if (!statusBoxEl) return;

  const tpl = getActiveTemplate();
  if (!tpl) {
    statusBoxEl.style.display = 'none';
    return;
  }

  if (tpl.publish_status === 'Denied' && tpl.denied_reason_text) {
    statusBoxEl.style.display = 'block';
    statusBoxEl.style.borderColor = '#d9534f';
    statusBoxEl.style.background = '#ffe9e9';
    statusBoxEl.innerHTML = `<b>Denied:</b> ${escapeHtml(tpl.denied_reason_text)}<br/><span style="color:#555;">You can edit and re-submit using “Submit for Publishing”.</span>`;
    return;
  }

  if (tpl.publish_status === 'Requested') {
    statusBoxEl.style.display = 'block';
    statusBoxEl.style.borderColor = '#2b6cb0';
    statusBoxEl.style.background = '#eef5ff';
    statusBoxEl.innerHTML = '<b>Pending Approval:</b> This template is waiting for an Admin review.';
    return;
  }

  if (tpl.publish_status === 'Published') {
    statusBoxEl.style.display = 'block';
    statusBoxEl.style.borderColor = '#2e7d32';
    statusBoxEl.style.background = '#e9ffe9';
    statusBoxEl.innerHTML = '<b>Published:</b> This template is live in the library.';
    return;
  }

  statusBoxEl.style.display = 'none';
}

function downloadActiveTemplate() {
  const tpl = getActiveTemplate();
  if (!tpl) {
    alert('No active template to download.');
    return;
  }

  const snapshot = {
    id: tpl.id,
    name: tpl.name,
    publish_status: tpl.publish_status,
    denied_reason_text: tpl.denied_reason_text,
    pages: tpl.pages.map((p) => ({
      name: p.name,
      content: p.content,
      style: p.style || null,
    })),
  };

  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const safeName = tpl.name.replace(/\s+/g, '_').toLowerCase();
  a.href = url;
  a.download = `${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

async function publishActiveTemplate() {
  const tpl = getActiveTemplate();
  if (!tpl) {
    alert('No active template to publish.');
    return;
  }

  if (!tpl._id) {
    alert('Please Save your template first, then Publish.');
    return;
  }

  if (tpl.publish_status === 'Denied' && tpl.denied_reason_text) {
    const resubmit = confirm(
      `This template was denied for this reason:\n\n"${tpl.denied_reason_text}"\n\nResubmit for approval?`
    );
    if (!resubmit) return;
  }

  try {
    const res = await fetch(`${API_BASE}/${tpl._id}/request-publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({}),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Publish request failed');

    tpl.publish_status = data.template.publish_status;
    tpl.denied_reason_text = data.template.denied_reason_text || null;

    renderTemplateSelect();
    updateStatusBox();
    alert(`Template "${tpl.name}" submitted for admin approval.`);
  } catch (err) {
    console.error(err);
    alert(err.message || 'Error submitting template for publish approval.');
  }
}

async function deleteActiveTemplate() {
  const tpl = getActiveTemplate();
  if (!tpl) {
    alert('No active template to delete.');
    return;
  }

  if (templates.length === 1) {
    alert('You must have at least one template.');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete template "${tpl.name}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    if (tpl._id) {
      const res = await fetch(`${API_BASE}/${tpl._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Delete failed');
      }
    }

    templates = templates.filter((t) => t.id !== tpl.id);

    if (templates.length > 0) {
      activeTemplateId = templates[0].id;
    } else {
      activeTemplateId = null;
    }

    renderTemplateSelect();
    updateStatusBox();

    document.dispatchEvent(
      new CustomEvent('templateChanged', {
        detail: { templateId: activeTemplateId },
      })
    );
  } catch (err) {
    console.error(err);
    alert(err.message || 'Error deleting template.');
  }
}

async function saveActiveTemplate() {
  const tpl = getActiveTemplate();
  if (!tpl) {
    alert('No active template to save.');
    return;
  }

  const newName = prompt('Enter a name for this template:', tpl.name);
  if (newName === null) return;

  const trimmed = newName.trim();
  if (!trimmed) {
    alert('Template name cannot be empty.');
    return;
  }

  tpl.name = trimmed;
  renderTemplateSelect();

  const confirmed = confirm(`Save template as "${tpl.name}"?`);
  if (!confirmed) return;

  const isNew = !tpl._id;
  const url = isNew ? API_BASE : `${API_BASE}/${tpl._id}`;
  const method = isNew ? 'POST' : 'PUT';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        template_name: tpl.name,
        publish_status: tpl.publish_status || 'Draft',
        denied_reason_text: tpl.denied_reason_text || null,
        pages: tpl.pages,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Save failed');

    alert(`Template "${data.template_name}" has been ${isNew ? 'created' : 'updated'} successfully.`);
    tpl._id = data._id;
    tpl.id = data._id;
    tpl.publish_status = data.publish_status || tpl.publish_status;
    tpl.denied_reason_text = data.denied_reason_text || null;

    renderTemplateSelect();
    updateStatusBox();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Error saving template.');
  }
}

function ensurePublishedLibraryModal() {
  if (document.getElementById('publishedLibraryModal')) {
    pubModal = document.getElementById('publishedLibraryModal');
    pubListEl = document.getElementById('pubList');
    pubTabsEl = document.getElementById('pubTabs');
    pubFrameEl = document.getElementById('pubFrame');
    pubTitleEl = document.getElementById('pubTitle');
    pubMetaEl = document.getElementById('pubMeta');
    pubDownloadBtn = document.getElementById('pubDownloadBtn');
    pubCloseBtn = document.getElementById('pubCloseBtn');
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    .pub-backdrop{
      position:fixed; inset:0; background:rgba(0,0,0,.45);
      display:none; align-items:center; justify-content:center;
      z-index:9999; padding:18px;
    }
    .pub-backdrop.show{ display:flex; }
    .pub-modal{
      width:min(1100px, 96vw);
      height:min(700px, 92vh);
      background:#fff; border-radius:14px; overflow:hidden;
      border:2px solid #2b6cb0; box-shadow:0 12px 30px rgba(0,0,0,.25);
      display:flex; flex-direction:column;
    }
    .pub-header{
      display:flex; align-items:center; justify-content:space-between;
      padding:12px 14px; background:#f3f8ff; border-bottom:1px solid #d8e6ff;
    }
    .pub-header h3{ font-size:16px; margin:0; }
    .pub-header button{ border:none; background:transparent; cursor:pointer; font-size:18px; padding:6px 8px; }
    .pub-body{ flex:1; display:grid; grid-template-columns: 320px 1fr; min-height:0; }
    .pub-left{ border-right:1px solid #eee; display:flex; flex-direction:column; min-height:0; }
    .pub-list{ flex:1; overflow:auto; padding:10px; display:flex; flex-direction:column; gap:8px; }
    .pub-item{
      border:1px solid #ddd; border-radius:10px; padding:10px;
      cursor:pointer; background:#fafafa;
    }
    .pub-item:hover{ background:#f2f7ff; border-color:#2b6cb0; }
    .pub-item.active{ background:#eaf3ff; border-color:#2b6cb0; }
    .pub-item-title{ font-weight:800; font-size:13px; }
    .pub-item-meta{ font-size:11px; color:#666; margin-top:4px; }
    .pub-right{ display:flex; flex-direction:column; min-height:0; }
    .pub-info{ padding:10px 12px; border-bottom:1px solid #eee; }
    .pub-title{ font-weight:900; font-size:14px; }
    .pub-meta{ color:#666; font-size:12px; margin-top:4px; }
    .pub-tabs{ display:flex; gap:8px; padding:10px 12px; border-bottom:1px solid #eee; overflow-x:auto; }
    .pub-tab{
      padding:8px 12px; border:2px solid #222; border-radius:10px;
      background:#f4f4f4; font-weight:800; cursor:pointer; flex:0 0 auto;
    }
    .pub-tab.active{ background:#fff; }
    .pub-tab.disabled{ border-color:#cfcfcf; color:#b3b3b3; background:#fafafa; cursor:default; }
    .pub-framewrap{ flex:1; min-height:0; }
    .pub-frame{ width:100%; height:100%; border:none; }
    .pub-footer{
      padding:12px 14px; border-top:1px solid #eee;
      display:flex; justify-content:flex-end; gap:10px;
    }
    .pub-btn{
      padding:10px 14px; border-radius:10px; border:2px solid #222;
      font-weight:900; cursor:pointer; background:#eee;
    }
    .pub-btn.blue{ background:#2b6cb0; border-color:#1f5fbf; color:#fff; }
    .pub-btn:disabled{ opacity:.55; cursor:not-allowed; }
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'pub-backdrop';
  backdrop.id = 'publishedLibraryModal';

  backdrop.innerHTML = `
    <div class="pub-modal" role="dialog" aria-modal="true">
      <div class="pub-header">
        <h3>Published Template Library</h3>
        <button id="pubCloseBtn" aria-label="Close">✕</button>
      </div>

      <div class="pub-body">
        <div class="pub-left">
          <div class="pub-list" id="pubList">
            <div style="color:#666; font-size:12px;">Search to load results…</div>
          </div>
        </div>

        <div class="pub-right">
          <div class="pub-info">
            <div class="pub-title" id="pubTitle">Select a template to preview</div>
            <div class="pub-meta" id="pubMeta"></div>
          </div>

          <div class="pub-tabs" id="pubTabs"></div>

          <div class="pub-framewrap">
            <iframe class="pub-frame" id="pubFrame" title="Published Preview"></iframe>
          </div>
        </div>
      </div>

      <div class="pub-footer">
        <button class="pub-btn" id="pubDownloadBtn" disabled>Download to My Templates</button>
        <button class="pub-btn blue" id="pubCloseBtn2">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  pubModal = backdrop;
  pubListEl = document.getElementById('pubList');
  pubTabsEl = document.getElementById('pubTabs');
  pubFrameEl = document.getElementById('pubFrame');
  pubTitleEl = document.getElementById('pubTitle');
  pubMetaEl = document.getElementById('pubMeta');
  pubDownloadBtn = document.getElementById('pubDownloadBtn');
  pubCloseBtn = document.getElementById('pubCloseBtn');

  const pubCloseBtn2 = document.getElementById('pubCloseBtn2');

  function close() {
    pubModal.classList.remove('show');
  }

  pubCloseBtn.addEventListener('click', close);
  pubCloseBtn2.addEventListener('click', close);

  pubModal.addEventListener('click', (e) => {
    if (e.target === pubModal) close();
  });

  pubDownloadBtn.addEventListener('click', async () => {
    if (!selectedPublishedTemplate) return;

    try {
      pubDownloadBtn.disabled = true;
      pubDownloadBtn.textContent = 'Downloading…';

      const res = await fetch(`${API_BASE}/published/${selectedPublishedTemplate._id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Download failed (${res.status})`);
      }

      await reloadMyTemplatesFromServer({ fallbackIfEmpty: true });

      const newId = data?.template?._id;
      if (newId) {
        setActiveTemplateIdAndNotify(newId);
      } else if (templates.length) {
        setActiveTemplateIdAndNotify(templates[0].id);
      }

      renderTemplateSelect();
      updateStatusBox();

      alert('Template downloaded to your account as a Draft copy.');
      pubModal.classList.remove('show');
    } catch (err) {
      console.error(err);
      alert(`Error downloading template: ${err.message}`);
    } finally {
      pubDownloadBtn.textContent = 'Download to My Templates';
      pubDownloadBtn.disabled = !selectedPublishedTemplate;
    }
  });
}

async function openPublishedLibrary(searchTerm) {
  if (!pubModal) ensurePublishedLibraryModal();

  pubTitleEl.textContent = 'Searching…';
  pubMetaEl.textContent = '';
  pubTabsEl.innerHTML = '';
  pubFrameEl.srcdoc = "<html><body style='font-family:Arial;padding:16px;'>Loading…</body></html>";
  pubDownloadBtn.disabled = true;

  pubModal.classList.add('show');

  const res = await fetch(`${API_BASE}/published?search=${encodeURIComponent(searchTerm)}`, {
    headers: { ...authHeaders() },
  });

  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error(data?.message || `Search failed (${res.status})`);
  }

  publishedResults = Array.isArray(data) ? data : [];
  selectedPublishedTemplate = null;
  selectedPublishedPages = [];
  selectedPublishedPageIndex = 0;

  renderPublishedList();
}

function renderPublishedList() {
  pubListEl.innerHTML = '';

  if (!publishedResults.length) {
    pubListEl.innerHTML = '<div style="color:#666;font-size:12px;">No published templates found.</div>';
    pubTitleEl.textContent = 'No results';
    pubMetaEl.textContent = '';
    pubTabsEl.innerHTML = '';
    pubFrameEl.srcdoc = "<html><body style='font-family:Arial;padding:16px;'>No preview available.</body></html>";
    pubDownloadBtn.disabled = true;
    return;
  }

  for (const t of publishedResults) {
    const item = document.createElement('div');
    item.className = 'pub-item';
    item.dataset.id = t._id;

    const updated = t.updated_at ? new Date(t.updated_at).toLocaleString() : '';
    item.innerHTML = `
      <div class="pub-item-title">${escapeHtml(t.template_name || 'Untitled')}</div>
      <div class="pub-item-meta">Updated: ${escapeHtml(updated)}</div>
    `;

    item.addEventListener('click', async () => {
      selectPublishedTemplate(t);
      pubListEl.querySelectorAll('.pub-item').forEach((x) => x.classList.remove('active'));
      item.classList.add('active');
      await loadPublishedPreviewPages(t._id);
    });

    pubListEl.appendChild(item);
  }

  pubTitleEl.textContent = 'Select a template to preview';
  pubMetaEl.textContent = 'Click a result on the left.';
  pubTabsEl.innerHTML = '';
  pubFrameEl.srcdoc = "<html><body style='font-family:Arial;padding:16px;'>Select a template to preview.</body></html>";
  pubDownloadBtn.disabled = true;
}

function selectPublishedTemplate(t) {
  selectedPublishedTemplate = t;
  pubDownloadBtn.disabled = false;

  const updated = t.updated_at ? new Date(t.updated_at).toLocaleString() : '';
  pubTitleEl.textContent = t.template_name || 'Untitled';
  pubMetaEl.textContent = updated ? `Updated: ${updated}` : '';
}

async function loadPublishedPreviewPages(templateId) {
  pubTabsEl.innerHTML = '';
  pubFrameEl.srcdoc = "<html><body style='font-family:Arial;padding:16px;'>Loading preview…</body></html>";

  const res = await fetch(`${API_BASE}/published/${templateId}/pages`, {
    headers: { ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    pubFrameEl.srcdoc = "<html><body style='font-family:Arial;padding:16px;'>Preview failed.</body></html>";
    throw new Error(data?.message || `Preview failed (${res.status})`);
  }

  selectedPublishedPages = Array.isArray(data.pages) ? data.pages : [];
  selectedPublishedPageIndex = 0;

  renderPublishedTabs();
  showPublishedPage(0);
}

function renderPublishedTabs() {
  pubTabsEl.innerHTML = '';
  const maxTabs = 10;
  const count = selectedPublishedPages.length;

  for (let i = 0; i < maxTabs; i++) {
    const has = i < count;

    const btn = document.createElement('button');
    btn.className = 'pub-tab' + (has ? '' : ' disabled');
    btn.textContent = has ? String(i + 1) : 'N/A';

    if (has && i === selectedPublishedPageIndex) btn.classList.add('active');

    btn.addEventListener('click', () => {
      if (!has) return;
      selectedPublishedPageIndex = i;
      renderPublishedTabs();
      showPublishedPage(i);
    });

    pubTabsEl.appendChild(btn);
  }
}

function showPublishedPage(index) {
  const p = selectedPublishedPages[index];
  if (!p) {
    pubFrameEl.srcdoc = "<html><body style='font-family:Arial;padding:16px;'>No page.</body></html>";
    return;
  }

  pubFrameEl.srcdoc = p.html || "<html><body style='font-family:Arial;padding:16px;'>No HTML.</body></html>";
}

async function reloadMyTemplatesFromServer({ fallbackIfEmpty = false } = {}) {
  try {
    const res = await fetch(API_BASE, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        templates = data.map((serverTpl, index) => {
          const hasPages = Array.isArray(serverTpl.pages) && serverTpl.pages.length > 0;

          return {
            _id: serverTpl._id,
            id: serverTpl._id,
            name: serverTpl.template_name || `Template ${index + 1}`,
            pages: hasPages
              ? serverTpl.pages
              : [
                  {
                    name: 'Home',
                    content: '',
                    style: {
                      backgroundColor: '#ffffff',
                      height: '700px',
                      gridEnabled: true,
                      width: '800px',
                    },
                  },
                ],
            publish_status: serverTpl.publish_status || 'Draft',
            denied_reason_text: serverTpl.denied_reason_text || null,
            publishedAt:
              serverTpl.publish_status === 'Published' ? serverTpl.updated_at || null : null,
          };
        });

        activeTemplateId = templates[0].id;
        return;
      }
    }
  } catch (err) {
    console.error('reloadMyTemplatesFromServer error:', err);
  }

  if (fallbackIfEmpty) {
    const tpl = {
      id: generateId(),
      name: 'Template 1',
      pages: [
        {
          name: 'Home',
          content: '',
          style: {
            backgroundColor: '#ffffff',
            height: '700px',
            gridEnabled: true,
            width: '800px',
          },
        },
      ],
      publish_status: 'Draft',
      denied_reason_text: null,
      publishedAt: null,
    };

    templates = [tpl];
    activeTemplateId = tpl.id;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
