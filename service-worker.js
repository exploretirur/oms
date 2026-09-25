// Explore Learning — Institute Management: PWA service worker
//
// This only caches the app SHELL (index.html, manifest, icons) so the app
// can still open — and show something — with no connection. It deliberately
// does NOT touch Firebase/Firestore requests, Google Fonts, or any CDN
// script: those always go straight to the network so live student/fee/
// attendance data is never served stale from a cache.
//
// Strategy: network-first for the shell. Online, you always get the
// latest deployed version of the app; only if the network request fails
// (offline) does it fall back to whatever shell was last cached.

const CACHE_NAME = 'explore-oms-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => console.warn('Service worker: shell pre-cache failed', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Only manage the app's own shell files. Everything else (Firebase,
  // Firestore, fonts.googleapis.com, cdnjs, etc.) is left completely
  // untouched — the browser handles those requests normally.
  const isAppShell = url.origin === self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('index.html') ||
     url.pathname.endsWith('manifest.json') || url.pathname.endsWith('.png'));
  if (!isAppShell) return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
