self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification('Flashcall', {
      body: data.message || 'New flash nearby',
      data: {
        message: data.message || 'New flash nearby',
        expiresAt: data.expiresAt || ''
      },
      tag: 'flashcall-notification'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  const params = new URLSearchParams({
    flash: '1',
    message: data.message || event.notification.body || 'Flash nearby!',
    expiresAt: data.expiresAt || ''
  });

  const url = `/?${params.toString()}`;

  event.waitUntil(
    (async () => {
      const clientsList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();

          if ('navigate' in client) {
            await client.navigate(url);
          }

          return;
        }
      }

      await clients.openWindow(url);
    })()
  );
});