// Memoir Extension Luxury Popup Controller with Full Overlay Panels & Vector SVGs

document.addEventListener('DOMContentLoaded', async () => {
  const viewLogin = document.getElementById('view-login');
  const viewActive = document.getElementById('view-active');
  const statusDot = document.getElementById('status-dot');
  const loginError = document.getElementById('login-error');
  const vaultCodeInput = document.getElementById('vault-code');
  const serverUrlInput = document.getElementById('server-url');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const btnOpenApp = document.getElementById('btn-open-app');
  const toggleAutofill = document.getElementById('toggle-autofill');
  const toggleCapture = document.getElementById('toggle-capture');
  const activeDomainEl = document.getElementById('active-domain');
  const sectionTitleLabel = document.getElementById('section-title-label');
  const credsList = document.getElementById('credentials-list');
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userAvatarEl = document.getElementById('user-avatar');
  const allCountEl = document.getElementById('all-count');

  // Tabs & Search
  const tabSite = document.getElementById('tab-site');
  const tabAll = document.getElementById('tab-all');
  const popupSearchBox = document.getElementById('popup-search-box');
  const popupSearchInput = document.getElementById('popup-search-input');
  const dupBanner = document.getElementById('duplicate-cleaner-banner');
  const btnCleanDuplicates = document.getElementById('btn-clean-duplicates');

  // Generator
  const btnGenPwdPopup = document.getElementById('btn-gen-pwd-popup');
  const genPwdBox = document.getElementById('gen-pwd-box');
  const genPwdOutput = document.getElementById('gen-pwd-output');
  const btnCopyGenPwd = document.getElementById('btn-copy-gen-pwd');

  // Quick Save Overlay Panel
  const btnOpenManualSave = document.getElementById('btn-open-manual-save');
  const saveOverlayPanel = document.getElementById('save-overlay-panel');
  const btnCloseSavePanel = document.getElementById('btn-close-save-panel');
  const btnCancelManual = document.getElementById('btn-cancel-manual');
  const manualTitle = document.getElementById('manual-title');
  const manualType = document.getElementById('manual-type');
  const manualUser = document.getElementById('manual-user');
  const manualPwd = document.getElementById('manual-pwd');
  const manualNote = document.getElementById('manual-note');
  const btnSaveManual = document.getElementById('btn-save-manual');

  // Edit Overlay Panel
  const editOverlayPanel = document.getElementById('edit-overlay-panel');
  const btnCloseEditPanel = document.getElementById('btn-close-edit-panel');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const editId = document.getElementById('edit-id');
  const editTitle = document.getElementById('edit-title');
  const editType = document.getElementById('edit-type');
  const editUser = document.getElementById('edit-user');
  const editPwd = document.getElementById('edit-pwd');
  const editNote = document.getElementById('edit-note');
  const btnToggleEditPwd = document.getElementById('btn-toggle-edit-pwd');
  const btnSaveEdit = document.getElementById('btn-save-edit');

  let currentAuth = null;
  let activeTabUrl = '';
  let activeTabTitle = '';
  let activeTabDomain = '';
  let currentTabMode = 'site';
  let allCapturedItems = [];
  let siteMatchedItems = [];
  let expandedCardId = null;

  // Vector SVG Icons
  const SVGS = {
    eye: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
    copy: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    edit: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
    delete: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    zap: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    chevronDown: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronUp: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>',
  };

  function generateStrongPassword(len = 16) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+~';
    const array = new Uint32Array(len);
    crypto.getRandomValues(array);
    return Array.from(array, n => chars[n % chars.length]).join('');
  }

  // Get active tab info
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTabUrl = tabs[0].url || '';
      activeTabTitle = tabs[0].title || '';
      try {
        activeTabDomain = new URL(activeTabUrl).hostname.replace(/^www\./i, '');
        activeDomainEl.textContent = activeTabDomain || 'Active Page';
        manualTitle.value = `${activeTabDomain.split('.')[0].toUpperCase()} Record`;
      } catch {
        activeDomainEl.textContent = 'Active Page';
      }
    }
  } catch (e) {
    console.warn('Could not read active tab:', e);
  }

  function refreshState() {
    chrome.runtime.sendMessage({ action: 'CHECK_AUTH' }, response => {
      if (response && response.ok && response.auth && response.auth.loggedIn) {
        currentAuth = response.auth;
        showActiveView(response.auth, response.settings);
      } else {
        showLoginView();
      }
    });
  }

  function showLoginView() {
    viewLogin.style.display = 'block';
    viewActive.style.display = 'none';
    editOverlayPanel.style.display = 'none';
    saveOverlayPanel.style.display = 'none';
    statusDot.className = 'status-dot offline';
    vaultCodeInput.value = '';
    loginError.style.display = 'none';
  }

  function showActiveView(auth, settings) {
    viewLogin.style.display = 'none';
    viewActive.style.display = 'flex';
    statusDot.className = 'status-dot online';

    const profile = auth.profile || {};
    userNameEl.textContent = profile.name || 'Owner';
    userEmailEl.textContent = profile.email || '';
    userAvatarEl.textContent = (profile.initials || profile.name || 'M').slice(0, 2).toUpperCase();

    if (settings) {
      toggleAutofill.checked = Boolean(settings.autofillEnabled);
      toggleCapture.checked = Boolean(settings.autoCaptureEnabled);
    }

    loadAllCapturedItems();
  }

  function loadAllCapturedItems() {
    chrome.runtime.sendMessage({ action: 'GET_ALL_CAPTURED' }, res => {
      allCapturedItems = (res && res.ok && Array.isArray(res.items)) ? res.items : [];
      allCountEl.textContent = allCapturedItems.length;

      // Check duplicates
      const seen = new Set();
      let hasDuplicates = false;
      allCapturedItems.forEach(item => {
        const userOrDoc = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Document number'] || item.fields?.['Reference number'] || item.title;
        const key = `${item.domain || 'any'}::${userOrDoc}`;
        if (seen.has(key)) hasDuplicates = true;
        else seen.add(key);
      });
      dupBanner.style.display = hasDuplicates ? 'flex' : 'none';

      // Match for current tab
      if (activeTabDomain) {
        siteMatchedItems = allCapturedItems.filter(item => {
          const itemDomain = (item.domain || item.url || item.fields?.['Website URL'] || '').toLowerCase();
          return itemDomain.includes(activeTabDomain.toLowerCase()) || activeTabDomain.toLowerCase().includes(itemDomain.replace(/^www\./i, ''));
        });
      } else {
        siteMatchedItems = [];
      }

      renderList();
    });
  }

  function filterMeaningfulFields(fields = {}) {
    return Object.entries(fields).filter(([key, val]) => {
      if (key === 'Website URL' || key === 'Captured from') return false;
      const str = String(val || '').trim().toLowerCase();
      if (!str) return false;
      if (/^(on|off|true|false|yes|no|undefined|null)$/i.test(str) && !/password|pin|cvv/i.test(key)) return false;
      return true;
    });
  }

  function renderList() {
    let itemsToDisplay = currentTabMode === 'site' ? siteMatchedItems : allCapturedItems;
    
    // Apply search query
    const query = popupSearchInput.value.trim().toLowerCase();
    if (query) {
      itemsToDisplay = itemsToDisplay.filter(item => {
        const title = (item.title || '').toLowerCase();
        const domain = (item.domain || '').toLowerCase();
        const note = (item.note || '').toLowerCase();
        const fields = JSON.stringify(item.fields || {}).toLowerCase();
        return title.includes(query) || domain.includes(query) || note.includes(query) || fields.includes(query);
      });
    }

    if (!itemsToDisplay.length) {
      const msg = currentTabMode === 'site' 
        ? `No saved credentials for ${activeTabDomain || 'this tab'}`
        : (query ? 'No matching records found' : 'No saved records in vault');
      credsList.innerHTML = `<p class="empty-text">${escapeHtml(msg)}</p>`;
      return;
    }

    credsList.innerHTML = itemsToDisplay.map(item => renderItemCard(item)).join('');
    bindCardEvents(itemsToDisplay);
  }

  function renderItemCard(item) {
    const isExpanded = expandedCardId === item.id;
    const user = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Document number'] || item.fields?.['Reference number'] || item.fields?.['Debit card number'] || 'Account';
    const note = item.note || '';
    const domain = item.domain || '';
    const date = item.provenance?.capturedDate || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '');
    const cleanFields = filterMeaningfulFields(item.fields);

    let fieldsHtml = '';
    if (isExpanded) {
      fieldsHtml = `
        <div class="card-details-drawer">
          <div class="drawer-fields-scroll">
            ${cleanFields.map(([key, val]) => {
              const isSecret = /password|pin|cvv|passcode/i.test(key);
              return `
                <div class="field-detail-row">
                  <span class="field-name">${escapeHtml(key)}:</span>
                  <div class="field-val-wrap">
                    <span class="field-val ${isSecret ? 'secret-mask' : ''}" data-secret-val="${escapeHtml(val)}" data-revealed="false">${isSecret ? '••••••••' : escapeHtml(val)}</span>
                    ${isSecret ? `<button type="button" class="btn-icon-mini btn-toggle-eye" title="Reveal / Hide password">${SVGS.eye}</button>` : ''}
                    <button type="button" class="btn-icon-mini btn-copy-field" data-copy-val="${escapeHtml(val)}" title="Copy ${escapeHtml(key)}">${SVGS.copy}</button>
                  </div>
                </div>
              `;
            }).join('')}

            ${note ? `<div class="card-note-row"><small>Note:</small> <span>${escapeHtml(note)}</span></div>` : ''}
            ${domain ? `<div class="card-meta-row"><small>Portal:</small> <span>${escapeHtml(domain)} ${date ? `· ${escapeHtml(date)}` : ''}</span></div>` : ''}
          </div>

          <div class="card-action-bar">
            <button type="button" class="btn primary-mini btn-autofill-action" data-item-id="${item.id}">
              ${SVGS.zap} <span>Autofill</span>
            </button>
            <button type="button" class="btn secondary-mini btn-edit-action" data-item-id="${item.id}">
              ${SVGS.edit} <span>Edit</span>
            </button>
            <button type="button" class="btn danger-mini btn-delete-action" data-item-id="${item.id}">
              ${SVGS.delete} <span>Delete</span>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="cred-card ${isExpanded ? 'expanded' : ''}" data-card-id="${item.id}">
        <div class="cred-card-header">
          <div class="cred-card-info">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(user)}${domain && currentTabMode === 'all' ? ` · ${escapeHtml(domain)}` : ''}</small>
          </div>
          <div class="cred-card-quick-actions">
            <button type="button" class="btn-mini btn-quick-autofill" data-item-id="${item.id}">Autofill</button>
            <button type="button" class="expand-arrow-btn" title="View details">${isExpanded ? SVGS.chevronUp : SVGS.chevronDown}</button>
          </div>
        </div>
        ${fieldsHtml}
      </div>
    `;
  }

  function bindCardEvents(currentItems) {
    // Expand / Collapse card
    credsList.querySelectorAll('.cred-card').forEach(card => {
      const cardId = card.dataset.cardId;
      card.querySelector('.cred-card-header').addEventListener('click', (e) => {
        if (e.target.closest('.btn-quick-autofill')) return;
        expandedCardId = expandedCardId === cardId ? null : cardId;
        renderList();
      });
    });

    // Quick Autofill
    credsList.querySelectorAll('.btn-quick-autofill, .btn-autofill-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        const selected = allCapturedItems.find(i => i.id === itemId);
        if (selected) {
          chrome.tabs.query({ active: true, currentWindow: true }, activeTabs => {
            if (activeTabs[0]) {
              chrome.scripting.executeScript({
                target: { tabId: activeTabs[0].id },
                func: (item) => {
                  const evt = new CustomEvent('memoir-autofill-trigger', { detail: item });
                  window.dispatchEvent(evt);
                },
                args: [selected],
              });
            }
          });
          window.close();
        }
      });
    });

    // Toggle Eye (Password reveal)
    credsList.querySelectorAll('.btn-toggle-eye').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const valSpan = btn.parentElement.querySelector('.field-val');
        const secretVal = valSpan.dataset.secretVal;
        const isRevealed = valSpan.dataset.revealed === 'true';

        if (isRevealed) {
          valSpan.textContent = '••••••••';
          valSpan.dataset.revealed = 'false';
          btn.innerHTML = SVGS.eye;
        } else {
          valSpan.textContent = secretVal;
          valSpan.dataset.revealed = 'true';
          btn.innerHTML = SVGS.eyeOff;
        }
      });
    });

    // Copy field value
    credsList.querySelectorAll('.btn-copy-field').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = btn.dataset.copyVal;
        if (val) {
          navigator.clipboard.writeText(val);
          btn.innerHTML = SVGS.check;
          setTimeout(() => { btn.innerHTML = SVGS.copy; }, 1500);
        }
      });
    });

    // Edit action -> Opens full overlay panel
    credsList.querySelectorAll('.btn-edit-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        const item = allCapturedItems.find(i => i.id === itemId);
        if (item) {
          editId.value = item.id;
          editTitle.value = item.title || '';
          editType.value = item.type || 'Login';
          editUser.value = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Document number'] || item.fields?.['Reference number'] || item.fields?.['Debit card number'] || '';
          editPwd.value = item.fields?.['Password'] || item.fields?.['Passcode'] || item.fields?.['CVV'] || '';
          editNote.value = item.note || '';
          editOverlayPanel.style.display = 'flex';
        }
      });
    });

    // Delete action
    credsList.querySelectorAll('.btn-delete-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        if (confirm('Delete this saved record from Memoir Vault?')) {
          chrome.runtime.sendMessage({ action: 'DELETE_CAPTURED', id: itemId }, () => {
            loadAllCapturedItems();
          });
        }
      });
    });
  }

  // Tabs Click Handlers
  tabSite.addEventListener('click', () => {
    currentTabMode = 'site';
    tabSite.classList.add('active');
    tabAll.classList.remove('active');
    sectionTitleLabel.textContent = 'Active Site';
    popupSearchBox.style.display = 'none';
    renderList();
  });

  tabAll.addEventListener('click', () => {
    currentTabMode = 'all';
    tabAll.classList.add('active');
    tabSite.classList.remove('active');
    sectionTitleLabel.textContent = 'All Vault Records';
    popupSearchBox.style.display = 'block';
    renderList();
  });

  // Search input handler
  popupSearchInput.addEventListener('input', () => {
    renderList();
  });

  // Clean Duplicates Handler
  btnCleanDuplicates.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'DEDUPLICATE_ITEMS' }, res => {
      dupBanner.style.display = 'none';
      loadAllCapturedItems();
    });
  });

  // Edit Overlay Panel Handlers
  btnToggleEditPwd.addEventListener('click', () => {
    const isPass = editPwd.type === 'password';
    editPwd.type = isPass ? 'text' : 'password';
    btnToggleEditPwd.innerHTML = isPass ? SVGS.eyeOff : SVGS.eye;
  });

  const closeEditPanel = () => { editOverlayPanel.style.display = 'none'; };
  btnCloseEditPanel.addEventListener('click', closeEditPanel);
  btnCancelEdit.addEventListener('click', closeEditPanel);

  btnSaveEdit.addEventListener('click', () => {
    const id = editId.value;
    const existing = allCapturedItems.find(i => i.id === id);
    if (!existing) return;

    const updatedFields = { ...existing.fields };
    const userVal = editUser.value.trim();
    const pwdVal = editPwd.value;

    if (userVal) {
      if (updatedFields['Username / ID']) updatedFields['Username / ID'] = userVal;
      else if (updatedFields['Document number']) updatedFields['Document number'] = userVal;
      else if (updatedFields['Debit card number']) updatedFields['Debit card number'] = userVal;
      else updatedFields['Username / ID'] = userVal;
    }
    if (pwdVal) {
      if (updatedFields['Password']) updatedFields['Password'] = pwdVal;
      else if (updatedFields['Passcode']) updatedFields['Passcode'] = pwdVal;
      else updatedFields['Password'] = pwdVal;
    }

    const updatedItem = {
      ...existing,
      type: editType.value,
      title: editTitle.value.trim() || existing.title,
      note: editNote.value.trim(),
      fields: updatedFields,
    };

    chrome.runtime.sendMessage({ action: 'UPDATE_CAPTURED_ITEM', item: updatedItem }, () => {
      closeEditPanel();
      loadAllCapturedItems();
    });
  });

  // Quick Save Overlay Panel Handlers
  btnOpenManualSave.addEventListener('click', () => {
    saveOverlayPanel.style.display = 'flex';
  });

  const closeSavePanel = () => { saveOverlayPanel.style.display = 'none'; };
  btnCloseSavePanel.addEventListener('click', closeSavePanel);
  btnCancelManual.addEventListener('click', closeSavePanel);

  btnSaveManual.addEventListener('click', () => {
    const title = manualTitle.value.trim() || `${activeTabDomain || 'Web'} Record`;
    const type = manualType.value;
    const userVal = manualUser.value.trim();
    const pwdVal = manualPwd.value;
    const noteVal = manualNote.value.trim();

    const fields = {};
    if (type === 'Government Document') {
      fields['Document number'] = userVal;
      fields['Reference number'] = userVal;
    } else if (type === 'Finance') {
      fields['Debit card number'] = userVal;
    } else {
      fields['Username / ID'] = userVal;
      if (pwdVal) fields['Password'] = pwdVal;
    }

    const item = {
      type,
      title,
      fields,
      note: noteVal,
      domain: activeTabDomain,
      url: activeTabUrl,
      pageTitle: activeTabTitle,
    };

    chrome.runtime.sendMessage({ action: 'SAVE_CAPTURED_CREDENTIAL', item }, () => {
      closeSavePanel();
      manualUser.value = '';
      manualPwd.value = '';
      manualNote.value = '';
      loadAllCapturedItems();
    });
  });

  // Password Generator
  btnGenPwdPopup.addEventListener('click', () => {
    const pwd = generateStrongPassword(16);
    genPwdOutput.value = pwd;
    genPwdBox.style.display = genPwdBox.style.display === 'none' ? 'block' : 'none';
  });

  btnCopyGenPwd.addEventListener('click', () => {
    if (genPwdOutput.value) {
      navigator.clipboard.writeText(genPwdOutput.value);
      btnCopyGenPwd.textContent = 'Copied!';
      setTimeout(() => btnCopyGenPwd.textContent = 'Copy', 1800);
    }
  });

  // Login handler
  btnLogin.addEventListener('click', () => {
    const code = vaultCodeInput.value.trim();
    const serverUrl = serverUrlInput.value.trim();
    if (!code || code.length !== 4) {
      loginError.textContent = 'Please enter your 4-digit Memoir code (e.g. 2002)';
      loginError.style.display = 'block';
      return;
    }

    btnLogin.textContent = 'Connecting…';
    btnLogin.disabled = true;
    loginError.style.display = 'none';

    chrome.runtime.sendMessage({ action: 'LOGIN', code, serverUrl }, res => {
      btnLogin.textContent = 'Connect Vault';
      btnLogin.disabled = false;

      if (res && res.ok) {
        currentAuth = res.auth;
        showActiveView(res.auth);
      } else {
        loginError.textContent = res.error || 'Failed to authenticate';
        loginError.style.display = 'block';
      }
    });
  });

  // Logout handler
  btnLogout.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'LOGOUT' }, () => {
      showLoginView();
    });
  });

  // Open web app
  btnOpenApp.addEventListener('click', () => {
    const url = currentAuth?.serverUrl || 'https://memoir-vert.vercel.app';
    chrome.tabs.create({ url });
  });

  // Settings toggles
  toggleAutofill.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: { autofillEnabled: toggleAutofill.checked } });
  });

  toggleCapture.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: { autoCaptureEnabled: toggleCapture.checked } });
  });

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  refreshState();
});