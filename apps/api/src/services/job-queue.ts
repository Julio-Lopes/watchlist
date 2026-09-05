import { type Database, jobQueue } from '@watchlist/db';
import type { JobType } from '@watchlist/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';

/** Tres tentativas e o job vira failed, com o erro guardado.
 *  Retry infinito em job quebrado consome o tempo acordado do dia inteiro. */
const MAX_ATTEMPTS = 3;

/** Job preso em processing por mais que isso e considerado orfao. E o que
 *  acontece quando o SIGTERM de um deploy chega no meio do processamento. */
const STUCK_AFTER_MINUTES = 10;

export type Job = typeof jobQueue.$inferSelect;

export async function enqueue(
  db: Database,
  type: JobType,
  payload: Record<string, unknown> = {},
  userId: string | null = null
): Promise<Job | null> {
  /** Idempotencia na entrada: se ja existe um job do mesmo tipo esperando,
   *  nao empilha outro. O cron pode rodar duas vezes sem duplicar trabalho. */
  if (!userId) {
    const [existing] = await db
      .select({ id: jobQueue.id })
      .from(jobQueue)
      .where(and(eq(jobQueue.type, type), inArray(jobQueue.status, ['pending', 'processing'])))
      .limit(1);

    if (existing) return null;
  }

  const [job] = await db.insert(jobQueue).values({ type, payload, userId }).returning();
  return job ?? null;
}

/** Devolve para pending o que ficou orfao. Roda antes de drenar a fila. */
export async function reclaimStuck(db: Database): Promise<number> {
  const result = await db.execute(sql`
    update job_queue
    set status = 'pending'
    where status = 'processing'
      and run_at < now() - (${STUCK_AFTER_MINUTES}::int * interval '1 minute')
    returning id
  `);

  return result.rowCount ?? 0;
}

/**
 * Reivindica um job numa unica instrucao. O FOR UPDATE SKIP LOCKED existe
 * para que duas instancias nunca peguem a mesma linha, mesmo durante o
 * overlap de um deploy.
 */
export async function claimNext(db: Database): Promise<Job | null> {
  const result = await db.execute<Job>(sql`
    update job_queue
    set status = 'processing',
        attempts = attempts + 1,
        run_at = now()
    where id = (
      select id from job_queue
      where status = 'pending' and run_at <= now()
      order by created_at
      limit 1
      for update skip locked
    )
    returning *
  `);

  return result.rows[0] ?? null;
}

export const reportProgress = (db: Database, id: string, progress: number, total: number) =>
  db.update(jobQueue).set({ progress, total }).where(eq(jobQueue.id, id));

export const markCompleted = (db: Database, id: string) =>
  db.update(jobQueue).set({ status: 'completed', lastError: null }).where(eq(jobQueue.id, id));

export async function markFailed(db: Database, job: Job, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const exhausted = job.attempts >= MAX_ATTEMPTS;

  await db
    .update(jobQueue)
    .set({
      status: exhausted ? 'failed' : 'pending',
      lastError: message.slice(0, 1000),
      /** Backoff simples entre tentativas: 1, 4 e 9 minutos. */
      runAt: exhausted ? new Date() : new Date(Date.now() + job.attempts ** 2 * 60_000)
    })
    .where(eq(jobQueue.id, job.id));
}