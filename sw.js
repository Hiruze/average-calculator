const CACHE = 'avg-v3';
const CDN = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([
        '.',
        'index.html',
        'manifest.json',
        'icon-128.png',
        'icon-512.png'
      ]).then(() => {
        // Кешируем XLSX в фоне (не блокирует установку)
        return cache.add(CDN).catch(() => {});
      });
    })
  );
});

self.addEventListener('fetch', e => {
  // Для XLSX — кеш первый, сеть фоном
  if (e.request.url.includes('sheetjs')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
  
  // Остальное — кеш первый
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
