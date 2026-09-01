with open('public/sw.js', 'r') as f:
    content = f.read()

old = """self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});"""

new = """self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const expiresAt = event.notification.data.expiresAt;
  const message = event.notification.body;
  const url = `/flash.html?message=${encodeURIComponent(message)}&expiresAt=${encodeURIComponent(expiresAt)}`;
  event.waitUntil(
    clients.openWindow(url)
  );
});"""

content = content.replace(old, new)

with open('public/sw.js', 'w') as f:
    f.write(content)

print("Patched sw.js")
