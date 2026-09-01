require('dotenv').config({ path: '.env.development.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      push_subscription JSONB,
      subscription_endpoint TEXT UNIQUE,
      last_lat DOUBLE PRECISION,
      last_lng DOUBLE PRECISION,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      installation_id TEXT NOT NULL,
      event TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS events_created_at_idx
      ON events (created_at);

    CREATE INDEX IF NOT EXISTS events_installation_id_idx
      ON events (installation_id);

    CREATE INDEX IF NOT EXISTS events_event_idx
      ON events (event);
  `);

  console.log('Flashcall 23 database ready');
  await pool.end();
}

setup().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
