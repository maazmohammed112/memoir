// Memoir In-Page Autofill, Smart Multi-Field Capture & Password Generator Engine

(function() {
  'use strict';

  const currentDomain = window.location.hostname.replace(/^www\./i, '');
  const currentPageTitle = document.title || currentDomain;
  const isMemoirApp = /(^|\.)memoir(?:-vert)?\.vercel\.app$/i.test(window.location.hostname)
    || /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    || document.title.toLowerCase().includes('memoir');
  let activeDropdown = null;
  let activeTargetInput = null;
  let lastCaptureTime = 0;

  const logoUrl = chrome.runtime.getURL('brand/memoir-rhino-ui.png');

  function sendMessageSafely(message, callback = () => {}) {
    try {
      chrome.runtime.sendMessage(message, response => {
        const channelError = chrome.runtime.lastError;
        if (channelError) { callback(null, channelError); return; }
        callback(response, null);
      });
    } catch (error) {
      callback(null, error);
    }
  }

  const SVGS = {
    sparkles: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    key: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>',
    card: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
    doc: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>',
  };

  function generateStrongPassword(len = 16) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+~';
    const array = new Uint32Array(len);
    crypto.getRandomValues(array);
    return Array.from(array, n => chars[n % chars.length]).join('');
  }

  function initAutofillAndBadges() {
    const inputs = document.querySelectorAll('input:not([data-memoir-attached])');
    
    inputs.forEach(input => {
      if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'image') return;
      input.dataset.memoirAttached = 'true';

      const info = inspectInput(input);
      if (info.isPassword || info.isUsername || info.isCard || info.isAckOrApp || info.isIdentity) {
        attachInlineRhinoBadge(input, info);

        input.addEventListener('focus', () => handleFieldFocus(input, info));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            setTimeout(() => triggerSmartCapture(input), 150);
          }
        });
      }
    });
  }

  function inspectInput(input) {
    const name = String(input.name || '').toLowerCase();
    const id = String(input.id || '').toLowerCase();
    const placeholder = String(input.placeholder || '').toLowerCase();
    const autocomplete = String(input.autocomplete || '').toLowerCase();
    const type = String(input.type || 'text').toLowerCase();
    const val = String(input.value || '').trim();

    let labelText = '';
    if (input.id) {
      try {
        const labelEl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (labelEl) labelText = labelEl.textContent.trim();
      } catch {}
    }
    if (!labelText) {
      const parentLabel = input.closest('label');
      if (parentLabel) labelText = parentLabel.textContent.replace(val, '').trim();
    }
    if (!labelText) {
      const prev = input.previousElementSibling;
      if (prev && prev.textContent && prev.textContent.length < 60) labelText = prev.textContent.trim();
    }
    if (!labelText) {
      const cell = input.closest('td, .form-group, .form-row, .field, div');
      if (cell) {
        const prevCell = cell.previousElementSibling;
        if (prevCell && prevCell.textContent && prevCell.textContent.length < 60) {
          labelText = prevCell.textContent.trim();
        } else {
          const innerLbl = cell.querySelector('label, span, b, strong, .label');
          if (innerLbl && innerLbl !== input) labelText = innerLbl.textContent.trim();
        }
      }
    }

    labelText = labelText.replace(/[:*]/g, '').trim();
    const meta = `${name} ${id} ${placeholder} ${autocomplete} ${labelText}`.toLowerCase();

    const isPassword = type === 'password' || /password|passcode|pwd/i.test(meta);
    const isNewPassword = isPassword && (/new|confirm|create|signup|register/i.test(meta) || /new-password/i.test(autocomplete));
    const isOtp = /otp|one time|verification code|security code/i.test(meta);
    const isAckOrApp = /ack|acknowledgement|appl|application|token|reference|ref\b|tracking|challan|registration|reg\b|case|pnr|pran|uan|epfo|consumer|policy/i.test(meta);
    const isMobile = type === 'tel' || (/mobile|phone|contact|cell/i.test(meta) && /^\+?\d{8,14}$/.test(val.replace(/\s+/g, '')));
    const isCard = /card|cc-number|cardnumber|debit|credit/i.test(meta) || (/^\d{12,19}$/.test(val.replace(/\s+/g, '')) && !isMobile);
    const isCardCvv = /cvv|cvc/i.test(meta) && /^\d{3,4}$/.test(val);
    const isCardExp = /exp|expiry/i.test(meta);
    const isIdentity = /aadhaar|pan|voter|dl|driving|passport|epic|ssn/i.test(meta);
    const isUsername = type === 'email' || /username|email|login|user_id|userid|user/i.test(meta);
    const isAddress = /address|street|pincode|zip|city|state/i.test(meta);

    return {
      input,
      val,
      labelText: labelText || placeholder || name || id || 'Detail',
      isPassword,
      isNewPassword,
      isOtp,
      isAckOrApp,
      isMobile,
      isCard,
      isCardCvv,
      isCardExp,
      isIdentity,
      isUsername,
      isAddress,
      hasValue: val.length > 0,
    };
  }

  // Persistent In-Field Rhino Badge
  function attachInlineRhinoBadge(input, info) {
    if (input.dataset.memoirBadgeAttached) return;
    input.dataset.memoirBadgeAttached = 'true';

    const updateBadgePosition = (badge) => {
      const rect = input.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.width < 50) return;
      badge.style.top = `${rect.top + window.scrollY + Math.max(2, (rect.height - 24) / 2)}px`;
      badge.style.left = `${rect.right + window.scrollX - 28}px`;
    };

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'memoir-inline-save-btn';
    badge.title = 'Memoir Autofill & Save';
    badge.innerHTML = `<img src="${logoUrl}" alt="Memoir" class="memoir-inline-rhino-img">`;

    document.body.appendChild(badge);
    updateBadgePosition(badge);

    window.addEventListener('scroll', () => updateBadgePosition(badge), { passive: true });
    window.addEventListener('resize', () => updateBadgePosition(badge), { passive: true });

    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.focus();
      handleFieldFocus(input, info);
    });
  }

  async function handleFieldFocus(input, info) {
    activeTargetInput = input;
    sendMessageSafely({ action: 'GET_CREDENTIALS_FOR_URL', url: window.location.href }, response => {
      const matches = (response && response.ok && response.matches) ? response.matches : [];
      showAutofillDropdown(input, matches, info);
    });
  }

  function showAutofillDropdown(targetInput, matches, info) {
    removeDropdown();

    const rect = targetInput.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.className = 'memoir-autofill-dropdown';
    dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.minWidth = `${Math.max(270, rect.width)}px`;

    let html = `
      <div class="memoir-dropdown-header">
        <img src="${logoUrl}" alt="Memoir" class="memoir-header-logo-img">
        <div class="memoir-header-text">
          <strong>Memoir Vault</strong>
          <span class="memoir-domain-tag">${currentDomain}</span>
        </div>
        <button type="button" class="memoir-dropdown-close-btn" id="memoir-dropdown-close" title="Close dropdown">&times;</button>
      </div>
      <div class="memoir-dropdown-items">
    `;

    if (info && info.isPassword) {
      html += `
        <div class="memoir-dropdown-item memoir-gen-pwd-btn" id="memoir-action-gen-pwd">
          <div class="memoir-item-icon">${SVGS.sparkles}</div>
          <div class="memoir-item-text">
            <strong>Generate Strong Password</strong>
            <small>16-character secure code · auto-copies</small>
          </div>
        </div>
      `;
    }

    if (matches && matches.length) {
      matches.forEach((item, idx) => {
        const user = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Document number'] || item.fields?.['Reference number'] || item.title || 'Saved Account';
        const isCard = item.type === 'Finance' || item.fields?.['Debit card number'];
        const isDoc = item.type === 'Government Document' || item.type === 'Identity';
        html += `
          <div class="memoir-dropdown-item" data-idx="${idx}">
            <div class="memoir-item-icon">${isCard ? SVGS.card : isDoc ? SVGS.doc : SVGS.key}</div>
            <div class="memoir-item-text">
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(user)}</small>
            </div>
          </div>
        `;
      });
    } else if (!info.isPassword) {
      html += `
        <div class="memoir-dropdown-empty">
          <span>No saved credentials for ${currentDomain}</span>
        </div>
      `;
    }

    html += `
      <div class="memoir-dropdown-item memoir-quick-save-btn" id="memoir-action-quick-save">
        <div class="memoir-item-icon">${SVGS.doc}</div>
        <div class="memoir-item-text">
          <strong>Save Field to Memoir</strong>
          <small>Store ${escapeHtml(info?.labelText || 'this value')} securely</small>
        </div>
      </div>
    `;

    html += `</div>`;
    dropdown.innerHTML = html;
    document.body.appendChild(dropdown);
    activeDropdown = dropdown;

    const closeBtn = dropdown.querySelector('#memoir-dropdown-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeDropdown();
      });
    }

    const genBtn = dropdown.querySelector('#memoir-action-gen-pwd');
    if (genBtn) {
      genBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pwd = generateStrongPassword(16);
        
        fillInput(targetInput, pwd);

        const form = targetInput.closest('form') || document;
        const allPwdInputs = Array.from(form.querySelectorAll('input[type="password"]'));
        allPwdInputs.forEach(p => { if (p !== targetInput) fillInput(p, pwd); });

        navigator.clipboard?.writeText(pwd).catch(() => {});

        showSuccessBadge(targetInput, 'Strong password generated & copied!');
        removeDropdown();
      });
    }

    const quickSaveBtn = dropdown.querySelector('#memoir-action-quick-save');
    if (quickSaveBtn) {
      quickSaveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeDropdown();
        triggerSmartCapture(targetInput);
      });
    }

    dropdown.querySelectorAll('.memoir-dropdown-item[data-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        const selected = matches[idx];
        if (selected) fillForm(targetInput, selected);
        removeDropdown();
      });
    });

    const handleOutside = (e) => {
      if (activeDropdown && !activeDropdown.contains(e.target) && e.target !== targetInput && !e.target.closest('.memoir-inline-save-btn')) {
        removeDropdown();
        document.removeEventListener('click', handleOutside);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', handleOutside);
    }, 150);
  }

  function removeDropdown() {
    if (activeDropdown) {
      activeDropdown.remove();
      activeDropdown = null;
    }
  }

  function fillInput(el, val) {
    if (!el || !val) return;
    el.focus();
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillForm(triggerInput, item) {
    const form = triggerInput.closest('form') || triggerInput.closest('.form, table, div') || document;
    const username = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Email'] || '';
    const password = item.fields?.['Password'] || item.fields?.['Passcode'] || '';
    const docNumber = item.fields?.['Document number'] || item.fields?.['Reference number'] || item.fields?.['ACK Number'] || '';
    const cardNumber = item.fields?.['Debit card number'] || item.fields?.['Card number'] || '';
    const cvv = item.fields?.['CVV'] || '';
    const expiry = item.fields?.['Expiry'] || '';

    if (docNumber) fillInput(triggerInput, docNumber);
    if (username) {
      const userInput = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[id*="user"]');
      if (userInput) fillInput(userInput, username);
    }
    if (password) {
      const pwdInput = form.querySelector('input[type="password"]');
      if (pwdInput) fillInput(pwdInput, password);
    }
    if (cardNumber) {
      const cardInput = form.querySelector('input[name*="card"], input[autocomplete*="cc-number"], input[id*="card"]');
      if (cardInput) fillInput(cardInput, cardNumber);
    }
    if (cvv) {
      const cvvInput = form.querySelector('input[name*="cvv"], input[name*="cvc"], input[autocomplete*="cc-csc"]');
      if (cvvInput) fillInput(cvvInput, cvv);
    }
    if (expiry) {
      const expInput = form.querySelector('input[name*="exp"], input[autocomplete*="cc-exp"]');
      if (expInput) fillInput(expInput, expiry);
    }

    showSuccessBadge(triggerInput, 'Autofilled by Memoir');
  }

  function showSuccessBadge(target, text = 'Autofilled by Memoir') {
    const rect = target.getBoundingClientRect();
    const badge = document.createElement('div');
    badge.className = 'memoir-autofill-badge success';
    badge.innerHTML = `<span>${escapeHtml(text)}</span>`;
    badge.style.top = `${rect.top + window.scrollY - 32}px`;
    badge.style.left = `${rect.left + window.scrollX}px`;
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 2500);
  }

  // 2. Smart Universal Form & Button Capture
  function initSmartCaptureListeners() {
    document.addEventListener('submit', (e) => {
      triggerSmartCapture(e.target);
    }, true);

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, input[type="button"], input[type="submit"], a.btn, a[role="button"], .btn');
      if (!btn) return;
      
      const btnText = `${btn.textContent || ''} ${btn.value || ''} ${btn.id || ''} ${btn.className || ''}`.toLowerCase();
      const isAction = /check status|search|track|submit|login|sign in|proceed|continue|fetch|get details|verify|pay|save|register|find|view/i.test(btnText);
      
      if (isAction) {
        setTimeout(() => triggerSmartCapture(btn), 120);
      }
    }, true);

    document.addEventListener('copy', () => {
      const selection = window.getSelection()?.toString()?.trim();
      if (selection && selection.length >= 6 && selection.length <= 40) {
        sessionStorage.setItem('memoir_last_copied', JSON.stringify({
          val: selection,
          domain: currentDomain,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
      }
    });

    window.addEventListener('memoir-autofill-trigger', (e) => {
      if (e.detail) {
        const anyInput = document.querySelector('input:not([type="hidden"])') || document.body;
        fillForm(anyInput, e.detail);
      }
    });
  }

  function triggerSmartCapture(contextElement) {
    const now = Date.now();
    if (now - lastCaptureTime < 1500) return;

    const container = contextElement?.closest?.('form, .form, .container, main, article, table, body') || document.body;
    const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"])'));
    
    const inspected = inputs.map(inspectInput).filter(info => {
      if (!info.hasValue || info.val.length < 2) return false;
      const isRadioOrCheck = info.input.type === 'checkbox' || info.input.type === 'radio';
      const isNoise = /^(on|off|true|false|yes|no)$/i.test(info.val);
      if (isRadioOrCheck && isNoise) return false;
      return true;
    });
    if (!inspected.length) return;

    const capturedFields = {};
    let itemType = 'Personal';
    let itemTitle = '';
    let defaultNote = '';

    const pwdField = inspected.find(i => i.isPassword);
    const ackField = inspected.find(i => i.isAckOrApp);
    const identityField = inspected.find(i => i.isIdentity);
    const cardField = inspected.find(i => i.isCard);
    const mobileField = inspected.find(i => i.isMobile);
    const userField = inspected.find(i => i.isUsername);

    if (pwdField) {
      itemType = 'Login';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} Account`;
      capturedFields['Password'] = pwdField.val;
      if (userField) capturedFields['Username / ID'] = userField.val;
      else if (mobileField) capturedFields['Username / ID'] = mobileField.val;
      defaultNote = `Saved from ${currentPageTitle}`;
    } else if (ackField) {
      itemType = 'Government Document';
      const label = ackField.labelText || 'ACK Number';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} ${label}`;
      capturedFields['Document number'] = ackField.val;
      capturedFields['Reference number'] = ackField.val;
      capturedFields[label] = ackField.val;
      defaultNote = `Track application status on ${currentDomain}`;
    } else if (identityField) {
      itemType = 'Identity';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} ${identityField.labelText || 'Document'}`;
      capturedFields['Document number'] = identityField.val;
      capturedFields[identityField.labelText] = identityField.val;
      defaultNote = `Saved from ${currentPageTitle}`;
    } else if (cardField) {
      itemType = 'Finance';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} Payment Card`;
      capturedFields['Debit card number'] = cardField.val;
      defaultNote = `Payment record on ${currentDomain}`;
    } else if (inspected.length >= 1) {
      const first = inspected[0];
      itemType = 'Personal';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} ${first.labelText || 'Record'}`;
      capturedFields[first.labelText] = first.val;
      defaultNote = `Captured from ${currentPageTitle}`;
    }

    inspected.forEach(info => {
      const val = String(info.val || '').trim();
      const isNoise = /^(on|off|true|false|yes|no|undefined|null|1|0)$/i.test(val);
      const isRadioOrCheck = info.input.type === 'checkbox' || info.input.type === 'radio';
      if (isRadioOrCheck || (isNoise && !info.isPassword && !info.isAckOrApp)) return;
      if (!info.isPassword && !capturedFields[info.labelText]) {
        capturedFields[info.labelText] = info.val;
      }
    });

    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    lastCaptureTime = now;
    const itemToCapture = {
      type: itemType,
      title: itemTitle,
      domain: currentDomain,
      url: window.location.href,
      pageTitle: currentPageTitle,
      capturedDate: formattedDate,
      capturedTime: formattedTime,
      note: defaultNote,
      fields: capturedFields,
      provenance: {
        source: 'Chrome Extension',
        domain: currentDomain,
        url: window.location.href,
        pageTitle: currentPageTitle,
        capturedDate: formattedDate,
        capturedTime: formattedTime,
        createdAt: nowIso,
      },
    };

    const usernameVal = capturedFields['Username / ID'] || capturedFields['Username'] || '';
    const docVal = capturedFields['Document number'] || capturedFields['Reference number'] || '';

    sendMessageSafely({
      action: 'CHECK_DUPLICATE',
      domain: currentDomain,
      username: usernameVal,
      docNumber: docVal,
    }, res => {
      const existing = (res && res.ok && res.duplicate) ? res.duplicate : null;
      showCaptureModal(itemToCapture, existing);
    });
  }

  function showCaptureModal(item, existing) {
    const existingModal = document.querySelector('.memoir-capture-modal');
    if (existingModal) existingModal.remove();

    const prompt = document.createElement('div');
    prompt.className = 'memoir-capture-modal';
    
    const displayEntries = Object.entries(item.fields).filter(([k]) => k !== 'Website URL' && k !== 'Captured from');

    let rowsHtml = '';
    displayEntries.slice(0, 4).forEach(([label, value]) => {
      const isSecret = /password|pin|cvv/i.test(label);
      rowsHtml += `
        <div class="memoir-capture-row">
          <span>${escapeHtml(label)}:</span>
          <strong>${isSecret ? '••••••••••••' : escapeHtml(value)}</strong>
        </div>
      `;
    });

    let dupWarningHtml = '';
    if (existing) {
      dupWarningHtml = `
        <div class="memoir-dup-warning-box">
          <span>⚠️ Account already saved for ${escapeHtml(item.domain)}. Update existing or save as new?</span>
        </div>
      `;
    }

    prompt.innerHTML = `
      <div class="memoir-capture-inner">
        <div class="memoir-capture-head">
          <div class="memoir-capture-brand">
            <img src="${logoUrl}" alt="Memoir" class="memoir-brand-rhino-img">
            <div>
              <strong>Save to Memoir?</strong>
              <small>${escapeHtml(item.domain)} · ${escapeHtml(item.capturedTime)}</small>
            </div>
          </div>
          <button type="button" class="memoir-capture-close" aria-label="Dismiss">&times;</button>
        </div>

        ${dupWarningHtml}

        <div class="memoir-capture-edit-box">
          <label class="memoir-label">Title</label>
          <input type="text" id="memoir-cap-title" class="memoir-text-input" value="${escapeHtml(item.title)}">
        </div>

        <div class="memoir-capture-body">
          ${rowsHtml}
        </div>

        <div class="memoir-capture-edit-box">
          <label class="memoir-label">Note / Memo (Optional)</label>
          <input type="text" id="memoir-cap-note" class="memoir-text-input" value="${escapeHtml(item.note)}" placeholder="Add context or reminder…">
        </div>

        <div class="memoir-capture-actions">
          <button type="button" class="memoir-btn-dismiss">Not now</button>
          ${existing ? `<button type="button" class="memoir-btn-update" id="memoir-btn-update-existing">Update Existing</button>` : ''}
          <button type="button" class="memoir-btn-save">${existing ? 'Save New' : 'Save to Vault'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(prompt);

    prompt.querySelector('.memoir-capture-close').addEventListener('click', () => prompt.remove());
    prompt.querySelector('.memoir-btn-dismiss').addEventListener('click', () => prompt.remove());
    
    const saveAction = (updateId) => {
      const editedTitle = prompt.querySelector('#memoir-cap-title').value.trim() || item.title;
      const editedNote = prompt.querySelector('#memoir-cap-note').value.trim() || item.note;

      const finalItem = {
        ...item,
        title: editedTitle,
        note: editedNote,
      };

      prompt.querySelector('.memoir-capture-body').innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;color:#10b981;font-weight:700;padding:6px 0;">
          <span>✓</span>
          <span>${updateId ? 'Existing record updated & encrypted!' : 'Encrypted and saved to Memoir Vault!'}</span>
        </div>
      `;
      prompt.querySelector('.memoir-capture-actions').remove();
      prompt.querySelectorAll('.memoir-capture-edit-box, .memoir-dup-warning-box').forEach(el => el.remove());

      sendMessageSafely({
        action: 'SAVE_CAPTURED_CREDENTIAL',
        item: finalItem,
        updateExistingId: updateId || null,
      });

      setTimeout(() => prompt.remove(), 2200);
    };

    const updateBtn = prompt.querySelector('#memoir-btn-update-existing');
    if (updateBtn) {
      updateBtn.addEventListener('click', () => saveAction(existing.id));
    }

    prompt.querySelector('.memoir-btn-save').addEventListener('click', () => saveAction(null));
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (!isMemoirApp) {
    initAutofillAndBadges();
    initSmartCaptureListeners();

    const observer = new MutationObserver(() => {
      initAutofillAndBadges();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.querySelectorAll('.memoir-inline-save-btn, .memoir-autofill-dropdown, .memoir-capture-prompt').forEach(element => element.remove());
  }

  // Memoir Web App Direct Real-Time Sync Bridge
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      if (request?.action === 'MEMOIR_SYNC_UPDATE' || request?.action === 'MEMOIR_SYNC_DELETE') {
        window.postMessage({ type: 'MEMOIR_EXTENSION_SYNC_EVENT', action: request.action, item: request.item, items: request.items, id: request.id }, '*');
      }
      sendResponse({ ok: true });
    } catch (err) {
      sendResponse({ ok: false, error: err?.message });
    }
    return false;
  });

  if (isMemoirApp) {
    const pushAllToApp = () => {
      if (!chrome?.runtime?.id) return;
      try {
        sendMessageSafely({ action: 'GET_ALL_CAPTURED' }, res => {
          if (res && res.ok && Array.isArray(res.items) && res.items.length) {
            window.postMessage({ type: 'MEMOIR_EXTENSION_SYNC_EVENT', action: 'MEMOIR_SYNC_UPDATE', items: res.items }, '*');
          }
        });
      } catch { /* channel closed */ }
    };

    pushAllToApp();
    setTimeout(pushAllToApp, 1500);

    window.addEventListener('message', event => {
      if (event.data?.type === 'MEMOIR_APP_REQUEST_EXTENSION_SYNC') {
        pushAllToApp();
      }
    });
  }
})();
