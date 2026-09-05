import { rateLimits, sessions } from '@watchlist/db';
import { lt } from 'drizzle-orm';
import type { JobContext } from './index.js';

/** Sessao expirada nao autentica ninguem, mas ocupa linha e indice.
 *  Com 0,5 GB de teto, varrer uma vez por dia se paga. */
export async function sessionsCleanup({ db, log }: JobContext): Promise<void> {
  const result = await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  log.info({ deleted: result.rowCount ?? 0 }, 'sessoes expiradas removidas');
}

/** [SLEEP] O contador de rate limit vive no Postgres porque nao ha Redis.
 *  A contrapartida e ter que limpar janela vencida em algum momento. */
export async function rateLimitsCleanup({ db, log }: JobContext): Promise<void> {
  const result = await db.delete(rateLimits).where(lt(rateLimits.windowEnd, new Date()));
  log.info({ deleted: result.rowCount ?? 0 }, 'janelas de rate limit removidas');
}