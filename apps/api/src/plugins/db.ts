import { createPool, type Database } from '@watchlist/db';
import * as schema from '@watchlist/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type pg from 'pg';
import { env } from '../env.js';


declare module 'fastify' {
  interface FastifyInstance {
    pool: pg.Pool;
    db: Database;
  }
}

export const dbPlugin = fp(async (app: FastifyInstance) => {
  const pool = createPool({ connectionString: env.DATABASE_URL });

  pool.on('error', (error) => {
    app.log.warn({ err: error }, 'idle client error');
  });

  app.decorate('pool', pool);
  app.decorate('db', drizzle(pool, { schema }));

  app.addHook('onClose', async () => {
    await pool.end();
  });
});