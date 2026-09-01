self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = 'Flashcall';

  const options = {
    body: data.message || 'New flash nearby',
    data: {
      message: data.message || 'New flash nearby',
      expiresAt: data.expiresAt,
      theme: data.theme || 'night'
    },
    tag: 'flashcall-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  const message = data.message || event.notification.body || 'Flash nearby!';
  const expiresAt = data.expiresAt || '';
  const theme = data.theme || 'night';

  const url =
    `/flash.html?message=${encodeURIComponent(message)}` +
    `&expiresAt=${encodeURIComponent(expiresAt)}` +
    `&theme=${encodeURIComponent(theme)}`;

  event.waitUntil(
    clients.openWindow(url)
  );
});
