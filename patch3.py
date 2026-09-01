with open('index.js', 'r') as f:
    content = f.read()

old = "app.use(express.json());"

new = """app.use(express.json());
app.use(express.static('public'));"""

content = content.replace(old, new, 1)

old2 = "app.get('/', (req, res) => {\n  res.send('Flashcall server is alive');\n});"
new2 = "app.get('/vapid-public-key', (req, res) => {\n  res.json({ key: process.env.VAPID_PUBLIC_KEY });\n});"

content = content.replace(old2, new2)

with open('index.js', 'w') as f:
    f.write(content)

print("Patched: static serving + vapid key endpoint")
