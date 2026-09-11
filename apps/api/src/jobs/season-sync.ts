import { media } from '@watchlist/db';
import { getSeason, jikanImage } from '../clients/jikan.js';
import { currentSeason, nextSeason, weekdayFromBroadcast } from '../services/calendar.js';
import type { JobContext } from './index.js';

/** Mesmo mapa do fromJikan: o /seasons devolve status no mesmo formato do
 *  detalhe. Duplicar aqui evita exportar o mapa so para um job. */
const MAL_STATUS: Record<string, 'airing' | 'finished' | 'not_yet_released'> = {
  'Currently Airing': 'airing',
  'Finished Airing': 'finished',
  'Not yet aired': 'not_yet_released'
};

/**
 * Persiste a temporada corrente e a proxima em media. Contraria a decisao de
 * nao gravar catalogo que ninguem abriu, e a troca e deliberada: com o
 * MyAnimeList caindo, o calendario ficava vazio e o produto parecia morto.
 * Sao cerca de cem obras por execucao, e temporada passada continua ao vivo.
 */
export async function seasonSync({ db, log, onProgress }: JobContext): Promise<void> {
  const targets = [currentSeason(), nextSeason()];
  let done = 0;

  for (const target of targets) {
    /** Duas paginas por temporada: as 50 mais populares cobrem o que as
     *  pessoas procuram, e ir alem gastaria rate limit com obscuridades. */
    for (const page of [1, 2]) {
      try {
        const { items } = await getSeason(target.year, target.season, page);

        for (const row of items) {
          await db
            .insert(media)
            .values({
              source: 'mal',
              externalId: row.mal_id,
              malId: row.mal_id,
              mediaType: 'anime',
              title: row.title,
              coverImage: jikanImage(row.images),
              year: row.year ?? target.year,
              season: target.season,
              totalEpisodes: row.episodes,
              avgScore: row.score ? Math.round(row.score * 10) : null,
              popularity: row.members,
              airingStatus: row.status ? (MAL_STATUS[row.status] ?? null) : null,
              airingWeekday: weekdayFromBroadcast(row.broadcast?.day),
              airingTime: row.broadcast?.time ?? null
            })
            .onConflictDoUpdate({
              target: [media.source, media.mediaType, media.externalId],
              /** Nao toca em synopsis, generos nem creditos: quem abriu o
               *  detalhe tem dado mais rico que a listagem de temporada, e
               *  sobrescrever seria regressao. */
              set: {
                title: row.title,
                coverImage: jikanImage(row.images),
                season: target.season,
                year: row.year ?? target.year,
                totalEpisodes: row.episodes,
                avgScore: row.score ? Math.round(row.score * 10) : null,
                popularity: row.members,
                airingStatus: row.status ? (MAL_STATUS[row.status] ?? null) : null,
                airingWeekday: weekdayFromBroadcast(row.broadcast?.day),
                airingTime: row.broadcast?.time ?? null
              }
            });
        }

        done += items.length;
        await onProgress(done, 100);
      } catch (error) {
        /** Fonte fora: o que ja esta no banco continua servindo, e amanha
         *  tenta de novo. */
        log.warn({ err: error, ...target, page }, 'temporada falhou');
      }
    }
  }

  log.info({ done }, 'season.sync concluido');
}