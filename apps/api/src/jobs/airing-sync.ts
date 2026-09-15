import { airingSchedule, media } from '@watchlist/db';
import { and, eq, lt } from 'drizzle-orm';
import { getShow } from '../clients/tmdb.js';
import type { JobContext } from './index.js';

/** Quanto tempo um episodio agendado sobrevive depois de ir ao ar.
 *  O calendario olha para tras alguns dias; alem disso e so peso. */
const RETENTION_DAYS = 7;

export async function airingSync({ db, log, onProgress }: JobContext): Promise<void> {
  const airing = await db
    .select({ id: media.id, source: media.source, externalId: media.externalId })
    .from(media)
    /** So TMDB: o Jikan nao tem data por episodio, e a AniList saiu do ar.
     *  Anime agora usa a agenda semanal ao vivo, sem persistencia. */
    .where(and(eq(media.airingStatus, 'airing'), eq(media.source, 'tmdb')));

  if (airing.length === 0) return;

  const shows = airing.filter((row) => row.source === 'tmdb');

  let done = 0;
  const total = shows.length;

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

  /** Limpa o que ja paooou da janela de retencao. */
  await db
    .delete(airingSchedule)
    .where(lt(airingSchedule.expiresAt, new Date()));

  log.info({ total }, 'airing.sync concluido');
}