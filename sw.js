// ── Bump this version every deploy to force cache refresh ──
const VERSION = '2026-01-v3';
const CACHE = 'roteiro-' + VERSION;

const ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap'
];

// INSTALL: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting(); // activate immediately, don't wait for old SW to die
});

// ACTIVATE: delete all old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of all open tabs immediately
});

// FETCH: network-first for HTML (always fresh), cache-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = e.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTML) {
    // Network-first: try network, fall back to cache
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for fonts, images, etc.
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (e.request.method === 'GET' && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone)).catch(() => {});
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});

// MESSAGE: allow page to trigger skipWaiting manually
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
