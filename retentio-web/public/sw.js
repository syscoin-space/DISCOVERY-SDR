// Retentio Push Notification Service Worker

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.corpo,
      icon: data.icon || '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.url },
      tag: data.tipo,
      renotify: true,
      actions: [
        { action: 'open', title: 'Ver agora' },
        { action: 'dismiss', title: 'Dispensar' },
      ],
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});
