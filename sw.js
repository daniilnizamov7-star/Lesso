// Lesso SW v11 — сборка 2026-04-28
// ВАЖНО: меняй дату при каждом деплое — браузер обнаружит изменение файла и обновит SW
const CACHE = 'lesso-v11';

self.addEventListener('install', () => {
  // Сразу активируемся — не ждём закрытия старых вкладок
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Не кэшируем API и внешние сервисы
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('jsdelivr') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/storage/') ||
    url.pathname.includes('/functions/')
  ) {
    return; // браузер сам делает запрос
  }

  if (event.request.method !== 'GET') return;

  // Network-first: берём свежее с сервера, при офлайне — кэш
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          caches.open(CACHE)
            .then(cache => cache.put(event.request, response.clone()))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Принимаем команду SKIP_WAITING от страницы
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Push-уведомления
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Lesso', body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Lesso', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200]
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url); return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
