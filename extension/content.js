// Memoir In-Page Autofill & Form Capture Content Script

(function() {
  'use strict';

  const currentDomain = window.location.hostname.replace(/^www\./i, '');
  let activeDropdown = null;

  // 1. In-Field Autofill Injection
  function initAutofill() {
    const inputs = document.querySelectorAll('input:not([data-memoir-attached])');
    
    inputs.forEach(input => {
      input.dataset.memoirAttached = 'true';
      const isPassword = input.type === 'password';
      const isUsername = /username|email|login|user_id|userid/i.test(input.name || input.id || input.autocomplete || input.placeholder);
      const isCard = /card|cc-number|cardnumber/i.test(input.name || input.id || input.autocomplete);

      if (isPassword || isUsername || isCard) {
        input.addEventListener('focus', () => handleFieldFocus(input));
      }
    });
  }

  async function handleFieldFocus(input) {
    chrome.runtime.sendMessage({ action: 'GET_CREDENTIALS_FOR_URL', url: window.location.href }, response => {
      if (response && response.ok && response.matches && response.matches.length) {
        showAutofillDropdown(input, response.matches);
      }
    });
  }

  function showAutofillDropdown(targetInput, matches) {
    removeDropdown();

    const rect = targetInput.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.className = 'memoir-autofill-dropdown';
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.minWidth = `${Math.max(220, rect.width)}px`;

    let html = `
      <div class="memoir-dropdown-header">
        <span class="memoir-logo-icon">🦏</span>
        <strong>Memoir Autofill</strong>
        <span class="memoir-domain-tag">${currentDomain}</span>
      </div>
      <div class="memoir-dropdown-items">
    `;

    matches.forEach((item, idx) => {
      const user = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Email'] || item.title || 'Saved Account';
      const isCard = item.type === 'Finance' || item.fields?.['Debit card number'];
      html += `
        <div class="memoir-dropdown-item" data-idx="${idx}">
          <div class="memoir-item-icon">${isCard ? '💳' : '🔑'}</div>
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

    // Close on click outside
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
    const form = triggerInput.closest('form') || document;
    const username = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Email'] || '';
    const password = item.fields?.['Password'] || item.fields?.['Passcode'] || '';
    const cardNumber = item.fields?.['Debit card number'] || item.fields?.['Card number'] || '';
    const cvv = item.fields?.['CVV'] || '';
    const expiry = item.fields?.['Expiry'] || '';

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

  // 2. Smart Form Capture on Submit
  function initFormCapture() {
    document.addEventListener('submit', handleFormSubmit, true);
    
    // Also catch submit buttons
    document.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = btn.closest('form');
        if (form) setTimeout(() => handleFormSubmit({ target: form }), 100);
      });
    });
  }

  function handleFormSubmit(e) {
    const form = e.target;
    if (!form || !form.querySelectorAll) return;

    const pwdInput = form.querySelector('input[type="password"]');
    if (!pwdInput || !pwdInput.value || pwdInput.value.length < 3) return;

    const userInput = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[id*="user"]');
    const username = userInput ? userInput.value.trim() : '';
    const password = pwdInput.value;

    if (!password) return;

    // Trigger floating capture prompt
    showCapturePrompt({
      type: 'Login',
      title: `${currentDomain.split('.')[0].toUpperCase()} Login`,
      domain: currentDomain,
      url: window.location.href,
      fields: {
        'Username / ID': username || 'Saved Account',
        'Password': password,
        'Website URL': window.location.href,
      },
    });
  }

  function showCapturePrompt(item) {
    // Remove existing prompt
    const existing = document.querySelector('.memoir-capture-modal');
    if (existing) existing.remove();

    const prompt = document.createElement('div');
    prompt.className = 'memoir-capture-modal';
    prompt.innerHTML = `
      <div class="memoir-capture-inner">
        <div class="memoir-capture-head">
          <div class="memoir-capture-brand">
            <span class="memoir-brand-rhino">🦏</span>
            <div>
              <strong>Save to Memoir?</strong>
              <small>${escapeHtml(item.domain)}</small>
            </div>
          </div>
          <button type="button" class="memoir-capture-close">&times;</button>
        </div>
        <div class="memoir-capture-body">
          <div class="memoir-capture-row">
            <span>Username:</span>
            <strong>${escapeHtml(item.fields['Username / ID'] || 'None')}</strong>
          </div>
          <div class="memoir-capture-row">
            <span>Password:</span>
            <strong>••••••••••••</strong>
          </div>
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
      prompt.querySelector('.memoir-capture-body').innerHTML = `<p style="color:#10b981;font-weight:700;margin:8px 0;">✓ Encrypted and saved to Memoir Vault!</p>`;
      prompt.querySelector('.memoir-capture-actions').remove();

      chrome.runtime.sendMessage({
        action: 'SAVE_CAPTURED_CREDENTIAL',
        item,
      });

      setTimeout(() => prompt.remove(), 2000);
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Run on load and observe dynamic DOM changes (for SPAs)
  initAutofill();
  initFormCapture();

  const observer = new MutationObserver(() => {
    initAutofill();
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
