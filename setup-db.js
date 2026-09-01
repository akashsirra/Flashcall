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
      last_lat DOUBLE PRECISION,
      last_lng DOUBLE PRECISION,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('users table ready');
  await pool.end();
}

setup().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
