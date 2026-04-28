// Lesso SW v9 — install-only skipWaiting, network-first
const CACHE_NAME = 'lesso-v9';

self.addEventListener('install', event => {
  // НЕ кэшируем ничего при install — caches.addAll вешал SW если иконки не найдены
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase, Firebase, Google APIs — никогда не кэшировать
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('fcm.') ||
      url.hostname.includes('gstatic.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Только GET кэшируем
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first: пробуем сеть, при ошибке — кэш
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});