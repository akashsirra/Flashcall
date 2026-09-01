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
  const expiresAt = event.notification.data.expiresAt;
  const message = event.notification.body;
  const url = `/flash.html?message=${encodeURIComponent(message)}&expiresAt=${encodeURIComponent(expiresAt)}`;
  event.waitUntil(
    clients.openWindow(url)
  );
});
