import { type Database, media, mediaCredits, people } from '@watchlist/db';
import type {
  AiringStatus,
  CreditRole,
  MediaCredit,
  MediaDetail,
  MediaSummary,
  MediaType,
  Season
} from '@watchlist/shared';
import { and, eq } from 'drizzle-orm';
import type { AnimeDetail, AnimeStaff } from '../clients/animelist.js';
import {
  getAnime,
  getCharacters,
  getRecommendations as getAnimeRecommendations,
  getStaff,
  animeImage,
  parseDuration,
  searchAnime
} from '../clients/animelist.js';
import type { TmdbItem } from '../clients/tmdb.js';
import {
  backdropUrl,
  getMovie,
  getRecommendations as getTmdbRecommendations,
  getShow,
  posterUrl,
  searchTmdb
} from '../clients/tmdb.js';
import { env } from '../env.js';
import { TtlCache } from '../lib/cache.js';

/** [SLEEP] Recomendacoes nao sao persistidas por decisao da Etapa 4, mas
 *  cachear em memoria faz a secao sobreviver a uma queda da fonte. */
const recommendationsCache = new TtlCache<MediaSummary[]>(6 * 60 * 60 * 1000, 200);

/** Guardar a sinopse inteira gastaria a cota do Neon com texto que o modo
 *  sem spoiler trunca de qualquer jeito. Corta na escrita, nao na leitura. */
function firstParagraph(text: string | null | undefined): string | null {
  if (!text) return null;

  const plain = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  const paragraph = plain.split(/\n\s*\n/)[0]?.trim() ?? '';
  if (!paragraph) return null;

  return paragraph.length > 700 ? `${paragraph.slice(0, 697)}...` : paragraph;
}

const MAL_STATUS: Record<string, AiringStatus> = {
  'Currently Airing': 'airing',
  'Finished Airing': 'finished',
  'Not yet aired': 'not_yet_released'
};

const TMDB_STATUS: Record<string, AiringStatus> = {
  'Returning Series': 'airing',
  Ended: 'finished',
  Canceled: 'cancelled',
  Released: 'finished',
  Planned: 'not_yet_released',
  'In Production': 'not_yet_released',
  'Post Production': 'not_yet_released'
};

/** Os cargos do MAL vem em texto livre e frequentemente combinados numa
 *  string so, como "Director, Script". O que nao mapeia e descartado:
 *  credito sem papel util so ocupa espaco. */
const MAL_POSITIONS: [RegExp, CreditRole][] = [
  [/\bdirector\b/i, 'director'],
  [/series composition|script|screenplay/i, 'writer'],
  [/character design/i, 'character_design'],
  [/\bmusic\b|sound director/i, 'composer'],
  [/original creator|original story/i, 'original_creator'],
  [/producer/i, 'producer']
];

const TMDB_JOBS: Record<string, CreditRole> = {
  Director: 'director',
  Screenplay: 'writer',
  Writer: 'writer',
  'Original Music Composer': 'composer',
  Producer: 'producer'
};

interface NormalizedCredit {
  externalId: number;
  kind: 'person' | 'studio';
  name: string;
  imageUrl: string | null;
  role: CreditRole;
  isMain: boolean;
}

interface Normalized {
  row: typeof media.$inferInsert;
  credits: NormalizedCredit[];
}

interface AnimeSourceDetail {
  anime: AnimeDetail;
  staff: AnimeStaff[];
  cast: { malId: number; name: string; image: string | null; isMain: boolean }[];
}

