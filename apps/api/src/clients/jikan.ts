import { env } from '../env.js';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { TokenBucket } from '../lib/token-bucket.js';

const BASE = 'https://api.jikan.moe/v4';

export const jikanBreaker = new CircuitBreaker('jikan');
const bucket = new TokenBucket(env.JIKAN_RATE_LIMIT, env.JIKAN_MIN_INTERVAL_MS);

export class ExternalSourceError extends Error {
  constructor(
    readonly source: 'mal' | 'tmdb',
    message: string
  ) {
    super(message);
    this.name = 'ExternalSourceError';
  }
}

export interface JikanImage {
  jpg?: { image_url?: string; large_image_url?: string };
  webp?: { image_url?: string; large_image_url?: string };
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  images: JikanImage;
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

export interface JikanStaff {
  person: { mal_id: number; name: string; images?: JikanImage };
  positions: string[];
}

export interface JikanCharacter {
  character: { mal_id: number; name: string; images?: JikanImage };
  role: string;
  voice_actors: { person: { mal_id: number; name: string }; language: string }[];
}

export interface JikanSchedule {
  mal_id: number;
  title: string;
  images: JikanImage;
  episodes: number | null;
  score: number | null;
  year: number | null;
  status: string | null;
  members: number | null;
  broadcast?: { day: string | null; time: string | null; timezone: string | null };
  aired?: { from: string | null };
}
interface JikanPagination {
  has_next_page: boolean;
}

async function request<T>(path: string): Promise<T> {
  if (!jikanBreaker.canAttempt()) {
    throw new ExternalSourceError('mal', 'circuito aberto');
  }

  await bucket.acquire();

  try {
    const response = await fetch(`${BASE}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000)
    });

    if (response.status === 429) {
      /** O Jikan nao manda Retry-After. Sessenta segundos e o tamanho da
       *  janela documentada, entao e o palpite seguro. */
      bucket.pauseFor(60);
      throw new ExternalSourceError('mal', '429, aguardando 60s');
    }

    if (response.status === 404) {
      jikanBreaker.recordSuccess();
      throw new ExternalSourceError('mal', 'nao encontrado');
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ExternalSourceError('mal', `HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    jikanBreaker.recordSuccess();
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ExternalSourceError) {
      if (error.message !== 'nao encontrado') jikanBreaker.recordFailure();
      throw error;
    }

    jikanBreaker.recordFailure();
    throw new ExternalSourceError('mal', (error as Error).message);
  }
}

export async function searchAnime(query: string, page: number): Promise<JikanAnime[]> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: '20',
    sfw: 'true',
    order_by: 'members',
    sort: 'desc'
  });

  const data = await request<{ data: JikanAnime[] }>(`/anime?${params.toString()}`);
  return data.data;
}

export async function getAnime(id: number): Promise<JikanAnime> {
  const data = await request<{ data: JikanAnime }>(`/anime/${id}/full`);
  return data.data;
}

export async function getStaff(id: number): Promise<JikanStaff[]> {
  const data = await request<{ data: JikanStaff[] }>(`/anime/${id}/staff`);
  return data.data;
}

export async function getCharacters(id: number): Promise<JikanCharacter[]> {
  const data = await request<{ data: JikanCharacter[] }>(`/anime/${id}/characters`);
  return data.data;
}

export async function getRecommendations(id: number): Promise<JikanAnime[]> {
  const data = await request<{ data: { entry: JikanAnime }[] }>(`/anime/${id}/recommendations`);
  return data.data.map((item) => item.entry);
}

export async function getSeason(
  year: number,
  season: string,
  page: number
): Promise<{ items: JikanSchedule[]; hasNextPage: boolean }> {
  const data = await request<{ data: JikanSchedule[]; pagination: JikanPagination }>(
    `/seasons/${year}/${season}?page=${page}&limit=25&sfw=true`
  );

  return { items: data.data, hasNextPage: data.pagination.has_next_page };
}

/** Agenda semanal por dia, em ingles minusculo: monday, tuesday e assim por
 *  diante. E o unico calendario que o Jikan oferece: nao ha equivalente ao
 *  airingSchedule da AniList com data exata por episodio. */
export async function getSchedule(day: string): Promise<JikanSchedule[]> {
  const data = await request<{ data: JikanSchedule[] }>(`/schedules?filter=${day}&sfw=true&limit=25`);
  return data.data;
}

export const jikanImage = (images: JikanImage | undefined): string | null =>
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