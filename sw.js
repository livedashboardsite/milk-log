self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Milk Log', {
    body: data.body || "What about today's milk?",
    icon: '/milk-log/icon.svg',
    badge: '/milk-log/icon.svg',
    vibrate: [200, 100, 200],
    tag: 'milk-reminder',
    renotify: true
  }));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/milk-log/'));
});
