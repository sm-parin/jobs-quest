// Minimal pass-through service worker.
// Satisfies Chrome's PWA installability requirement without
// interfering with Next.js's own caching or SSR responses.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass all requests through to the network unchanged.
  // Next.js handles its own caching; we don't interfere.
  event.respondWith(fetch(event.request));
});
