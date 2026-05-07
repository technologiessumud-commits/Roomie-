const CACHE = 'roomie-v3';

const SHELL = [
  '/',
  '/index.html',
  '/splash.html',
  '/home.html',
  '/login.html',
  '/signup.html',
  '/setup.html',
  '/profile.html',
  '/roommate.html',
  '/messages.html',
  '/chat.html',
  '/style.css',
  '/firebase.js',
  '/upload.js',
  '/theme.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', event => {

  // Ignore Firebase/API requests
  if (
    event.request.url.includes('firestore') ||
    event.request.url.includes('googleapis') ||
    event.request.url.includes('gstatic')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {

      // Return cached first
      if (cached) return cached;

      // Otherwise fetch normally
      return fetch(event.request)
        .then(response => {

          // Save copy
          const clone = response.clone();

          caches.open(CACHE)
            .then(cache => cache.put(event.request, clone));

          return response;
        })
        .catch(() => {
          return caches.match('/index.html');
        });
    })
  );
});
