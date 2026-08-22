// Memoir Extension Popup Controller

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
  const siteCredsList = document.getElementById('site-credentials-list');
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userAvatarEl = document.getElementById('user-avatar');

  let currentAuth = null;
  let activeTabUrl = '';

  // Get active tab info
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTabUrl = tabs[0].url || '';
      try {
        const domain = new URL(activeTabUrl).hostname.replace(/^www\./i, '');
        activeDomainEl.textContent = domain || 'New Tab';
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
    statusDot.className = 'status-dot offline';
    vaultCodeInput.value = '';
    loginError.style.display = 'none';
  }

  function showActiveView(auth, settings) {
    viewLogin.style.display = 'none';
    viewActive.style.display = 'block';
    statusDot.className = 'status-dot online';

    const profile = auth.profile || {};
    userNameEl.textContent = profile.name || 'Owner';
    userEmailEl.textContent = profile.email || '';
    userAvatarEl.textContent = (profile.initials || profile.name || 'M').slice(0, 2).toUpperCase();

    if (settings) {
      toggleAutofill.checked = Boolean(settings.autofillEnabled);
      toggleCapture.checked = Boolean(settings.autoCaptureEnabled);
    }

    // Load matches for active URL
    if (activeTabUrl) {
      chrome.runtime.sendMessage({ action: 'GET_CREDENTIALS_FOR_URL', url: activeTabUrl }, res => {
        if (res && res.ok && res.matches && res.matches.length) {
          siteCredsList.innerHTML = res.matches.map((item, idx) => `
            <div class="cred-row">
              <div class="cred-row-info">
                <strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(item.fields?.['Username / ID'] || item.fields?.['Username'] || 'Account')}</small>
              </div>
              <button type="button" class="btn-mini" data-autofill-idx="${idx}">Autofill</button>
            </div>
          `).join('');

          siteCredsList.querySelectorAll('[data-autofill-idx]').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = Number(btn.dataset.autofillIdx);
              const selected = res.matches[idx];
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
        } else {
          siteCredsList.innerHTML = `<p class="empty-text">No saved credentials for this domain</p>`;
        }
      });
    }
  }

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