function fromAnimeSource(detail: AnimeSourceDetail): Normalized {
  const { anime } = detail;
  const credits: NormalizedCredit[] = [];

  for (const studio of anime.studios ?? []) {
    credits.push({
      externalId: studio.mal_id,
      kind: 'studio',
      name: studio.name,
      imageUrl: null,
      role: 'studio',
      isMain: true
    });
  }

  for (const member of detail.staff) {
    /** Uma pessoa pode ter varios cargos; grava um credito por papel
     *  reconhecido, e o PK composto da tabela impede duplicata. */
    for (const position of member.positions) {
      const role = MAL_POSITIONS.find(([pattern]) => pattern.test(position))?.[1];
      if (!role) continue;

      credits.push({
        externalId: member.person.mal_id,
        kind: 'person',
        name: member.person.name,
        imageUrl: animeImage(member.person.images),
        role,
        isMain: false
      });
    }
  }

  for (const person of detail.cast) {
    credits.push({
      externalId: person.malId,
      kind: 'person',
      name: person.name,
      imageUrl: person.image,
      role: 'cast',
      isMain: person.isMain
    });
  }

  /** Generos e temas no mesmo balde: o MAL separa "Action" de "Isekai", mas
   *  para as estatisticas os dois respondem a mesma pergunta. */
  const genres = [
    ...(anime.genres ?? []).map((genre) => genre.name),
    ...(anime.themes ?? []).map((theme) => theme.name)
  ];

  return {
    row: {
      source: 'mal',
      externalId: anime.mal_id,
      malId: anime.mal_id,
      mediaType: 'anime',
      title: anime.title_english ?? anime.title,
      titleOriginal: anime.title_japanese,
      synopsis: firstParagraph(anime.synopsis),
      coverImage: animeImage(anime.images),
      /** A fonte de anime nao tem banner. O campo fica nulo e as telas que usam banner
       *  degradam para o gradiente, como ja fazem quando nao ha imagem. */
      bannerImage: null,
      genres,
      year: anime.year,
      season: (anime.season?.toLowerCase() as Season | undefined) ?? null,
      totalEpisodes: anime.episodes,
      episodeDuration: parseDuration(anime.duration),
      /** O MAL entrega score de 0 a 10 com decimal; o banco guarda 0-100. */
      avgScore: anime.score ? Math.round(anime.score * 10) : null,
      popularity: anime.members,
      airingStatus: anime.status ? (MAL_STATUS[anime.status] ?? null) : null,
      /** A fonte tem /relations, mas seria uma chamada a mais por detalhe.
       *  Revisitar quando o modo sem spoiler estrito for implementado. */
      hasSequel: false,
      refreshedAt: new Date()
    },
    credits
  };
}

function fromTmdb(item: TmdbItem, mediaType: 'movie' | 'show'): Normalized {
  const credits: NormalizedCredit[] = [];

  for (const company of item.production_companies ?? []) {
    credits.push({
      externalId: company.id,
      kind: 'studio',
      name: company.name,
      imageUrl: posterUrl(company.logo_path),
      role: 'studio',
      isMain: false
    });
  }

  for (const member of item.credits?.crew ?? []) {
    const role = TMDB_JOBS[member.job];
    if (!role) continue;

    credits.push({
      externalId: member.id,
      kind: 'person',
      name: member.name,
      imageUrl: posterUrl(member.profile_path),
      role,
      isMain: false
    });
  }

  for (const member of (item.credits?.cast ?? []).slice(0, 8)) {
    credits.push({
      externalId: member.id,
      kind: 'person',
      name: member.name,
      imageUrl: posterUrl(member.profile_path),
      role: 'cast',
      isMain: member.order < 3
    });
  }

  const date = item.release_date ?? item.first_air_date;

  return {
    row: {
      source: 'tmdb',
      externalId: item.id,
      malId: null,
      imdbId: item.imdb_id ?? item.external_ids?.imdb_id ?? null,
      mediaType,
      title: item.title ?? item.name ?? 'Sem titulo',
      titleOriginal: item.original_title ?? item.original_name ?? null,
      synopsis: firstParagraph(item.overview),
      coverImage: posterUrl(item.poster_path),
      bannerImage: backdropUrl(item.backdrop_path),
      genres: (item.genres ?? []).map((genre) => genre.name),
      year: date ? Number(date.slice(0, 4)) : null,
      season: null,
      totalEpisodes: item.number_of_episodes ?? (mediaType === 'movie' ? 1 : null),
      episodeDuration: item.runtime ?? item.episode_run_time?.[0] ?? null,
      /** TMDB entrega 0-10 com decimal; o banco guarda 0-100 inteiro. */
      avgScore: item.vote_average ? Math.round(item.vote_average * 10) : null,
      popularity: item.popularity ? Math.round(item.popularity) : null,
      airingStatus: item.status ? (TMDB_STATUS[item.status] ?? null) : null,
      hasSequel: false,
      refreshedAt: new Date()
    },
    credits
  };
}

/** Grava media, people e media_credits numa transacao. Os creditos sao
 *  recriados: a fonte e a verdade, e credito orfao apos refresh e ruido. */
async function persist(db: Database, normalized: Normalized): Promise<string> {
  return db.transaction(async (tx) => {
    const { refreshedAt: _ignored, ...updatable } = normalized.row;

    const [row] = await tx
      .insert(media)
      .values(normalized.row)
      .onConflictDoUpdate({
        target: [media.source, media.mediaType, media.externalId],
        set: { ...updatable, refreshedAt: normalized.row.refreshedAt ?? new Date() }
      })
      .returning({ id: media.id });

    if (!row) throw new Error('upsert de media nao retornou linha');

    await tx.delete(mediaCredits).where(eq(mediaCredits.mediaId, row.id));

    for (const credit of normalized.credits) {
      const [person] = await tx
        .insert(people)
        .values({
          source: normalized.row.source,
          externalId: credit.externalId,
          kind: credit.kind,
          name: credit.name,
          imageUrl: credit.imageUrl
        })
        .onConflictDoUpdate({
          target: [people.source, people.externalId, people.kind],
          set: { name: credit.name, imageUrl: credit.imageUrl, refreshedAt: new Date() }
        })
        .returning({ id: people.id });

      if (!person) continue;

      await tx
        .insert(mediaCredits)
        .values({
          mediaId: row.id,
          personId: person.id,
          role: credit.role,
          isMain: credit.isMain
        })
        .onConflictDoNothing();
    }

    return row.id;
  });
}

