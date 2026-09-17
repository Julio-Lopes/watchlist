import type { EntryStatus } from '@watchlist/shared';

export interface MalEntry {
  malId: number;
  title: string;
  episodesWatched: number;
  score: number | null;
  status: EntryStatus;
  startedAt: string | null;
  finishedAt: string | null;
  rewatchCount: number;
}

const STATUS_MAP: Record<string, EntryStatus> = {
  Watching: 'watching',
  Completed: 'completed',
  'On-Hold': 'paused',
  Dropped: 'dropped',
  'Plan to Watch': 'planning'
};

/** O MAL usa 0000-00-00 para data vazia, que nao e data valida em lugar
 *  nenhum. */
const parseDate = (raw: string | undefined): string | null => {
  if (!raw || raw.startsWith('0000')) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
};

/** Entidades XML que aparecem em titulo de anime. Nao vale uma biblioteca de
 *  parsing: o XML do MAL tem estrutura fixa e plana. */
const decode = (text: string): string =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .trim();

const field = (block: string, name: string): string | undefined => {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block);
  return match ? decode(match[1] ?? '') : undefined;
};

/**
 * Parser por expressao regular em vez de biblioteca de XML. O arquivo do MAL
 * e gerado por eles, tem estrutura plana e conhecida, e uma dependencia de
 * parsing traria superficie de ataque por XXE que nao precisamos.
 */
export function parseMalXml(xml: string): MalEntry[] {
  const entries: MalEntry[] = [];
  const blocks = xml.match(/<anime>[\s\S]*?<\/anime>/g) ?? [];

  for (const block of blocks) {
    const malId = Number(field(block, 'series_animedb_id'));
    if (!Number.isInteger(malId) || malId <= 0) continue;

    const rawScore = Number(field(block, 'my_score') ?? '0');
    const rawStatus = field(block, 'my_status') ?? 'Plan to Watch';

    entries.push({
      malId,
      title: field(block, 'series_title') ?? `Anime ${malId}`,
      episodesWatched: Number(field(block, 'my_watched_episodes') ?? '0') || 0,
      /** O MAL usa 0 a 10, onde zero significa sem nota. O banco guarda
       *  0 a 100, e nota 10 do MAL vira 100. */
      score: rawScore > 0 ? Math.min(100, rawScore * 10) : null,
      status: STATUS_MAP[rawStatus] ?? 'planning',
      startedAt: parseDate(field(block, 'my_start_date')),
      finishedAt: parseDate(field(block, 'my_finish_date')),
      rewatchCount: Number(field(block, 'my_times_watched') ?? '0') || 0
    });
  }

  return entries;
}