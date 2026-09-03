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

  const flash = {
    message:
      data.message ||
      event.notification.body ||
      'Flash nearby!',

    expiresAt:
      data.expiresAt || ''
  };


  const params = new URLSearchParams({
    flash: '1',
    message: flash.message,
    expiresAt: flash.expiresAt
  });


  const url = `/?${params.toString()}`;


  event.waitUntil(
    (async () => {

      const clientsList =
        await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });


      // Flashcall is already open.
      // Reuse the existing app window.
      for (const client of clientsList) {

        if ('focus' in client) {

          await client.focus();


          if ('postMessage' in client) {

            client.postMessage({
              type: 'SHOW_FLASH',
              message: flash.message,
              expiresAt: flash.expiresAt
            });

          }

          return;
        }
      }


      // Flashcall is not open.
      // Launch the app with the flash information.
      await clients.openWindow(url);

    })()
  );
});