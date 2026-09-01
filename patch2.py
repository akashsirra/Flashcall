with open('index.js', 'r') as f:
    content = f.read()

old = """webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);"""

new = """console.log('VAPID_PUBLIC_KEY length:', (process.env.VAPID_PUBLIC_KEY || '').length);
console.log('VAPID_PRIVATE_KEY length:', (process.env.VAPID_PRIVATE_KEY || '').length);

webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);"""

content = content.replace(old, new)

with open('index.js', 'w') as f:
    f.write(content)

print("Patched with diagnostic logging")
