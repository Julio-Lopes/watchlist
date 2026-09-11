import { env } from '../env.js';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { ExternalSourceError } from './jikan.js';

const BASE = 'https://api.themoviedb.org/3';
export const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const tmdbBreaker = new CircuitBreaker('tmdb');

/** Token v4 e um JWT e vai no header; chave v3 vai como query param. */
const isV4Token = env.TMDB_API_KEY.startsWith('eyJ');

export interface TmdbItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_episodes?: number | null;
  status?: string;
  imdb_id?: string | null;
  genres?: { name: string }[];
  production_companies?: { id: number; name: string; logo_path: string | null }[];
  external_ids?: { imdb_id: string | null };
  credits?: {
    crew: { id: number; name: string; job: string; profile_path: string | null }[];
    cast: { id: number; name: string; profile_path: string | null; order: number }[];
  };
}

async function request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!tmdbBreaker.canAttempt()) {
    throw new ExternalSourceError('tmdb', 'circuito aberto');
  }

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('language', 'pt-BR');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (!isV4Token) url.searchParams.set('api_key', env.TMDB_API_KEY);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        ...(isV4Token ? { authorization: `Bearer ${env.TMDB_API_KEY}` } : {})
      },
      signal: AbortSignal.timeout(10_000)
    });

    if (response.status === 404) {
      tmdbBreaker.recordSuccess();
      throw new ExternalSourceError('tmdb', 'nao encontrado');
    }

    if (!response.ok) throw new ExternalSourceError('tmdb', `HTTP ${response.status}`);

    tmdbBreaker.recordSuccess();
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ExternalSourceError) {
      if (error.message !== 'nao encontrado') tmdbBreaker.recordFailure();
      throw error;
    }
    tmdbBreaker.recordFailure();
    throw new ExternalSourceError('tmdb', (error as Error).message);
  }
}

export async function searchTmdb(query: string, page: number, kind?: 'movie' | 'tv') {
  const paths = kind ? [`/search/${kind}`] : ['/search/movie', '/search/tv'];

  const responses = await Promise.all(
    paths.map(async (path) => {
      const data = await request<{ results: TmdbItem[] }>(path, {
        query,
        page: String(page),
        include_adult: 'false'
      });
      const type = path.endsWith('movie') ? 'movie' : 'tv';
      return data.results.map((item) => ({ ...item, media_type: type }));
    })
  );

  return responses.flat();
}

export const getMovie = (id: number) =>
  request<TmdbItem>(`/movie/${id}`, { append_to_response: 'credits' });

export const getShow = (id: number) =>
  request<TmdbItem>(`/tv/${id}`, { append_to_response: 'credits,external_ids' });

export const posterUrl = (path: string | null | undefined): string | null =>
  path ? `${IMAGE_BASE}/w500${path}` : null;

export const backdropUrl = (path: string | null | undefined): string | null =>
  path ? `${IMAGE_BASE}/original${path}` : null;

/** Recomendacoes do TMDB sao uma chamada a parte. So e feita quando o detalhe
 *  vai ser buscado de verdade, entao entra no mesmo TTL de 24 h. */
export const getRecommendations = (id: number, kind: 'movie' | 'tv') =>
  request<{ results: TmdbItem[] }>(`/${kind}/${id}/recommendations`);