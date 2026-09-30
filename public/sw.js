
const CACHE_NAME = 'nazvik-v2';
const STATIC_ASSETS = [
  '/icon.svg',
  '/morning.svg',
  '/afternoon.svg',
  '/evening.svg',
  '/night.svg',
  '/check-out-calendar.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Never cache HTML pages or root — always fetch fresh from network
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(request));
    return;
  }

  // For static assets: cache first, fallback to network
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'NazVik Farmhouse', {
      body: data.body ?? 'You have a new notification',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag ?? 'nazvik-general',
    })
  );
});
