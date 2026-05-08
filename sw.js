/* ============================================================
   Roomie – Service Worker  (WhatsApp-style offline strategy)
   ============================================================
   Strategy:
   • App Shell  → Cache First  (instant load, even offline)
   • Pages      → Network First, fall back to cache
   • Images     → Cache First, long TTL
   • Firebase / API → Network only (needs real data)
   ============================================================ */

const CACHE_VERSION  = 'v3';
const SHELL_CACHE    = `roomie-shell-${CACHE_VERSION}`;
const PAGES_CACHE    = `roomie-pages-${CACHE_VERSION}`;
const IMAGES_CACHE   = `roomie-images-${CACHE_VERSION}`;

/* ── All static assets that make up the "app shell" ── */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/home.html',
  '/login.html',
  '/signup.html',
  '/setup.html',
  '/room.html',
  '/chat.html',
  '/messages.html',
  '/profile.html',
  '/profile2.html',
  '/user-profile.html',
  '/roommate.html',
  '/roommate-detail.html',
  '/list-room.html',
  '/list-room11.html',
  '/favourites.html',
  '/refer.html',
  '/referrals.html',
  '/splash.html',
  '/verify-email.html',
  '/verify-phone.html',
  '/delete-account.html',
  '/terms.html',
  '/privacy-policy.html',
  '/style.css',
  '/firebase.js',
  '/theme.js',
  '/loader.js',
  '/upload.js',
  '/manifest.json',
  '/roomie-192.png',
  '/roomie-512.png',
  '/icon-192.png',
  '/icon-512-1.png',
  '/roomie.png',
  '/offline.html',       // we create this below via fetch interception
];

/* ── Domains that must go to network (Firebase, CDN, etc.) ── */
const NETWORK_ONLY_ORIGINS = [
  'firebaseapp.com',
  'googleapis.com',
  'gstatic.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebase.googleapis.com',
  'firebasestorage.googleapis.com',
  'cloudinary.com',          // if you use cloudinary for images
];

/* ── Simple offline page injected into cache at install ── */
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Roomie – No Connection</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      background:#0d0f14;color:#f0f2f8;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;min-height:100vh;padding:24px;text-align:center;
    }
    .icon{font-size:4rem;margin-bottom:20px;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
    h1{font-size:1.5rem;font-weight:800;margin-bottom:10px}
    h1 span{color:#ff6b35}
    p{color:#7b82a0;font-size:15px;max-width:300px;line-height:1.6;margin-bottom:32px}
    .badge{
      background:rgba(255,107,53,.12);border:1px solid rgba(255,107,53,.3);
      color:#ff6b35;padding:6px 14px;border-radius:20px;font-size:13px;
      font-weight:600;margin-bottom:32px
    }
    button{
      background:#ff6b35;color:#fff;border:none;
      padding:14px 32px;border-radius:12px;font-size:16px;
      font-weight:700;cursor:pointer;width:100%;max-width:280px
    }
    button:active{opacity:.85}
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <div class="badge">You're offline</div>
  <h1>Room<span>ie</span></h1>
  <p>No internet connection right now. Connect to Wi-Fi or mobile data to browse rooms and messages.</p>
  <button onclick="location.reload()">Try Again</button>
</body>
</html>`;


/* ══════════════════════════════════════════════════════════
   INSTALL  — pre-cache the entire app shell
   ══════════════════════════════════════════════════════════ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async cache => {
      // Cache the offline page directly (no network needed)
      await cache.put(
        '/offline.html',
        new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } })
      );

      // Cache everything else — ignore individual failures so one
      // missing file doesn't break the whole install
      const results = await Promise.allSettled(
        SHELL_ASSETS.filter(u => u !== '/offline.html').map(url =>
          cache.add(url).catch(() => {/* ignore missing files */})
        )
      );

      return results;
    }).then(() => self.skipWaiting())
  );
});


/* ══════════════════════════════════════════════════════════
   ACTIVATE  — delete old caches
   ══════════════════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  const KEEP = [SHELL_CACHE, PAGES_CACHE, IMAGES_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});


/* ══════════════════════════════════════════════════════════
   FETCH  — the routing heart
   ══════════════════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests (POST, PUT, DELETE → always network)
  if (request.method !== 'GET') return;

  // 2. Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return;

  // 3. Firebase / API calls → NETWORK ONLY, never cache
  if (NETWORK_ONLY_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(
      fetch(request).catch(() =>
        // If Firebase is unreachable we can't do anything meaningful
        new Response(
          JSON.stringify({ error: 'offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // 4. Images → CACHE FIRST (fast), update cache in background
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGES_CACHE));
    return;
  }

  // 5. App shell assets (CSS, JS, fonts) → CACHE FIRST
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'  ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 6. HTML pages → NETWORK FIRST, fall back to cache, then offline page
  if (request.destination === 'document' || request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // 7. Everything else → NETWORK FIRST, fall back to cache
  event.respondWith(networkFirst(request, PAGES_CACHE));
});


/* ══════════════════════════════════════════════════════════
   HELPER STRATEGIES
   ══════════════════════════════════════════════════════════ */

/** Cache First: serve from cache, refresh in background */
async function cacheFirst(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  if (cached) {
    // Background refresh so cache stays fresh
    fetch(request).then(res => {
      if (res && res.ok) cache.put(request, res.clone());
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match('/offline.html');
  }
}

/** Network First for pages: try network, cache on success, fall back offline */
async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // Only cache same-origin pages
      if (new URL(request.url).origin === self.location.origin) {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    // Try the page cache
    const cached = await cache.match(request);
    if (cached) return cached;

    // Try the shell cache (e.g. home.html was pre-cached)
    const shell = await caches.match(request, { cacheName: SHELL_CACHE });
    if (shell) return shell;

    // Last resort: offline page
    return caches.match('/offline.html');
  }
}

/** Network First for other assets */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('', { status: 503 });
  }
}


/* ══════════════════════════════════════════════════════════
   BACKGROUND SYNC  — queue failed actions when offline
   (e.g. sending a message while offline → sends when back online)
   ══════════════════════════════════════════════════════════ */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // Reads from IndexedDB and retries — implement in your chat.js
  // This fires automatically when connection is restored
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
}


/* ══════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS  — ready for when you add them
   ══════════════════════════════════════════════════════════ */
self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Roomie', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Roomie', {
      body:    data.body    || 'You have a new message',
      icon:    '/roomie-192.png',
      badge:   '/roomie-192.png',
      tag:     data.tag     || 'roomie-notification',
      data:    data.url     || '/',
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open',    title: '👀 View' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
                                                           
