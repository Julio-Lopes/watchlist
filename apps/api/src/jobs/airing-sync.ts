import { airingSchedule, media } from '@watchlist/db';
import { eq, lt } from 'drizzle-orm';
import { getAiringSchedules } from '../clients/anilist.js';
import { getShow } from '../clients/tmdb.js';
import type { JobContext } from './index.js';

/** Quanto tempo um episodio agendado sobrevive depois de ir ao ar.
 *  O calendario olha para tras alguns dias; alem disso e so peso. */
const RETENTION_DAYS = 7;

const BATCH = 25;

export async function airingSync({ db, log, onProgress }: JobContext): Promise<void> {
  const airing = await db
    .select({ id: media.id, source: media.source, externalId: media.externalId })
    .from(media)
    .where(eq(media.airingStatus, 'airing'));

  if (airing.length === 0) return;

  const anime = airing.filter((row) => row.source === 'anilist');
  const shows = airing.filter((row) => row.source === 'tmdb');

  let done = 0;
  const total = anime.length + shows.length;

  for (let index = 0; index < anime.length; index += BATCH) {
    const slice = anime.slice(index, index + BATCH);
    const byExternal = new Map(slice.map((row) => [row.externalId, row.id]));

    try {
      const schedules = await getAiringSchedules(slice.map((row) => row.externalId));

      for (const schedule of schedules) {
        const mediaId = byExternal.get(schedule.id);
        if (!mediaId) continue;

        for (const node of schedule.airingSchedule.nodes) {
          const airingAt = new Date(node.airingAt * 1000);

          /** O UNIQUE NULLS NOT DISTINCT em (media_id, season_number,
           *  episode_number) e o que torna este job idempotente. Sem ele,
           *  cada execucao inseriria os mesmos episodios de novo. */
          await db
            .insert(airingSchedule)
            .values({
              mediaId,
              episodeNumber: node.episode,
              seasonNumber: null,
              airingAt,
              expiresAt: new Date(airingAt.getTime() + RETENTION_DAYS * 86_400_000)
            })
            .onConflictDoUpdate({
              target: [
                airingSchedule.mediaId,
                airingSchedule.seasonNumber,
                airingSchedule.episodeNumber
              ],
              set: { airingAt }
            });
        }
      }
    } catch (error) {
      /** Uma fonte fora do ar nao pode abortar o job inteiro: o lote
       *  seguinte pode ser de outra fonte, e amanha ele tenta de novo. */
      log.warn({ err: error }, 'lote da anilist falhou');
    }

    done += slice.length;
    await onProgress(done, total);
  }

  for (const show of shows) {
    try {
      const detail = await getShow(show.externalId);
      const next = (detail as { next_episode_to_air?: { episode_number: number; season_number: number; air_date: string | null } }).next_episode_to_air;

      if (next?.air_date) {
        const airingAt = new Date(`${next.air_date}T00:00:00Z`);

        await db
          .insert(airingSchedule)
          .values({
            mediaId: show.id,
            episodeNumber: next.episode_number,
            seasonNumber: next.season_number,
            airingAt,
            expiresAt: new Date(airingAt.getTime() + RETENTION_DAYS * 86_400_000)
          })
          .onConflictDoUpdate({
            target: [
              airingSchedule.mediaId,
              airingSchedule.seasonNumber,
              airingSchedule.episodeNumber
            ],
            set: { airingAt }
          });
      }
    } catch (error) {
      log.warn({ err: error, externalId: show.externalId }, 'serie do tmdb falhou');
    }

    done += 1;
    await onProgress(done, total);
  }

  /** Limpa o que ja passou da janela de retencao. */
  await db
    .delete(airingSchedule)
    .where(lt(airingSchedule.expiresAt, new Date()));

  log.info({ total }, 'airing.sync concluido');
}