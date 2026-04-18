importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBpU-blJhG8Jy6LgVk30PBem-FC2gU7d1Y",
  authDomain: "lesso-app-41e45.firebaseapp.com",
  projectId: "lesso-app-41e45",
  storageBucket: "lesso-app-41e45.firebasestorage.app",
  messagingSenderId: "117464511883",
  appId: "1:117464511883:web:a6df8d18538e50a324ab8e"
});

const messaging = firebase.messaging();

// Обработка push когда приложение закрыто (background)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Lesso';
  const body = payload.notification?.body || '';
  const url = payload.data?.url || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url },
    vibrate: [200, 100, 200]
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
