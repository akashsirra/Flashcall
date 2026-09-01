self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = 'Flashcall';
  const options = {
    body: data.message || 'New flash nearby',
    data: { expiresAt: data.expiresAt },
    tag: 'flashcall-notification'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
