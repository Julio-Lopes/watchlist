import { env } from '../env.js';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { TokenBucket } from '../lib/token-bucket.js';

const ENDPOINT = 'https://graphql.anilist.co';

export const anilistBreaker = new CircuitBreaker('anilist');
const bucket = new TokenBucket(env.ANILIST_RATE_LIMIT, env.ANILIST_MIN_INTERVAL_MS);

export class ExternalSourceError extends Error {
  constructor(
    readonly source: 'anilist' | 'tmdb',
    message: string
  ) {
    super(message);
    this.name = 'ExternalSourceError';
  }
}

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  coverImage { large }
  bannerImage
  description(asHtml: false)
  genres
  seasonYear
  season
  episodes
  duration
  averageScore
  popularity
  status
`;

const SEARCH_QUERY = `
  query Search($search: String!, $page: Int!) {
    Page(page: $page, perPage: 20) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const DETAIL_QUERY = `
  query Detail($id: Int!) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
      relations { edges { relationType } }
      studios { edges { isMain node { id name } } }
      staff(perPage: 12) { edges { role node { id name { full native } image { large } } } }
    }
  }
`;

export interface AnilistMedia {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { large: string | null } | null;
  bannerImage: string | null;
  description: string | null;
  genres: string[] | null;
  seasonYear: number | null;
  season: string | null;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  popularity: number | null;
  status: string | null;
  relations?: { edges: { relationType: string }[] };
  studios?: { edges: { isMain: boolean; node: { id: number; name: string } }[] };
  staff?: {
    edges: {
      role: string;
      node: { id: number; name: { full: string; native: string | null }; image: { large: string | null } | null };
    }[];
  };
}

async function request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!anilistBreaker.canAttempt()) {
    throw new ExternalSourceError('anilist', 'circuito aberto');
  }

  await bucket.acquire();

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10_000)
    });

    if (response.status === 429) {
      /** X-RateLimit-Limit reporta 90 mesmo quando o limite real e menor,
       *  entao o unico sinal confiavel e o Retry-After da propria resposta. */
      const retryAfter = Number(response.headers.get('retry-after') ?? '60');
      bucket.pauseFor(Number.isFinite(retryAfter) ? retryAfter : 60);
      throw new ExternalSourceError('anilist', `429, aguardando ${retryAfter}s`);
    }

    if (!response.ok) {
      throw new ExternalSourceError('anilist', `HTTP ${response.status}`);
    }

    const body = (await response.json()) as { data?: T; errors?: { message: string }[] };

    if (body.errors?.length) {
      throw new ExternalSourceError('anilist', body.errors[0]?.message ?? 'erro graphql');
    }

    if (!body.data) throw new ExternalSourceError('anilist', 'resposta sem data');

    anilistBreaker.recordSuccess();
    return body.data;
  } catch (error) {
    anilistBreaker.recordFailure();
    if (error instanceof ExternalSourceError) throw error;
    throw new ExternalSourceError('anilist', (error as Error).message);
  }
}

export async function searchAnime(search: string, page: number): Promise<AnilistMedia[]> {
  const data = await request<{ Page: { media: AnilistMedia[] } }>(SEARCH_QUERY, { search, page });
  return data.Page.media;
}

export async function getAnime(id: number): Promise<AnilistMedia | null> {
  const data = await request<{ Media: AnilistMedia | null }>(DETAIL_QUERY, { id });
  return data.Media;
}