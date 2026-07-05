self.addEventListener('install', (e) => {
  // Service Worker installed
});

self.addEventListener('fetch', (e) => {
  // Pass-through fetch handler
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
