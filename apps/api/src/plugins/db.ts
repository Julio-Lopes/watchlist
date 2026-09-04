import { createPool } from '@watchlist/db';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type pg from 'pg';
import { env } from '../env.js';

declare module 'fastify' {
  interface FastifyInstance {
    pool: pg.Pool;
  }
}

export const dbPlugin = fp(async (app: FastifyInstance) => {
  const pool = createPool({ connectionString: env.DATABASE_URL });

  /** Erro em conexao ociosa nao pode derrubar o processo: o Neon fecha
   *  conexao ao suspender, e isso e comportamento esperado aqui. */
  pool.on('error', (error) => {
    app.log.warn({ err: error }, 'idle client error');
  });

  app.decorate('pool', pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });
});