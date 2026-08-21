const CACHE = 'memoir-shell-v5-audio-vault';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/brand/favicon-32.png', '/brand/apple-touch-icon.png', '/brand/pwa-192.png', '/brand/pwa-512.png', '/brand/memoir-rhino-ui.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  let url;
  try { url = new URL(event.request.url); } catch { return; }
  if (
    event.request.method !== 'GET'
    || !['http:', 'https:'].includes(url.protocol)
    || url.pathname.startsWith('/api/')
  ) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (url.origin === self.location.origin && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (url.origin === self.location.origin && event.request.mode === 'navigate') {
        return (await caches.match('/index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});
