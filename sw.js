// SKE TRUCK Service Worker v2
const CACHE_NAME = 'ske-truck-v2';

// Cache เฉพาะ static assets หลัก
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // ไม่ cache firebase หรือ googleapis
  const url = event.request.url;
  if (url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    // Network first, fallback to cache
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
