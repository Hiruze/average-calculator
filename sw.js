const CACHE = 'avg-v4';
const CDN = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';

// Установка
self.addEventListener('install', e => {
  self.skipWaiting(); // Сразу активируем новый SW
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([
        '.',
        'index.html',
        'manifest.json',
        'icon-128.png',
        'icon-512.png'
      ]).then(() => {
        return cache.add(CDN).catch(() => {});
      });
    })
  );
});

// Активация — чистим старый кеш
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim(); // Берём контроль над всеми вкладками
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', e => {
  // Для XLSX — кеш первый
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
  
  // Для index.html — сеть первый (всегда свежая версия)
  if (e.request.url.endsWith('/') || e.request.url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  
  // Остальное — кеш первый
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Сообщаем странице о новом обновлении
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
