const CACHE = 'lesso-v7';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

const BYPASS = [
  'supabase.co','fonts.googleapis.com','fonts.gstatic.com',
  'cdn.jsdelivr.net','fcm.googleapis.com','firebaseinstallations.googleapis.com',
  'gstatic.com/firebasejs','googleapis.com'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // активируемся сразу не ждём закрытия вкладок
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // берём контроль над всеми вкладками
      .then(() => {
        // Сообщаем всем открытым вкладкам — есть обновление, перезагрузись
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (BYPASS.some(d => url.includes(d))) return;

  // index.html — всегда network-first, кэш только при офлайне
  if (url.endsWith('/') || url.includes('index.html') || url === self.location.origin + '/') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) caches.open(CACHE).then(c => c.put('/index.html', response.clone()));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Остальное — cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// ── Push уведомления ──
self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Lesso', body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Lesso', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url); return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
