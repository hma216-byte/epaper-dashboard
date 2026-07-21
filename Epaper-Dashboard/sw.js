/**
 * sw.js — minimal app-shell service worker.
 * Caches the static shell on install, then serves cache-first with a
 * network fallback so the dashboard keeps working offline (e.g. a
 * Raspberry Pi that temporarily loses Wi-Fi).
 */

const CACHE_NAME = 'epaper-dashboard-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.js',
  './config.js',
  './icons.svg',
  './manifest.json',
  './assets/images/album-placeholder.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
