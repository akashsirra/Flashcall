with open('index.js', 'r') as f:
    content = f.read()

old = """app.get('/', (req, res) => {
  res.send('Flashcall server is alive');
});"""

new = """require('dotenv').config({ path: '.env.development.local' });
const { Pool } = require('pg');
const webpush = require('web-push');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

app.get('/', (req, res) => {
  res.send('Flashcall server is alive');
});

// Register or update a user's push subscription + location
app.post('/register', async (req, res) => {
  const { subscription, lat, lng } = req.body;
  const result = await pool.query(
    'INSERT INTO users (push_subscription, last_lat, last_lng) VALUES ($1, $2, $3) RETURNING id',
    [JSON.stringify(subscription), lat, lng]
  );
  res.json({ userId: result.rows[0].id });
});

// Send a flash broadcast to nearby users
app.post('/flash', async (req, res) => {
  const { lat, lng, message, minutes } = req.body;
  const radiusKm = 5;
  const expiresAt = new Date(Date.now() + minutes * 60000);

  const nearby = await pool.query(
    `SELECT * FROM users WHERE
     (6371 * acos(cos(radians($1)) * cos(radians(last_lat)) *
     cos(radians(last_lng) - radians($2)) + sin(radians($1)) *
     sin(radians(last_lat)))) < $3`,
    [lat, lng, radiusKm]
  );

  let sent = 0;
  for (const user of nearby.rows) {
    try {
      await webpush.sendNotification(
        user.push_subscription,
        JSON.stringify({ message, expiresAt })
      );
      sent++;
    } catch (err) {
      console.error('Push failed for user', user.id, err.message);
    }
  }

  res.json({ sent, expiresAt });
});"""

content = content.replace(old, new)

with open('index.js', 'w') as f:
    f.write(content)

print("Patched index.js")
