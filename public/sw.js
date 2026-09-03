self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = 'Flashcall';

  const options = {
    body: data.message || 'New flash nearby',
    data: {
      expiresAt: data.expiresAt,
      message: data.message || 'New flash nearby'
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

  const flashUrl =
    `/flash.html?message=${encodeURIComponent(message)}&expiresAt=${encodeURIComponent(expiresAt)}`;

  event.waitUntil(
    (async () => {
      const clientsList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // If Flashcall is already open, reuse it.
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();

          if ('navigate' in client) {
            await client.navigate(flashUrl);
          }

          return;
        }
      }

      // Otherwise open Flashcall normally first.
      const homeClient = await clients.openWindow('/');

      if (homeClient) {
        await new Promise(resolve => setTimeout(resolve, 500));

        if ('navigate' in homeClient) {
          await homeClient.navigate(flashUrl);
        }

        await homeClient.focus();
      }
    })()
  );
});