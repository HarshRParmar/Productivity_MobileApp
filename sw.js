// Bump this version every time you deploy changes — forces PWA to reload fresh files
const CACHE_NAME = 'productivity-app-v4';

const urlsToCache = [
  '/Productivity_MobileApp/icon-192.png',
  '/Productivity_MobileApp/icon-512.png',
  '/Productivity_MobileApp/manifest.json'
];

// Install — cache only static assets, activate immediately
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate — delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for HTML/JS (always fresh), cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHtmlOrJs = url.pathname.endsWith('.html') || url.pathname.endsWith('.js');

  if (isHtmlOrJs) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
