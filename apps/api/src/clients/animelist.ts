import { env } from '../env.js';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { TokenBucket } from '../lib/token-bucket.js';

export const animeBreaker = new CircuitBreaker('animelist');

/** A API propria nao impoe rate limit HTTP, mas mantem o limitador interno
 *  contra os provedores. O balde aqui evita empurrar rajadas que so virariam
 *  fila do outro lado. */
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
  jpg?: { image_url?: string | null; large_image_url?: string | null };
  webp?: { image_url?: string | null; large_image_url?: string | null };
}

interface Named {
  mal_id: number;
  name: string;
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
  genres: Named[];
  themes: Named[];
  studios: Named[];
  producers: Named[];
  broadcast: { day: string | null; time: string | null; timezone: string | null };
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

/** O entry de recomendacao e mais enxuto que o detalhe: sem title_english,
 *  year nem members. */
export interface AnimeRecommendation {
  mal_id: number;
  title: string;
  images: AnimeImage;
  type: string | null;
  episodes: number | null;
  score: number | null;
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

export interface AnimeRelation {
  relation: string;
  entry: { mal_id: number; type: string | null; name: string }[];
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
        'x-api-token': env.ANIME_API_TOKEN
      },
      /** Quinze segundos: a API agrega varios provedores e pode precisar
       *  buscar em mais de um antes de responder. */
      signal: AbortSignal.timeout(15_000)
    });

    if (response.status === 401 || response.status === 403) {
      /** Nao conta como falha de fonte: token errado nao melhora com retry, e
       *  abrir o circuito esconderia o erro de configuracao. */
      throw new ExternalSourceError('mal', `autenticacao recusada: HTTP ${response.status}`);
    }

    /** 404 e 400 sao respostas legitimas sobre o recurso, nao indisponibilidade:
     *  contam como sucesso para o breaker. */
    if (response.status === 404) {
      animeBreaker.recordSuccess();
      throw new ExternalSourceError('mal', 'nao encontrado');
    }

    if (response.status === 400) {
      animeBreaker.recordSuccess();
      throw new ExternalSourceError('mal', 'requisicao invalida');
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ExternalSourceError('mal', `HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    animeBreaker.recordSuccess();
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ExternalSourceError) {
      const soft =
        error.message === 'nao encontrado' ||
        error.message === 'requisicao invalida' ||
        error.message.startsWith('autenticacao');

      if (!soft) animeBreaker.recordFailure();
      throw error;
    }

    animeBreaker.recordFailure();
    throw new ExternalSourceError('mal', (error as Error).message);
  }
}

/** A fonte ja filtra conteudo adulto, entao nao ha parametro sfw a enviar. */
export async function searchAnime(query: string, page: number): Promise<AnimeDetail[]> {
  const params = new URLSearchParams({ q: query, page: String(page), limit: '20' });
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

export async function getRecommendations(id: number): Promise<AnimeRecommendation[]> {
  const data = await request<{ data: { entry: AnimeRecommendation }[] }>(
    `/anime/${id}/recommendations`
  );
  return data.data.map((item) => item.entry);
}

export async function getRelations(id: number): Promise<AnimeRelation[]> {
  const data = await request<{ data: AnimeRelation[] }>(`/anime/${id}/relations`);
  return data.data;
}

export async function getSeason(
  year: number,
  season: string,
  page: number
): Promise<{ items: AnimeListing[]; hasNextPage: boolean }> {
  const data = await request<{ data: AnimeListing[]; pagination: Pagination }>(
    `/seasons/${year}/${season}?page=${page}&limit=25`
  );

  return { items: data.data, hasNextPage: data.pagination.has_next_page };
}

/**
 * Sem filter, uma chamada devolve animes de todos os dias, e o dia sai do
 * broadcast de cada item. O limite de 100 e o teto da API: a temporada
 * corrente costuma ter menos que isso em exibicao.
 */
export async function getSchedule(): Promise<AnimeDetail[]> {
  const collected: AnimeDetail[] = [];

  for (let page = 1; page <= 3; page += 1) {
    try {
      const data = await request<{ data: AnimeDetail[]; pagination?: Pagination }>(
        `/schedules?page=${page}&limit=100`
      );

      collected.push(...data.data);

      if (!data.pagination?.has_next_page) break;
    } catch (error) {
      /** Falha no meio da paginacao: devolve o que ja veio em vez de perder
       *  tudo. So propaga se nem a primeira pagina respondeu. */
      if (collected.length === 0) throw error;
      break;
    }
  }

  return collected;
}

export const animeImage = (images: AnimeImage | undefined): string | null =>
  images?.webp?.large_image_url ?? images?.jpg?.large_image_url ?? images?.jpg?.image_url ?? null;

/** "24 min per ep", "23 min." ou "1 hr 52 min". Sem isso, episode_duration
 *  ficaria nulo e o tempo assistido pararia de somar para anime. */
export function parseDuration(duration: string | null): number | null {
  if (!duration) return null;

  const hours = /(\d+)\s*hr/.exec(duration);
  const minutes = /(\d+)\s*min/.exec(duration);

  const total = (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  return total > 0 ? total : null;
}