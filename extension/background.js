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

function broadcastToAllTabs(msg) {
  try {
    chrome.tabs.query({}, tabs => {
      (tabs || []).forEach(tab => {
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
        }
      });
    });
  } catch (err) {
    console.warn('Tab broadcast skipped:', err.message);
  }
}

async function syncItemToCloud(auth, op, item, id) {
  try {
    const targetUrl = auth.serverUrl || DEFAULT_SERVER_URL;
    await fetch(`${targetUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: auth.profile?.uid,
        code: auth.code,
        op,
        id: id || item?.id,
        item,
      }),
    });
  } catch (e) {
    console.warn('Memoir cloud sync queued locally:', e.message);
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
          const itemDomain = extractDomain(item.url || item.fields?.['Website URL'] || item.domain || '');
          const title = String(item.title || '').toLowerCase();
          return itemDomain.includes(domain) || domain.includes(itemDomain) || title.includes(domain.split('.')[0]);
        });

        return { ok: true, matches: matching };
      }

      case 'CHECK_DUPLICATE': {
        const { domain, username, docNumber } = request;
        const existing = state.capturedItems.find(i => {
          const matchDomain = (i.domain && domain && (i.domain.includes(domain) || domain.includes(i.domain)));
          const userVal = i.fields?.['Username / ID'] || i.fields?.['Username'] || '';
          const docVal = i.fields?.['Document number'] || i.fields?.['Reference number'] || '';
          return matchDomain && ((username && userVal === username) || (docNumber && docVal === docNumber));
        });
        return { ok: true, duplicate: existing || null };
      }

      case 'SAVE_CAPTURED_CREDENTIAL': {
        if (!state.auth.loggedIn) return { ok: false, error: 'Not logged in to Memoir' };
        
        const { item, updateExistingId } = request;

        let finalItem;
        let updatedList;

        if (updateExistingId) {
          const existingIdx = state.capturedItems.findIndex(i => i.id === updateExistingId);
          if (existingIdx !== -1) {
            finalItem = {
              ...state.capturedItems[existingIdx],
              ...item,
              id: updateExistingId,
              fields: { ...state.capturedItems[existingIdx].fields, ...(item.fields || {}) },
              updatedAt: new Date().toISOString(),
            };
            updatedList = [...state.capturedItems];
            updatedList[existingIdx] = finalItem;
          }
        }

        if (!finalItem) {
          finalItem = {
            id: item.id || ('ext-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
            kind: 'memory',
            type: item.type || 'Login',
            title: item.title || 'Saved Record',
            fields: item.fields || {},
            note: item.note || `Captured by Memoir Chrome Extension from ${item.domain || 'web'}`,
            url: item.url || '',
            domain: item.domain || '',
            pageTitle: item.pageTitle || '',
            createdAt: new Date().toISOString(),
            provenance: {
              source: 'Chrome Extension',
              domain: item.domain || '',
              url: item.url || '',
              pageTitle: item.pageTitle || '',
              capturedDate: item.capturedDate || new Date().toLocaleDateString(),
              capturedTime: item.capturedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt: new Date().toISOString(),
            },
          };
          updatedList = [finalItem, ...state.capturedItems];
        }

        await setStoredCaptured(updatedList);
        await syncItemToCloud(state.auth, 'put', finalItem);
        broadcastToAllTabs({ action: 'MEMOIR_SYNC_UPDATE', item: finalItem, items: updatedList });

        return { ok: true, item: finalItem };
      }

      case 'UPDATE_CAPTURED_ITEM': {
        if (!state.auth.loggedIn) return { ok: false, error: 'Not logged in' };
        const { item } = request;
        const idx = state.capturedItems.findIndex(i => i.id === item.id);
        if (idx === -1) return { ok: false, error: 'Item not found' };

        const updated = [...state.capturedItems];
        updated[idx] = { ...updated[idx], ...item, updatedAt: new Date().toISOString() };
        await setStoredCaptured(updated);
        await syncItemToCloud(state.auth, 'put', updated[idx]);
        broadcastToAllTabs({ action: 'MEMOIR_SYNC_UPDATE', item: updated[idx], items: updated });

        return { ok: true, item: updated[idx] };
      }

      case 'GET_ALL_CAPTURED': {
        return { ok: true, items: state.capturedItems };
      }

      case 'DELETE_CAPTURED': {
        const remaining = state.capturedItems.filter(i => i.id !== request.id);
        await setStoredCaptured(remaining);
        await syncItemToCloud(state.auth, 'delete', null, request.id);
        broadcastToAllTabs({ action: 'MEMOIR_SYNC_DELETE', id: request.id, items: remaining });
        return { ok: true };
      }

      case 'DEDUPLICATE_ITEMS': {
        const seen = new Set();
        const deduped = [];
        const toDeleteIds = [];

        state.capturedItems.forEach(item => {
          const userOrDoc = item.fields?.['Username / ID'] || item.fields?.['Username'] || item.fields?.['Document number'] || item.fields?.['Reference number'] || item.title;
          const key = `${item.domain || 'any'}::${userOrDoc || item.id}`;
          if (seen.has(key)) {
            toDeleteIds.push(item.id);
          } else {
            seen.add(key);
            deduped.push(item);
          }
        });

        await setStoredCaptured(deduped);
        for (const id of toDeleteIds) {
          await syncItemToCloud(state.auth, 'delete', null, id);
        }
        broadcastToAllTabs({ action: 'MEMOIR_SYNC_UPDATE', items: deduped });

        return { ok: true, removedCount: toDeleteIds.length, items: deduped };
      }

      default:
        return { ok: false, error: 'Unknown action' };
    }
  };

  handle().then(sendResponse).catch(err => sendResponse({ ok: false, error: err.message }));
  return true;
});