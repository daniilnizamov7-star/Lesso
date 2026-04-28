// Lesso SW — auto-update, network-first
// BUILD: 2026-04-28T10:00:00Z (обновляй при каждом деплое — браузер увидит изменение и обновит SW)
const CACHE_NAME = 'lesso-v10';

self.addEventListener('install', () => {
  // skipWaiting сразу — не ждём закрытия всех вкладок
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Удаляем старые кэши
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API запросы — никогда не кэшировать
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('fcm.') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.includes('/functions/') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/auth/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Только GET
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first: всегда пробуем свежее с сервера, кэш — только при офлайне
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, response.clone()))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Получаем команду активации от страницы
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});