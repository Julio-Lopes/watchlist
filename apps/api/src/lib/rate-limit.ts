import { sql } from 'drizzle-orm';
import type { Database } from '@watchlist/db';
import { rateLimited } from './errors.js';

/**
 * [SLEEP] Substitui o Redis. Uma instrucao com ON CONFLICT: sem leitura previa,
 * sem corrida entre requisicoes concorrentes. Janelas vencidas sao apagadas
 * pelo cron diario, nao aqui.
 */
export async function consumeRateLimit(
  db: Database,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const result = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, window_end)
    values (${key}, 1, now() + (${windowSeconds}::int * interval '1 second'))
    on conflict (key) do update set
      count = case when rate_limits.window_end < now() then 1 else rate_limits.count + 1 end,
      window_end = case
        when rate_limits.window_end < now()
        then now() + (${windowSeconds}::int * interval '1 second')
        else rate_limits.window_end
      end
    returning count
  `);

  const count = result.rows[0]?.count ?? 0;

  if (count > limit) {
    throw rateLimited();
  }
}
