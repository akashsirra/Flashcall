const statusEl = document.getElementById('status');
const sendBtn = document.getElementById('sendBtn');

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function setStatus(message) {
  statusEl.textContent = message;
}

async function setup() {
  const onboarding = window.flashcallOnboarding;
  const readyFlag = localStorage.getItem('flashcall_ready') === 'true';

  function showOnboarding(message = '') {
    onboarding?.gate.classList.add('visible');
    if (message) {
      onboarding.setupStatus.textContent = message;
    }
  }

  function hideOnboarding() {
    onboarding?.gate.classList.remove('visible');
  }

  async function initialize() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push is not supported on this browser.');
      }

      setStatus('Setting up Flashcall...');

      const registration =
        await navigator.serviceWorker.register('/sw.js');

      let permission = Notification.permission;

      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        throw new Error('Notification permission denied.');
      }

      const vapidRes = await fetch('/vapid-public-key');

      if (!vapidRes.ok) {
        throw new Error('Could not load push configuration.');
      }

      const { key } = await vapidRes.json();

      if (!key) {
        throw new Error('Missing VAPID public key.');
      }

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key)
        });
      }

      setStatus('Getting your location...');

      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;

              const registerRes = await fetch('/register', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  subscription,
                  lat: latitude,
                  lng: longitude
                })
              });

              const data = await registerRes.json();

              if (!registerRes.ok || !data.ok) {
                throw new Error(
                  data.error || 'Registration failed.'
                );
              }

              window.currentLat = latitude;
              window.currentLng = longitude;

              resolve();
            } catch (error) {
              reject(error);
            }
          },
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
          }
        );
      });

      localStorage.setItem('flashcall_ready', 'true');
      hideOnboarding();
      setStatus('Ready to receive flashes nearby.');
    } catch (error) {
      console.error('Setup failed:', error);

      if (onboarding?.gate.classList.contains('visible')) {
        onboarding.setupStatus.textContent =
          error.message || 'Could not set up Flashcall.';

        onboarding.readyBtn.disabled = false;
      } else {
        setStatus(
          'Flashcall setup needs attention. Tap to continue.'
        );
        showOnboarding();
      }
    }
  }

  if (!readyFlag) {
    showOnboarding();
    setStatus('Ready when you are.');

    onboarding.readyBtn.addEventListener('click', async () => {
      onboarding.readyBtn.disabled = true;
      onboarding.setupStatus.textContent =
        'Getting Flashcall ready...';

      await initialize();
    }, { once: true });

    return;
  }

  // Returning users skip onboarding.
  // Permissions are checked only when setup is actually needed.
  if (
    Notification.permission === 'granted' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  ) {
    await initialize();
  } else {
    showOnboarding(
      'A permission needs attention before you can receive Flashes.'
    );

    onboarding.readyBtn.addEventListener('click', async () => {
      onboarding.readyBtn.disabled = true;
      await initialize();
    }, { once: true });
  }
}

sendBtn.addEventListener('click', async () => {
  if (sendBtn.disabled) {
    return;
  }

  const messageEl = document.getElementById('message');
  const durationEl = document.getElementById('duration');

  const message = messageEl.value.trim();
  const minutes = parseInt(durationEl.value, 10);

  if (!message) {
    setStatus('Enter a message first.');
    messageEl.focus();
    return;
  }

  if (
    !Number.isFinite(window.currentLat) ||
    !Number.isFinite(window.currentLng)
  ) {
    setStatus('Waiting for location...');
    return;
  }

  sendBtn.disabled = true;
  setStatus('Sending...');

  try {
    const res = await fetch('/flash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        lat: window.currentLat,
        lng: window.currentLng,
        message,
        minutes,
        theme: window.selectedFlashTheme || 'night'
      })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      if (data.error === 'INVALID_LOCATION') {
        throw new Error('Your location is invalid.');
      }

      if (data.error === 'INVALID_MESSAGE') {
        throw new Error('Message must be 1–100 characters.');
      }

      if (data.error === 'INVALID_DURATION') {
        throw new Error('Invalid flash duration.');
      }

      throw new Error(data.error || 'Could not send flash.');
    }

    setStatus(
      `Sent to ${data.sent} of ${data.targeted} nearby people!`
    );

    if (data.removed > 0) {
      console.log(`Removed ${data.removed} expired push subscription(s).`);
    }
  } catch (error) {
    console.error('Flash failed:', error);
    setStatus(error.message || 'Could not send flash. Please try again.');
  } finally {
    sendBtn.disabled = false;
  }
});

setup();
