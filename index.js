const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

require('dotenv').config({ path: '.env.development.local' });
const { Pool } = require('pg');
const webpush = require('web-push');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('VAPID_PUBLIC_KEY length:', (process.env.VAPID_PUBLIC_KEY || '').length);
console.log('VAPID_PRIVATE_KEY length:', (process.env.VAPID_PRIVATE_KEY || '').length);

webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

app.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// Register or update a user's push subscription + location
app.post('/register', async (req, res) => {
  try {
    const { subscription, lat, lng } = req.body;
    const endpoint = subscription?.endpoint;

    if (
      !endpoint ||
      typeof endpoint !== 'string' ||
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng)) ||
      Number(lat) < -90 ||
      Number(lat) > 90 ||
      Number(lng) < -180 ||
      Number(lng) > 180
    ) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_REGISTRATION'
      });
    }

    const result = await pool.query(
      `INSERT INTO users
        (push_subscription, subscription_endpoint, last_lat, last_lng, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (subscription_endpoint)
       DO UPDATE SET
         push_subscription = EXCLUDED.push_subscription,
         last_lat = EXCLUDED.last_lat,
         last_lng = EXCLUDED.last_lng,
         updated_at = NOW()
       RETURNING id`,
      [
        JSON.stringify(subscription),
        endpoint,
        Number(lat),
        Number(lng)
      ]
    );

    return res.json({
      ok: true,
      userId: result.rows[0].id
    });
  } catch (error) {
    console.error('Registration failed:', error);
    return res.status(500).json({
      ok: false,
      error: 'REGISTRATION_FAILED'
    });
  }
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Flashcall running on port ${PORT}`);
});