async function readLocal(
  db: Database,
  source: 'anilist' | 'tmdb' | 'mal',
  mediaType: MediaType,
  externalId: number
) {
  const [row] = await db
    .select()
    .from(media)
    .where(
      and(
        eq(media.source, source),
        eq(media.mediaType, mediaType),
        eq(media.externalId, externalId)
      )
    )
    .limit(1);

  if (!row) return null;

  const credits = await db
    .select({
      role: mediaCredits.role,
      isMain: mediaCredits.isMain,
      name: people.name,
      imageUrl: people.imageUrl
    })
    .from(mediaCredits)
    .innerJoin(people, eq(people.id, mediaCredits.personId))
    .where(eq(mediaCredits.mediaId, row.id));

  return { row, credits: credits satisfies MediaCredit[] };
}

const toDetail = (
  row: typeof media.$inferSelect,
  credits: MediaCredit[],
  stale: boolean
): MediaDetail => ({
  id: row.id,
  source: row.source,
  mediaType: row.mediaType,
  externalId: row.externalId,
  malId: row.malId,
  imdbId: row.imdbId,
  title: row.title,
  titleOriginal: row.titleOriginal,
  synopsis: row.synopsis,
  coverImage: row.coverImage,
  bannerImage: row.bannerImage,
  genres: row.genres ?? [],
  year: row.year,
  season: row.season,
  totalEpisodes: row.totalEpisodes,
  episodeDuration: row.episodeDuration,
  avgScore: row.avgScore,
  popularity: row.popularity,
  airingStatus: row.airingStatus,
  hasSequel: row.hasSequel,
  credits,
  stale
});

export interface SearchOutcome {
  results: MediaSummary[];
  degraded: ('mal' | 'tmdb')[];
}

export async function searchMedia(
  query: string,
  page: number,
  type?: MediaType
): Promise<SearchOutcome> {
  const wantsAnime = !type || type === 'anime';
  const wantsTmdb = !type || type === 'movie' || type === 'show';

  const tmdbKind = type === 'movie' ? 'movie' : type === 'show' ? 'tv' : undefined;

  const [anime, tmdb] = await Promise.allSettled([
    wantsAnime ? searchAnime(query, page) : Promise.resolve([]),
    wantsTmdb ? searchTmdb(query, page, tmdbKind) : Promise.resolve([])
  ]);

  const results: MediaSummary[] = [];
  const degraded: ('mal' | 'tmdb')[] = [];

  if (anime.status === 'fulfilled') {
    for (const item of anime.value) {
      results.push({
        source: 'mal',
        mediaType: 'anime',
        externalId: item.mal_id,
        title: item.title_english ?? item.title,
        coverImage: animeImage(item.images),
        year: item.year,
        avgScore: item.score ? Math.round(item.score * 10) : null,
        totalEpisodes: item.episodes
      });
    }
  } else if (wantsAnime) {
    degraded.push('mal');
  }

  if (tmdb.status === 'fulfilled') {
    for (const item of tmdb.value) {
      const date = item.release_date ?? item.first_air_date;
      results.push({
        source: 'tmdb',
        mediaType: item.media_type === 'tv' ? 'show' : 'movie',
        externalId: item.id,
        title: item.title ?? item.name ?? 'Sem titulo',
        coverImage: posterUrl(item.poster_path),
        year: date ? Number(date.slice(0, 4)) : null,
        avgScore: item.vote_average ? Math.round(item.vote_average * 10) : null,
        totalEpisodes: item.number_of_episodes ?? null
      });
    }
  } else if (wantsTmdb) {
    degraded.push('tmdb');
  }

  /** Titulo normalizado identico em fontes diferentes significa a mesma obra
   *  catalogada duas vezes. O MAL tem metadado de anime que o TMDB nao tem,
   *  entao a versao do TMDB e removida, nao rebaixada. */
  const normalize = (title: string): string =>
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const animeTitles = new Set(
    results.filter((item) => item.source === 'mal').map((item) => normalize(item.title))
  );

  const deduped = results.filter(
    (item) => item.source === 'mal' || !animeTitles.has(normalize(item.title))
  );

  deduped.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

  return { results: deduped, degraded };
}

/** Elenco: so dubladores japoneses dos personagens principais e
 *  coadjuvantes, no maximo oito. */
