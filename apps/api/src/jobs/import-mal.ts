import { media, mediaEntries } from '@watchlist/db';
import type { ImportResult } from '@watchlist/shared';
import { and, eq } from 'drizzle-orm';
import { parseMalXml } from '../services/import.js';
import { getMediaDetail } from '../services/media.js';
import type { JobContext } from './index.js';

interface Payload {
  userId: string;
  xml: string;
  overwrite: boolean;
}

/**
 * Importa a lista do MyAnimeList. Roda como job porque trezentas obras levam
 * minutos: cada uma pode precisar de uma chamada a fonte para entrar em
 * media, e o limitador do cliente espaca as requisicoes.
 */
export async function importMal({ db, job, log, onProgress, isCancelled }: JobContext): Promise<ImportResult> {
  const payload = job.payload as unknown as Payload;
  const entries = parseMalXml(payload.xml);

  const result: ImportResult = {
    total: entries.length,
    imported: 0,
    skipped: 0,
    failures: []
  };

  log.info({ total: entries.length }, 'import.mal iniciado');

  for (const [index, entry] of entries.entries()) {
    if (await isCancelled()) return result;

    try {
      /** Busca local primeiro: obras ja no catalogo nao gastam chamada. */
      const [local] = await db
        .select({ id: media.id, totalEpisodes: media.totalEpisodes })
        .from(media)
        .where(
          and(
            eq(media.source, 'mal'),
            eq(media.mediaType, 'anime'),
            eq(media.externalId, entry.malId)
          )
        )
        .limit(1);

      const detail = local ?? (await getMediaDetail(db, 'mal', 'anime', entry.malId));

      if (!detail) {
        result.failures.push({
          malId: entry.malId,
          title: entry.title,
          reason: 'não encontrada na fonte'
        });
        continue;
      }

      const [existing] = await db
        .select({ id: mediaEntries.id })
        .from(mediaEntries)
        .where(
          and(eq(mediaEntries.userId, payload.userId), eq(mediaEntries.mediaId, detail.id))
        )
        .limit(1);

      if (existing && !payload.overwrite) {
        result.skipped += 1;
        continue;
      }

      const values = {
        userId: payload.userId,
        mediaId: detail.id,
        status: entry.status,
        episodesWatched: entry.episodesWatched,
        userRating: entry.score,
        rewatchCount: entry.rewatchCount,
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt
      };

      /** Sem watch_events: a importacao traz historico declarado, nao
       *  atividade de hoje. Criar eventos inventaria um streak que nunca
       *  existiu e poluiria o heatmap com uma barra no dia da importacao. */
      await db
        .insert(mediaEntries)
        .values(values)
        .onConflictDoUpdate({
          target: [mediaEntries.userId, mediaEntries.mediaId],
          set: {
            status: values.status,
            episodesWatched: values.episodesWatched,
            userRating: values.userRating,
            rewatchCount: values.rewatchCount,
            startedAt: values.startedAt,
            finishedAt: values.finishedAt,
            updatedAt: new Date()
          }
        });

      result.imported += 1;
    } catch (error) {
      result.failures.push({
        malId: entry.malId,
        title: entry.title,
        reason: error instanceof Error ? error.message.slice(0, 100) : 'erro desconhecido'
      });
    }

    await onProgress(index + 1, entries.length);
  }

  await onProgress(entries.length, entries.length);
  log.info(result, 'import.mal concluido');

  return result;
}