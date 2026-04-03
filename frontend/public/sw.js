self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'PillMate', {
      body: data.body ?? '복약 시간이에요!',
      icon: '/PillMate.png',
      badge: '/favicon-32x32.png',
      tag: 'medication-reminder',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/schedule'));
});
