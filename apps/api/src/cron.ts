import { createPool } from '@watchlist/db';
import * as schema from '@watchlist/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import pino from 'pino';
import { env } from './env.js';
import { DAILY_JOBS } from './jobs/index.js';
import { drainQueue, enqueue, reclaimStuck } from './services/job-queue.js';

/**
 * [SLEEP] Servico separado da API, de proposito. Se o trabalho diario
 * rodasse dentro da API, ela precisaria estar acordada na hora marcada,
 * o que anula o modo Serverless. Este processo sobe, drena a fila e sai.
 */
const log = pino({ level: env.LOG_LEVEL });

const pool = createPool({ connectionString: env.DATABASE_URL, max: 2 });
const db = drizzle(pool, { schema });

try {
  const reclaimed = await reclaimStuck(db);
  if (reclaimed > 0) log.warn({ reclaimed }, 'jobs orfaos devolvidos para a fila');

  for (const type of DAILY_JOBS) {
    const job = await enqueue(db, type);
    log.info({ type, enfileirado: job !== null }, 'job diario');
  }

  await drainQueue(db, log);
} catch (error) {
  log.error({ err: error }, 'cron falhou');
  process.exitCode = 1;
} finally {
  await pool.end();
}