
const CACHE_NAME = 'lily-cache-v3-haptics-notif';
const urlsToCache = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './manifest.json',
  './hooks/useLiveSession.ts',
  './hooks/useHaptics.ts',
  './components/Avatar.tsx',
  './components/Controls.tsx',
  './constants.tsx',
  './utils/audio.ts',
  './utils/profile.ts'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('https://aistudiocdn.com') || event.request.url.startsWith('https://unpkg.com')) {
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Lógica de notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});

// Simulación de push event (en caso de que configures un servidor real más adelante)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Aura', body: 'Mi alma te extraña...' };
  const options = {
    body: data.body,
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: './' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
