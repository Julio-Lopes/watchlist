import { type Database, media } from '@watchlist/db';
import type { MediaType } from '@watchlist/shared';
import { inArray } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { getMediaDetail, searchMedia } from '../services/media.js';

/** Catalogo buscado por nome, nao por id fixo. Id externo decorado envelhece
 *  e falha em silencio; a busca se corrige sozinha. */
const ANIME = [
  'Frieren Beyond Journeys End', 'Fullmetal Alchemist Brotherhood', 'Steins Gate',
  'Attack on Titan', 'Death Note', 'Hunter x Hunter 2011', 'Vinland Saga',
  'Mob Psycho 100', 'Cowboy Bebop', 'Monster', 'Made in Abyss', 'Odd Taxi',
  'Jujutsu Kaisen', 'Chainsaw Man', 'Spy x Family', 'Bocchi the Rock',
  'Cyberpunk Edgerunners', 'Violet Evergarden', 'A Silent Voice', 'Your Name',
  'Perfect Blue', 'Ping Pong the Animation', 'Kaiju No 8', 'Dandadan'
];

const MOVIES = [
  'Parasite', 'Whiplash', 'Blade Runner 2049', 'Arrival', 'Everything Everywhere All at Once',
  'The Grand Budapest Hotel', 'Mad Max Fury Road', 'Spider-Man Into the Spider-Verse',
  'Dune', 'Past Lives', 'Cidade de Deus', 'Bacurau'
];

const SHOWS = [
  'Breaking Bad', 'Severance', 'The Bear', 'Chernobyl', 'Dark',
  'Better Call Saul', 'Arcane', 'The Leftovers', 'Fleabag'
];

interface Target {
  title: string;
  type: MediaType;
}

const TARGETS: Target[] = [
  ...ANIME.map((title) => ({ title, type: 'anime' as const })),
  ...MOVIES.map((title) => ({ title, type: 'movie' as const })),
  ...SHOWS.map((title) => ({ title, type: 'show' as const }))
];

export interface CatalogEntry {
  id: string;
  mediaType: MediaType;
  totalEpisodes: number | null;
  genres: string[];
}

/**
 * Busca cada titulo e grava o detalhe. Na primeira execucao isso leva alguns
 * minutos por causa do rate limit da fonte externa; nas seguintes, o TTL de 24 h em
 * media.refreshed_at evita quase toda chamada externa.
 */
export async function seedCatalog(
  db: Database,
  log: FastifyBaseLogger
): Promise<CatalogEntry[]> {
  const ids: string[] = [];

  for (const [index, target] of TARGETS.entries()) {
    try {
      const { results } = await searchMedia(target.title, 1, target.type);
      const best = results.find((item) => item.mediaType === target.type);

      if (!best) {
        log.warn({ title: target.title }, 'sem resultado na busca');
        continue;
      }

      const detail = await getMediaDetail(db, best.source, best.mediaType, best.externalId);
      if (detail) ids.push(detail.id);

      if ((index + 1) % 10 === 0) {
        log.info({ feitos: index + 1, total: TARGETS.length }, 'catalogo');
      }
    } catch (error) {
      log.warn({ err: error, title: target.title }, 'titulo falhou');
    }
  }

  const rows = await db
    .select({
      id: media.id,
      mediaType: media.mediaType,
      totalEpisodes: media.totalEpisodes,
      genres: media.genres
    })
    .from(media)
    .where(inArray(media.id, ids));

  return rows.map((row) => ({
    id: row.id,
    mediaType: row.mediaType,
    totalEpisodes: row.totalEpisodes,
    genres: row.genres ?? []
  }));
}