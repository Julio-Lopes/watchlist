import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPool } from './client.js';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL_UNPOOLED ou DATABASE_URL precisa estar definida.');
}

const pool = createPool({ connectionString: url, max: 1 });

try {
  await migrate(drizzle(pool), { migrationsFolder: './migrations' });
  console.log('Migrations aplicadas.');
} finally {
  await pool.end();
}