async function animeCast(externalId: number) {
  const characters = await getCharacters(externalId).catch(() => []);

  return characters
    .filter((entry) => entry.role === 'Main' || entry.role === 'Supporting')
    .slice(0, 8)
    .flatMap((entry) => {
      const japanese = entry.voice_actors.find((actor) => actor.language === 'Japanese');
      if (!japanese) return [];

      return [
        {
          malId: japanese.person.mal_id,
          name: japanese.person.name,
          image: null as string | null,
          isMain: entry.role === 'Main'
        }
      ];
    });
}

export async function getMediaDetail(
  db: Database,
  source: 'anilist' | 'tmdb' | 'mal',
  mediaType: MediaType,
  externalId: number
): Promise<MediaDetail | null> {
  const local = await readLocal(db, source, mediaType, externalId);
  const ttlMs = env.MEDIA_TTL_HOURS * 60 * 60 * 1000;
  const fresh = local && Date.now() - local.row.refreshedAt.getTime() < ttlMs;

  if (fresh) return toDetail(local.row, local.credits, false);

  /** Fonte legada: a API da AniList saiu do ar em set/2026. O que ja esta
   *  salvo continua servindo, marcado como desatualizado. */
  if (source === 'anilist') {
    return local ? toDetail(local.row, local.credits, true) : null;
  }

  try {
    let normalized: Normalized | null = null;

    if (source === 'mal') {
      const anime = await getAnime(externalId);

      const [staff, cast] = await Promise.all([
        getStaff(externalId).catch(() => []),
        animeCast(externalId)
      ]);

      normalized = fromAnimeSource({ anime, staff, cast });

      /** Busca parcial nao conta como atualizada: sem isso, uma queda de
       *  staff e elenco travaria a obra sem creditos pelas 24 h do TTL,
       *  mesmo com a fonte ja de volta. */
      if (staff.length === 0 && cast.length === 0) {
        normalized.row.refreshedAt = new Date(0);
      }
    } else if (mediaType === 'movie') {
      normalized = fromTmdb(await getMovie(externalId), 'movie');
    } else {
      normalized = fromTmdb(await getShow(externalId), 'show');
    }

    if (!normalized) return local ? toDetail(local.row, local.credits, true) : null;

    await persist(db, normalized);

    const saved = await readLocal(db, source, mediaType, externalId);
    return saved ? toDetail(saved.row, saved.credits, false) : null;
  } catch (error) {
    /** Fonte fora do ar: o produto segue com o que ja esta em media. O log
     *  existe porque "stale" na tela nao diz qual chamada falhou. */
    console.error('getMediaDetail falhou', source, externalId, error);
    return local ? toDetail(local.row, local.credits, true) : null;
  }
}

/**
 * Rota propria porque as recomendacoes nao sao persistidas e nao podem furar
 * o TTL do detalhe: buscar junto faria toda visita bater na fonte externa,
 * anulando o cache de 24 h em media.refreshed_at.
 */
export async function getRecommendationsFor(
  source: 'anilist' | 'tmdb' | 'mal',
  mediaType: MediaType,
  externalId: number
): Promise<MediaSummary[]> {
  /** A fonte legada nao tem como buscar nada. */
  if (source === 'anilist') return [];

  const cacheKey = `${source}-${mediaType}-${externalId}`;
  const cached = recommendationsCache.get(cacheKey);
  if (cached) return cached;

  try {
    if (source === 'mal') {
      const entries = await getAnimeRecommendations(externalId);

      const items = entries.slice(0, 12).map((item) => ({
        source: 'mal' as const,
        mediaType: 'anime' as const,
        externalId: item.mal_id,
        title: item.title_english ?? item.title,
        coverImage: animeImage(item.images),
        year: item.year ?? null,
        avgScore: item.score ? Math.round(item.score * 10) : null,
        totalEpisodes: item.episodes ?? null
      }));

      if (items.length > 0) recommendationsCache.set(cacheKey, items);
      return items;
    }

    const kind = mediaType === 'movie' ? 'movie' : 'tv';
    const related = await getTmdbRecommendations(externalId, kind);

    const items = related.results.slice(0, 12).map((item) => {
      const date = item.release_date ?? item.first_air_date;

      return {
        source: 'tmdb' as const,
        mediaType: mediaType === 'movie' ? ('movie' as const) : ('show' as const),
        externalId: item.id,
        title: item.title ?? item.name ?? 'Sem titulo',
        coverImage: posterUrl(item.poster_path),
        year: date ? Number(date.slice(0, 4)) : null,
        avgScore: item.vote_average ? Math.round(item.vote_average * 10) : null,
        totalEpisodes: item.number_of_episodes ?? null
      };
    });

    if (items.length > 0) recommendationsCache.set(cacheKey, items);
    return items;
  } catch {
    /** Fonte fora do ar: a secao some, e o resto da pagina segue. */
    return [];
  }
}