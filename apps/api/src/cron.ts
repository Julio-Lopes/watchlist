import { createPool, type Database } from '@watchlist/db';
import * as schema from '@watchlist/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import pino from 'pino';
import { env } from './env.js';
import { handlers, DAILY_JOBS } from './jobs/index.js';
import {
  claimNext,
  enqueue,
  markCompleted,
  markFailed,
  reclaimStuck,
  reportProgress
} from './services/job-queue.js';

/**
 * [SLEEP] Servico separado da API, de proposito. Se o trabalho diario
 * rodasse dentro da API, ela precisaria estar acordada na hora marcada,
 * o que anula o modo Serverless. Este processo sobe, drena a fila e sai.
 */
const log = pino({ level: env.LOG_LEVEL });

/** Teto de seguranca: o cron nunca deve virar um processo que nao termina. */
const MAX_RUNTIME_MS = 10 * 60 * 1000;

async function drain(db: Database): Promise<void> {
  const deadline = Date.now() + MAX_RUNTIME_MS;

  while (Date.now() < deadline) {
    const job = await claimNext(db);
    if (!job) return;

    const jobLog = log.child({ jobId: job.id, type: job.type });
    jobLog.info({ attempt: job.attempts }, 'job iniciado');

    const handler = handlers[job.type as keyof typeof handlers];

    if (!handler) {
      await markFailed(db, job, new Error(`tipo desconhecido: ${job.type}`));
      continue;
    }

    try {
      await handler({
        db,
        log: jobLog as never,
        payload: (job.payload ?? {}) as Record<string, unknown>,
        onProgress: async (progress, total) => {
          await reportProgress(db, job.id, progress, total);
        }
      });

      await markCompleted(db, job.id);
      jobLog.info('job concluido');
    } catch (error) {
      await markFailed(db, job, error);
      jobLog.error({ err: error }, 'job falhou');
    }
  }

  log.warn('tempo maximo atingido, saindo com a fila ainda cheia');
}

const pool = createPool({ connectionString: env.DATABASE_URL, max: 2 });
const db = drizzle(pool, { schema });

try {
  const reclaimed = await reclaimStuck(db);
  if (reclaimed > 0) log.warn({ reclaimed }, 'jobs orfaos devolvidos para a fila');

  for (const type of DAILY_JOBS) {
    const job = await enqueue(db, type);
    log.info({ type, enfileirado: job !== null }, 'job diario');
  }

  await drain(db);
} catch (error) {
  log.error({ err: error }, 'cron falhou');
  process.exitCode = 1;
} finally {
  await pool.end();
}