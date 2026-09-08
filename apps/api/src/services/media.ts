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
import type { AnilistMedia } from '../clients/anilist.js';
import { getAnime, searchAnime } from '../clients/anilist.js';
import type { TmdbItem } from '../clients/tmdb.js';
import { backdropUrl, getMovie, getShow, posterUrl, searchTmdb } from '../clients/tmdb.js';
import { env } from '../env.js';

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

const ANILIST_STATUS: Record<string, AiringStatus> = {
  RELEASING: 'airing',
  FINISHED: 'finished',
  NOT_YET_RELEASED: 'not_yet_released',
  CANCELLED: 'cancelled',
  HIATUS: 'airing'
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

/** Papeis vem em texto livre nas duas fontes. O que nao mapeia e descartado:
 *  guardar credito sem papel util so ocupa espaco. */
const ANILIST_ROLES: [RegExp, CreditRole][] = [
  [/^director$/i, 'director'],
  [/series composition|script|screenplay/i, 'writer'],
  [/character design/i, 'character_design'],
  [/^music$|composer/i, 'composer'],
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

const mapAnilistRole = (role: string): CreditRole | null =>
  ANILIST_ROLES.find(([pattern]) => pattern.test(role))?.[1] ?? null;

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

function fromAnilist(item: AnilistMedia): Normalized {
  const credits: NormalizedCredit[] = [];

  for (const edge of item.studios?.edges ?? []) {
    credits.push({
      externalId: edge.node.id,
      kind: 'studio',
      name: edge.node.name,
      imageUrl: null,
      role: 'studio',
      isMain: edge.isMain
    });
  }

  for (const edge of item.staff?.edges ?? []) {
    const role = mapAnilistRole(edge.role);
    if (!role) continue;

    credits.push({
      externalId: edge.node.id,
      kind: 'person',
      name: edge.node.name.full,
      imageUrl: edge.node.image?.large ?? null,
      role,
      isMain: false
    });
  }

  return {
    row: {
      source: 'anilist',
      externalId: item.id,
      /** Gravado agora porque a AniList entrega idMal na mesma query.
       *  Descobrir depois custaria dias contra o rate limit. */
      malId: item.idMal,
      mediaType: 'anime',
      title: item.title.english ?? item.title.romaji ?? item.title.native ?? 'Sem titulo',
      titleOriginal: item.title.native,
      synopsis: firstParagraph(item.description),
      coverImage: item.coverImage?.large ?? null,
      bannerImage: item.bannerImage,
      genres: item.genres ?? [],
      year: item.seasonYear,
      season: (item.season?.toLowerCase() as Season | undefined) ?? null,
      totalEpisodes: item.episodes,
      episodeDuration: item.duration,
      /** averageScore ja vem em 0-100 na AniList. */
      avgScore: item.averageScore,
      popularity: item.popularity,
      airingStatus: item.status ? (ANILIST_STATUS[item.status] ?? null) : null,
      hasSequel: (item.relations?.edges ?? []).some((edge) => edge.relationType === 'SEQUEL'),
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
        set: { ...updatable, refreshedAt: new Date() }
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
  source: 'anilist' | 'tmdb',
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
  degraded: ('anilist' | 'tmdb')[];
}

export async function searchMedia(
  query: string,
  page: number,
  type?: MediaType
): Promise<SearchOutcome> {
  const wantsAnime = !type || type === 'anime';
  const wantsTmdb = !type || type === 'movie' || type === 'show';

  const tmdbKind = type === 'movie' ? 'movie' : type === 'show' ? 'tv' : undefined;

  const [anilist, tmdb] = await Promise.allSettled([
    wantsAnime ? searchAnime(query, page) : Promise.resolve([]),
    wantsTmdb ? searchTmdb(query, page, tmdbKind) : Promise.resolve([])
  ]);

  const results: MediaSummary[] = [];
  const degraded: ('anilist' | 'tmdb')[] = [];

  if (anilist.status === 'fulfilled') {
    for (const item of anilist.value) {
      results.push({
        source: 'anilist',
        mediaType: 'anime',
        externalId: item.id,
        title: item.title.english ?? item.title.romaji ?? item.title.native ?? 'Sem titulo',
        coverImage: item.coverImage?.large ?? null,
        year: item.seasonYear,
        avgScore: item.averageScore,
        totalEpisodes: item.episodes
      });
    }
  } else if (wantsAnime) {
    degraded.push('anilist');
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

  results.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

  /** Titulo normalizado identico em fontes diferentes significa a mesma obra
   *  catalogada duas vezes. A AniList tem metadado de anime que o TMDB nao
   *  tem, entao a versao do TMDB e removida, nao rebaixada. */
  const normalize = (title: string): string =>
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const anilistTitles = new Set(
    results.filter((item) => item.source === 'anilist').map((item) => normalize(item.title))
  );

  const deduped = results.filter(
    (item) => item.source === 'anilist' || !anilistTitles.has(normalize(item.title))
  );

  deduped.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

  return { results: deduped, degraded };
}

export async function getMediaDetail(
  db: Database,
  source: 'anilist' | 'tmdb',
  mediaType: MediaType,
  externalId: number
): Promise<MediaDetail | null> {
  const local = await readLocal(db, source, mediaType, externalId);
  const ttlMs = env.MEDIA_TTL_HOURS * 60 * 60 * 1000;
  const fresh = local && Date.now() - local.row.refreshedAt.getTime() < ttlMs;

  if (fresh) return toDetail(local.row, local.credits, false);

  try {
    let normalized: Normalized | null = null;

    if (source === 'anilist') {
      const item = await getAnime(externalId);
      normalized = item ? fromAnilist(item) : null;
    } else if (mediaType === 'movie') {
      normalized = fromTmdb(await getMovie(externalId), 'movie');
    } else {
      normalized = fromTmdb(await getShow(externalId), 'show');
    }

    if (!normalized) return local ? toDetail(local.row, local.credits, true) : null;

    await persist(db, normalized);

    const saved = await readLocal(db, source, mediaType, externalId);
    return saved ? toDetail(saved.row, saved.credits, false) : null;
  } catch {
    /** Fonte fora do ar: o produto segue com o que ja esta em media. */
    return local ? toDetail(local.row, local.credits, true) : null;
  }
}