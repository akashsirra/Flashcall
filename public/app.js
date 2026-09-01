const statusEl = document.getElementById('status');
const sendBtn = document.getElementById('sendBtn');

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function setup() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    statusEl.textContent = 'Push not supported on this browser.';
    return;
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    statusEl.textContent = 'Notification permission denied.';
    return;
  }

  const vapidRes = await fetch('/vapid-public-key');
  const { key } = await vapidRes.json();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key)
  });

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, lat: latitude, lng: longitude })
    });
    window.currentLat = latitude;
    window.currentLng = longitude;
    statusEl.textContent = 'Ready to receive flashes nearby.';
  }, () => {
    statusEl.textContent = 'Location permission denied.';
  });
}

sendBtn.addEventListener('click', async () => {
  const message = document.getElementById('message').value;
  const minutes = parseInt(document.getElementById('duration').value);

  if (!message) {
    statusEl.textContent = 'Enter a message first.';
    return;
  }

  if (!window.currentLat) {
    statusEl.textContent = 'Waiting for location...';
    return;
  }

  statusEl.textContent = 'Sending...';
  const res = await fetch('/flash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: window.currentLat, lng: window.currentLng, message, minutes })
  });
  const data = await res.json();
  statusEl.textContent = `Sent to ${data.sent} people nearby!`;
});

setup();
