// Memoir Background Service Worker (Manifest V3)

const DEFAULT_SERVER_URL = 'https://memoir-vert.vercel.app';

const LOCAL_PROFILES = {
  '2002': { uid: 'uQE6xqhWhQWhOlGmfT2br5HnCEq2', email: 'maaz@memo.com', name: 'Maaz', initials: 'MM' },
  '2005': { uid: 'GQ4lxeAWoPTlyJ4W1jxU8bxk6qS2', email: 'deepti@memo.com', name: 'Deepti', initials: 'DM' },
};

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

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handle = async () => {
    const state = await getStoredState();

    switch (request.action) {
      case 'CHECK_AUTH': {
        return { ok: true, auth: state.auth, settings: state.settings, capturedCount: state.capturedItems.length };
      }

      case 'LOGIN': {
        const { code, serverUrl } = request;
        const cleanCode = String(code || '').trim();
        const targetUrl = (serverUrl || state.auth.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
        
        let profile = null;
        try {
          const res = await fetch(`${targetUrl}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'select-account', code: cleanCode }),
          });

          if (res.ok) {
            const data = await res.json();
            profile = data.profile;
          }
        } catch (err) {
          console.warn('Network auth request failed, falling back to local verification:', err.message);
        }

        // Fallback to local profile
        if (!profile && LOCAL_PROFILES[cleanCode]) {
          profile = LOCAL_PROFILES[cleanCode];
        }

        if (!profile) {
          return { ok: false, error: 'Invalid 4-digit Memoir code (e.g. 2002 for Maaz, 2005 for Deepti)' };
        }

        const auth = {
          loggedIn: true,
          profile,
          code: cleanCode,
          serverUrl: targetUrl,
          loggedInAt: Date.now(),
        };

        await setStoredAuth(auth);
        return { ok: true, auth };
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

        // Sync to cloud mirror
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
  return true;
});