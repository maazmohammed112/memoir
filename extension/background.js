// Memoir Background Service Worker (Manifest V3)

const DEFAULT_SERVER_URL = 'https://memo-vault.vercel.app'; // or local: http://localhost:5173

async function getStoredState() {
  const result = await chrome.storage.local.get(['memoir_auth', 'memoir_settings', 'memoir_captured_items']);
  return {
    auth: result.memoir_auth || { loggedIn: false, profile: null, token: null, code: null, serverUrl: DEFAULT_SERVER_URL },
    settings: result.memoir_settings || { autofillEnabled: true, autoCaptureEnabled: true, promptOnCapture: true },
    capturedItems: result.memoir_captured_items || [],
  };
}

async function setStoredAuth(auth) {
  await chrome.storage.local.set({ memoir_auth: auth });
}

async function setStoredCaptured(items) {
  await chrome.storage.local.set({ memoir_captured_items: items });
}

// Extract clean domain e.g. "github.com" from "https://github.com/login"
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handle = async () => {
    const state = await getStoredState();

    switch (request.action) {
      case 'CHECK_AUTH': {
        return { ok: true, auth: state.auth, settings: state.settings, capturedCount: state.capturedItems.length };
      }

      case 'LOGIN': {
        const { code, serverUrl } = request;
        const targetUrl = (serverUrl || state.auth.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
        
        try {
          // Select account via Memoir auth endpoint
          const res = await fetch(`${targetUrl}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'select-account', code: String(code || '').trim() }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to connect to Memoir' }));
            return { ok: false, error: err.error || 'Invalid 4-digit Memoir code' };
          }

          const data = await res.json();
          const auth = {
            loggedIn: true,
            profile: data.profile, // { uid, email, name, initials }
            code: String(code).trim(),
            serverUrl: targetUrl,
            loggedInAt: Date.now(),
          };

          await setStoredAuth(auth);
          return { ok: true, auth };
        } catch (error) {
          return { ok: false, error: error.message || 'Network error connecting to Memoir' };
        }
      }

      case 'LOGOUT': {
        await chrome.storage.local.remove(['memoir_auth']);
        return { ok: true };
      }

      case 'UPDATE_SETTINGS': {
        const newSettings = { ...state.settings, ...request.settings };
        await chrome.storage.local.set({ memoir_settings: newSettings });
        return { ok: true, settings: newSettings };
      }

      case 'GET_CREDENTIALS_FOR_URL': {
        if (!state.auth.loggedIn) return { ok: false, error: 'Not logged in' };
        if (!state.settings.autofillEnabled) return { ok: true, matches: [] };

        const domain = extractDomain(request.url || '');
        if (!domain) return { ok: true, matches: [] };

        // Match against captured items + synced items for this domain
        const matching = state.capturedItems.filter(item => {
          const itemDomain = extractDomain(item.url || item.fields?.['Website URL'] || item.title || '');
          const title = String(item.title || '').toLowerCase();
          return itemDomain.includes(domain) || domain.includes(itemDomain) || title.includes(domain.split('.')[0]);
        });

        return { ok: true, matches: matching };
      }

      case 'SAVE_CAPTURED_CREDENTIAL': {
        if (!state.auth.loggedIn) return { ok: false, error: 'Not logged in to Memoir' };
        
        const { item } = request;
        const newItem = {
          id: 'ext-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          kind: 'memory',
          type: item.type || 'Login',
          title: item.title || 'Saved Login',
          fields: item.fields || {},
          note: item.note || `Captured by Memoir Chrome Extension from ${item.domain || 'web'}`,
          url: item.url || '',
          domain: item.domain || '',
          createdAt: new Date().toISOString(),
          provenance: {
            source: 'Chrome Extension',
            domain: item.domain || '',
            url: item.url || '',
            createdAt: new Date().toISOString(),
          },
        };

        const updated = [newItem, ...state.capturedItems];
        await setStoredCaptured(updated);

        // Sync to Memoir cloud mirror if available
        try {
          const targetUrl = state.auth.serverUrl || DEFAULT_SERVER_URL;
          await fetch(`${targetUrl}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              op: 'put',
              item: newItem,
            }),
          });
        } catch (e) {
          console.warn('Memoir cloud sync queued locally:', e.message);
        }

        return { ok: true, item: newItem };
      }

      case 'GET_ALL_CAPTURED': {
        return { ok: true, items: state.capturedItems };
      }

      case 'DELETE_CAPTURED': {
        const remaining = state.capturedItems.filter(i => i.id !== request.id);
        await setStoredCaptured(remaining);
        return { ok: true };
      }

      default:
        return { ok: false, error: 'Unknown action' };
    }
  };

  handle().then(sendResponse).catch(err => sendResponse({ ok: false, error: err.message }));
  return true; // Keep message channel open for async response
});
