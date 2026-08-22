// Memoir In-Page Autofill & Smart Multi-Field Capture Content Script

(function() {
  'use strict';

  const currentDomain = window.location.hostname.replace(/^www\./i, '');
  let activeDropdown = null;
  let lastCapturedPayload = null;
  let lastCaptureTime = 0;

  // 1. In-Field Autofill & Smart Badge Attachment
  function initAutofillAndBadges() {
    const inputs = document.querySelectorAll('input:not([data-memoir-attached])');
    
    inputs.forEach(input => {
      if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'image') return;
      input.dataset.memoirAttached = 'true';

      const info = inspectInput(input);
      if (info.isPassword || info.isUsername || info.isCard || info.isAckOrApp || info.isIdentity) {
        input.addEventListener('focus', () => handleFieldFocus(input));
        input.addEventListener('input', () => handleFieldInput(input));
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

    // Find nearby label text
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

  async function handleFieldFocus(input) {
    chrome.runtime.sendMessage({ action: 'GET_CREDENTIALS_FOR_URL', url: window.location.href }, response => {
      if (response && response.ok && response.matches && response.matches.length) {
        showAutofillDropdown(input, response.matches);
      }
    });
  }

  function handleFieldInput(input) {
    const val = input.value.trim();
    if (val.length >= 4) {
      showInlineSaveBadge(input);
    } else {
      removeInlineBadge(input);
    }
  }

  function showInlineSaveBadge(input) {
    if (input.dataset.memoirHasBadge) return;
    input.dataset.memoirHasBadge = 'true';

    const rect = input.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'memoir-inline-save-btn';
    badge.title = 'Save this to Memoir Vault';
    badge.innerHTML = '🦏';
    badge.style.top = `${rect.top + window.scrollY + (rect.height - 22) / 2}px`;
    badge.style.left = `${rect.right + window.scrollX - 26}px`;

    document.body.appendChild(badge);

    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerSmartCapture(input);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (badge) badge.remove();
        delete input.dataset.memoirHasBadge;
      }, 3500);
    }, { once: true });
  }

  function removeInlineBadge(input) {
    delete input.dataset.memoirHasBadge;
    document.querySelectorAll('.memoir-inline-save-btn').forEach(b => b.remove());
  }

  function showAutofillDropdown(targetInput, matches) {
    removeDropdown();

    const rect = targetInput.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.className = 'memoir-autofill-dropdown';
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.minWidth = `${Math.max(240, rect.width)}px`;

    let html = `
      <div class="memoir-dropdown-header">
        <span class="memoir-logo-icon">🦏</span>
        <strong>Memoir Vault</strong>
        <span class="memoir-domain-tag">${currentDomain}</span>
      </div>
      <div class="memoir-dropdown-items">
    `;

    matches.forEach((item, idx) => {
      const user = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Document number'] || item.fields?.['Reference number'] || item.title || 'Saved Account';
      const isCard = item.type === 'Finance' || item.fields?.['Debit card number'];
      const isDoc = item.type === 'Government Document' || item.type === 'Identity';
      html += `
        <div class="memoir-dropdown-item" data-idx="${idx}">
          <div class="memoir-item-icon">${isCard ? '💳' : isDoc ? '📄' : '🔑'}</div>
          <div class="memoir-item-text">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(user)}</small>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    dropdown.innerHTML = html;
    document.body.appendChild(dropdown);
    activeDropdown = dropdown;

    dropdown.querySelectorAll('.memoir-dropdown-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        const selected = matches[idx];
        if (selected) fillForm(targetInput, selected);
        removeDropdown();
      });
    });

    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick, { once: true });
    }, 100);
  }

  function handleOutsideClick(e) {
    if (activeDropdown && !activeDropdown.contains(e.target)) {
      removeDropdown();
    }
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

    if (docNumber) {
      fillInput(triggerInput, docNumber);
    }
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

    showSuccessBadge(triggerInput);
  }

  function showSuccessBadge(target) {
    const rect = target.getBoundingClientRect();
    const badge = document.createElement('div');
    badge.className = 'memoir-autofill-badge success';
    badge.innerHTML = `<span>✓ Autofilled by Memoir</span>`;
    badge.style.top = `${rect.top + window.scrollY - 28}px`;
    badge.style.left = `${rect.left + window.scrollX}px`;
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 2200);
  }

  // 2. Smart Universal Form & Button Capture
  function initSmartCaptureListeners() {
    // A. Native Form Submit
    document.addEventListener('submit', (e) => {
      triggerSmartCapture(e.target);
    }, true);

    // B. Button / Link Clicks (e.g. "Check Status", "Login", "Search", "Track", "Submit")
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, input[type="button"], input[type="submit"], a.btn, a[role="button"], .btn');
      if (!btn) return;
      
      const btnText = `${btn.textContent || ''} ${btn.value || ''} ${btn.id || ''} ${btn.className || ''}`.toLowerCase();
      const isAction = /check status|search|track|submit|login|sign in|proceed|continue|fetch|get details|verify|pay|save|register|find|view/i.test(btnText);
      
      if (isAction) {
        setTimeout(() => triggerSmartCapture(btn), 100);
      }
    }, true);
  }

  function triggerSmartCapture(contextElement) {
    const now = Date.now();
    if (now - lastCaptureTime < 1500) return; // Debounce rapid triggers

    // Find closest form or search surrounding inputs in container
    const container = contextElement?.closest?.('form, .form, .container, main, article, table, body') || document.body;
    const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"])'));
    
    const inspected = inputs.map(inspectInput).filter(info => info.hasValue && info.val.length >= 2);
    if (!inspected.length) return;

    // Categorize captured data
    const capturedFields = {};
    let itemType = 'Personal';
    let itemTitle = '';
    let mainIdentifier = '';

    const pwdField = inspected.find(i => i.isPassword);
    const ackField = inspected.find(i => i.isAckOrApp);
    const identityField = inspected.find(i => i.isIdentity);
    const cardField = inspected.find(i => i.isCard);
    const mobileField = inspected.find(i => i.isMobile);
    const userField = inspected.find(i => i.isUsername);

    if (pwdField) {
      itemType = 'Login';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} Login`;
      capturedFields['Password'] = pwdField.val;
      if (userField) capturedFields['Username / ID'] = userField.val;
      else if (mobileField) capturedFields['Username / ID'] = mobileField.val;
      mainIdentifier = capturedFields['Username / ID'] || 'Account';
    } else if (ackField) {
      itemType = 'Government Document';
      const label = ackField.labelText || 'ACK Number';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} ${label}`;
      capturedFields['Document number'] = ackField.val;
      capturedFields['Reference number'] = ackField.val;
      capturedFields[label] = ackField.val;
      mainIdentifier = ackField.val;
    } else if (identityField) {
      itemType = 'Identity';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} ${identityField.labelText || 'Document'}`;
      capturedFields['Document number'] = identityField.val;
      capturedFields[identityField.labelText] = identityField.val;
      mainIdentifier = identityField.val;
    } else if (cardField) {
      itemType = 'Finance';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} Card`;
      capturedFields['Debit card number'] = cardField.val;
      mainIdentifier = `•••• ${cardField.val.slice(-4)}`;
    } else if (inspected.length >= 1) {
      const first = inspected[0];
      itemType = 'Personal';
      itemTitle = `${currentDomain.split('.')[0].toUpperCase()} ${first.labelText || 'Record'}`;
      capturedFields[first.labelText] = first.val;
      mainIdentifier = first.val;
    }

    // Add all other non-empty inputs
    inspected.forEach(info => {
      if (!info.isPassword && !capturedFields[info.labelText]) {
        capturedFields[info.labelText] = info.val;
      }
    });

    capturedFields['Website URL'] = window.location.href;
    capturedFields['Captured from'] = currentDomain;

    if (!Object.keys(capturedFields).length) return;

    lastCaptureTime = now;
    showCaptureModal({
      type: itemType,
      title: itemTitle,
      domain: currentDomain,
      url: window.location.href,
      mainIdentifier,
      fields: capturedFields,
    });
  }

  function showCaptureModal(item) {
    const existing = document.querySelector('.memoir-capture-modal');
    if (existing) existing.remove();

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

    prompt.innerHTML = `
      <div class="memoir-capture-inner">
        <div class="memoir-capture-head">
          <div class="memoir-capture-brand">
            <span class="memoir-brand-rhino">🦏</span>
            <div>
              <strong>Save to Memoir?</strong>
              <small>${escapeHtml(item.domain)} · ${escapeHtml(item.type)}</small>
            </div>
          </div>
          <button type="button" class="memoir-capture-close" aria-label="Dismiss">&times;</button>
        </div>
        <div class="memoir-capture-body">
          ${rowsHtml}
        </div>
        <div class="memoir-capture-actions">
          <button type="button" class="memoir-btn-dismiss">Not now</button>
          <button type="button" class="memoir-btn-save">Save to Vault</button>
        </div>
      </div>
    `;

    document.body.appendChild(prompt);

    prompt.querySelector('.memoir-capture-close').addEventListener('click', () => prompt.remove());
    prompt.querySelector('.memoir-btn-dismiss').addEventListener('click', () => prompt.remove());
    
    prompt.querySelector('.memoir-btn-save').addEventListener('click', () => {
      prompt.querySelector('.memoir-capture-body').innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;color:#10b981;font-weight:700;padding:6px 0;">
          <span style="font-size:16px;">✓</span>
          <span>Encrypted and saved to Memoir Vault!</span>
        </div>
      `;
      prompt.querySelector('.memoir-capture-actions').remove();

      chrome.runtime.sendMessage({
        action: 'SAVE_CAPTURED_CREDENTIAL',
        item,
      });

      setTimeout(() => prompt.remove(), 2200);
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Initial load
  initAutofillAndBadges();
  initSmartCaptureListeners();

  // Dynamic DOM observer for single page apps / AJAX updates
  const observer = new MutationObserver(() => {
    initAutofillAndBadges();
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();