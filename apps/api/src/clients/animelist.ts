import { env } from '../env.js';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { TokenBucket } from '../lib/token-bucket.js';

export const animeBreaker = new CircuitBreaker('animelist');
const bucket = new TokenBucket(env.ANIME_API_RATE_LIMIT, env.ANIME_API_MIN_INTERVAL_MS);

export class ExternalSourceError extends Error {
  constructor(
    readonly source: 'mal' | 'tmdb',
    message: string
  ) {
    super(message);
    this.name = 'ExternalSourceError';
  }
}

export interface AnimeImage {
  jpg?: { image_url?: string; large_image_url?: string };
  webp?: { image_url?: string; large_image_url?: string };
}

export interface AnimeDetail {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  images: AnimeImage;
  type: string | null;
  episodes: number | null;
  duration: string | null;
  status: string | null;
  airing: boolean;
  score: number | null;
  members: number | null;
  year: number | null;
  season: string | null;
  genres: { name: string }[];
  themes?: { name: string }[];
  studios?: { mal_id: number; name: string }[];
  producers?: { mal_id: number; name: string }[];
  broadcast?: { day: string | null; time: string | null; timezone: string | null };
}

export interface AnimeStaff {
  person: { mal_id: number; name: string; images?: AnimeImage };
  positions: string[];
}

export interface AnimeCharacter {
  character: { mal_id: number; name: string; images?: AnimeImage };
  role: string;
  voice_actors: { person: { mal_id: number; name: string }; language: string }[];
}

export interface AnimeListing {
  mal_id: number;
  title: string;
  images: AnimeImage;
  episodes: number | null;
  score: number | null;
  year: number | null;
  status: string | null;
  members: number | null;
  broadcast?: { day: string | null; time: string | null; timezone: string | null };
  aired?: { from: string | null };
}

interface Pagination {
  has_next_page: boolean;
}

async function request<T>(path: string): Promise<T> {
  if (!animeBreaker.canAttempt()) {
    throw new ExternalSourceError('mal', 'circuito aberto');
  }

  await bucket.acquire();

  try {
    const response = await fetch(`${env.ANIME_API_URL}${path}`, {
      headers: {
        accept: 'application/json',
        /** Token proprio, obrigatorio em todos os endpoints. */
        'x-api-token': env.ANIME_API_TOKEN
      },
      signal: AbortSignal.timeout(15_000)
    });

    if (response.status === 401 || response.status === 403) {
      /** Nao conta como falha de fonte: token errado nao melhora com retry,
       *  e abrir o circuito esconderia o erro de configuracao. */
      throw new ExternalSourceError('mal', `autenticacao recusada: HTTP ${response.status}`);
    }

    if (response.status === 429) {
      bucket.pauseFor(Number(response.headers.get('retry-after') ?? '30'));
      throw new ExternalSourceError('mal', '429, aguardando');
    }

    if (response.status === 404) {
      animeBreaker.recordSuccess();
      throw new ExternalSourceError('mal', 'nao encontrado');
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ExternalSourceError('mal', `HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    animeBreaker.recordSuccess();
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ExternalSourceError) {
      const soft = error.message === 'nao encontrado' || error.message.startsWith('autenticacao');
      if (!soft) animeBreaker.recordFailure();
      throw error;
    }

    animeBreaker.recordFailure();
    throw new ExternalSourceError('mal', (error as Error).message);
  }
}

export async function searchAnime(query: string, page: number): Promise<AnimeDetail[]> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: '20',
    sfw: 'true',
    order_by: 'members',
    sort: 'desc'
  });

  const data = await request<{ data: AnimeDetail[] }>(`/anime?${params.toString()}`);
  return data.data;
}

export async function getAnime(id: number): Promise<AnimeDetail> {
  const data = await request<{ data: AnimeDetail }>(`/anime/${id}`);
  return data.data;
}

export async function getStaff(id: number): Promise<AnimeStaff[]> {
  const data = await request<{ data: AnimeStaff[] }>(`/anime/${id}/staff`);
  return data.data;
}

export async function getCharacters(id: number): Promise<AnimeCharacter[]> {
  const data = await request<{ data: AnimeCharacter[] }>(`/anime/${id}/characters`);
  return data.data;
}

export async function getRecommendations(id: number): Promise<AnimeDetail[]> {
  const data = await request<{ data: { entry: AnimeDetail }[] }>(`/anime/${id}/recommendations`);
  return data.data.map((item) => item.entry);
}

export async function getSeason(
  year: number,
  season: string,
  page: number
): Promise<{ items: AnimeListing[]; hasNextPage: boolean }> {
  const data = await request<{ data: AnimeListing[]; pagination: Pagination }>(
    `/seasons/${year}/${season}?page=${page}&limit=25&sfw=true`
  );

  return { items: data.data, hasNextPage: data.pagination.has_next_page };
}

/** Agenda semanal por dia, em ingles minusculo: monday, tuesday e assim por
 *  diante. */
export async function getSchedule(day: string): Promise<AnimeListing[]> {
  const data = await request<{ data: AnimeListing[] }>(
    `/schedules?filter=${day}&sfw=true&limit=25`
  );
  return data.data;
}

export const animeImage = (images: AnimeImage | undefined): string | null =>
  images?.webp?.large_image_url ?? images?.jpg?.large_image_url ?? images?.jpg?.image_url ?? null;

/** "24 min per ep" ou "1 hr 52 min". Sem isso, episode_duration ficaria nulo
 *  e o tempo assistido pararia de somar para anime. */
export function parseDuration(duration: string | null): number | null {
  if (!duration) return null;

  const hours = /(\d+)\s*hr/.exec(duration);
  const minutes = /(\d+)\s*min/.exec(duration);

  const total = (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  return total > 0 ? total : null;
}