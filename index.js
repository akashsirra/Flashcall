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

const FLASH_THEMES = new Set([
  'night',
  'heat',
  'wave',
  'clean'
]);

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
  try {
    const { lat, lng, message, minutes, theme } = req.body;

    const latitude = Number(lat);
    const longitude = Number(lng);
    const duration = Number(minutes);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_LOCATION'
      });
    }

    if (
      typeof message !== 'string' ||
      message.trim().length === 0 ||
      message.length > 100
    ) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_MESSAGE'
      });
    }

    if (![5, 15, 30, 60].includes(duration)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_DURATION'
      });
    }

    const flashTheme = theme == null || theme === '' ? 'night' : theme;

    if (typeof flashTheme !== 'string' || !FLASH_THEMES.has(flashTheme)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_THEME'
      });
    }

    const radiusKm = 5;
    const expiresAt = new Date(Date.now() + duration * 60000);

    const nearby = await pool.query(
      `SELECT id, push_subscription, subscription_endpoint
       FROM users
       WHERE last_lat IS NOT NULL
         AND last_lng IS NOT NULL
         AND (
           6371 * acos(
             LEAST(
               1,
               GREATEST(
                 -1,
                 cos(radians($1)) * cos(radians(last_lat)) *
                 cos(radians(last_lng) - radians($2)) +
                 sin(radians($1)) * sin(radians(last_lat))
               )
             )
           )
         ) < $3`,
      [latitude, longitude, radiusKm]
    );

    let sent = 0;
    let removed = 0;

    for (const user of nearby.rows) {
      try {
        await webpush.sendNotification(
          user.push_subscription,
          JSON.stringify({
            message: message.trim(),
            expiresAt,
            theme: flashTheme
          })
        );

        sent++;
      } catch (err) {
        console.error(
          'Push failed for user',
          user.id,
          'status:',
          err.statusCode || 'unknown',
          err.message
        );

        if (err.statusCode === 404 || err.statusCode === 410) {
          const deleted = await pool.query(
            `DELETE FROM users
             WHERE subscription_endpoint = $1
             RETURNING id`,
            [user.subscription_endpoint]
          );

          removed += deleted.rowCount;
        }
      }
    }

    return res.json({
      ok: true,
      sent,
      removed,
      targeted: nearby.rows.length,
      expiresAt
    });
  } catch (error) {
    console.error('Flash failed:', error);

    return res.status(500).json({
      ok: false,
      error: 'FLASH_FAILED'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Flashcall running on port ${PORT}`);
});
