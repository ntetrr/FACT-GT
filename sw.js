// =================================================================
// FESTO GT - Service Worker mínimo (PWA instalable + carga rápida)
// Precachea solo el "app shell" estático. NO cachea Firestore ni CDNs.
// IMPORTANTE: subir el número de CACHE cada vez que cambie un asset del shell.
// =================================================================

const CACHE = 'gt-shell-v1';

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/db.js',
  './js/firebase-config.js',
  './acreditation.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET y solo mismo origen. Todo lo demás (CDNs, Firebase, Fonts) pasa directo a la red.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navegación: red primero, con index.html cacheado como respaldo offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto de assets del mismo origen: cache-first con relleno en segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
