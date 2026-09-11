import { createPool, media } from '@watchlist/db';
import * as schema from '@watchlist/db';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pino from 'pino';
import { env } from './env.js';

/**
 * Script de uma vez so, nao job: isso acontece uma unica vez na vida do
 * projeto. Reescreve as obras de anime que vieram da AniList para a fonte
 * mal, usando o mal_id que gravamos na Etapa 4. As que nao tem mal_id ficam
 * como estao, sem atualizacao.
 */
const log = pino({ level: 'info', transport: { target: 'pino-pretty' } });

const pool = createPool({ connectionString: env.DATABASE_URL, max: 2 });
const db = drizzle(pool, { schema });

try {
  const candidates = await db
    .select({ id: media.id, malId: media.malId, title: media.title })
    .from(media)
    .where(and(eq(media.source, 'anilist'), isNotNull(media.malId)));

  log.info({ total: candidates.length }, 'obras a migrar');

  let migrated = 0;
  let skipped = 0;

  for (const row of candidates) {
    if (row.malId === null) continue;

    /** Pode ja existir uma linha mal com esse external_id, se alguem abriu a
     *  mesma obra depois da troca. Nesse caso a antiga fica como esta: fundir
     *  as duas exigiria remapear media_entries e nao vale o risco. */
    const [conflict] = await db
      .select({ id: media.id })
      .from(media)
      .where(
        and(
          eq(media.source, 'mal'),
          eq(media.mediaType, 'anime'),
          eq(media.externalId, row.malId)
        )
      )
      .limit(1);

    if (conflict) {
      log.warn({ title: row.title }, 'ja existe versao mal, pulando');
      skipped += 1;
      continue;
    }

    await db
      .update(media)
      .set({
        source: 'mal',
        externalId: row.malId,
        /** refreshed_at zerado para o proximo acesso buscar do Jikan e
         *  corrigir nota, generos e duracao, que divergem entre as fontes. */
        refreshedAt: sql`now() - interval '10 years'`
      })
      .where(eq(media.id, row.id));

    migrated += 1;
  }

  const [remaining] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(media)
    .where(eq(media.source, 'anilist'));

  log.info({ migrated, skipped, legado: remaining?.total ?? 0 }, 'migracao concluida');
} catch (error) {
  log.error({ err: error }, 'migracao falhou');
  process.exitCode = 1;
} finally {
  await pool.end();
}