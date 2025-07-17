const CACHE_NAME = 'tigps-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/mobile.html',
  '/styles.css',
  '/mobile-styles.css',
  '/script.js',
  '/mobile.js',
  '/tigps.png',
  '/tigtalks.png',
  '/logo.png',
  '/space.jpg',
  '/gif.jpg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
}); 