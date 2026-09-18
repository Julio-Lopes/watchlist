import type { Database } from '@watchlist/db';
import type { MediaType, RankingBoard, RankingItem, RankingKind } from '@watchlist/shared';
import { sql, type SQL } from 'drizzle-orm';
import { TtlCache } from '../lib/cache.js';

/** Uma obra com uma nota 10 lideraria o ranking. Cinco avaliacoes e o minimo
 *  para a media dizer alguma coisa, e o numero aparece na tela. */
export const MIN_SAMPLE = 5;

/** [SLEEP] Ranking nao muda a cada minuto e a consulta agrega tabela inteira.
 *  Uma hora em memoria; o cache morre quando o servico dorme, e a primeira
 *  visita depois disso paga a consulta. */
const cache = new TtlCache<RankingBoard>(60 * 60 * 1000, 40);

interface Row extends Record<string, unknown> {
  source: string;
  media_type: string;
  external_id: number;
  title: string;
  cover_image: string | null;
  year: number | null;
  total_episodes: number | null;
  value: number;
  sample: number;
}

const toItems = (rows: Row[]): RankingItem[] =>
  rows.map((row, index) => ({
    position: index + 1,
    source: row.source as RankingItem['source'],
    mediaType: row.media_type as MediaType,
    externalId: row.external_id,
    title: row.title,
    coverImage: row.cover_image,
    year: row.year,
    totalEpisodes: row.total_episodes,
    value: Number(row.value),
    sample: row.sample
  }));

/** Perfil privado fica de fora, consistente com o resto do produto: o que
 *  nao aparece no feed nem no perfil tambem nao conta no ranking. */
const PUBLIC_ONLY = sql`
  join user_profiles p on p.user_id = e.user_id and p.is_private = false
`;

const typeFilter = (type?: MediaType): SQL =>
  type ? sql`and m.media_type = ${type}` : sql``;

async function buildBoard(
  db: Database,
  kind: RankingKind,
  type: MediaType | undefined,
  limit: number
): Promise<RankingBoard> {
  const where = typeFilter(type);

  if (kind === 'rating') {
    const rows = await db.execute<Row>(sql`
      select m.source, m.media_type, m.external_id, m.title, m.cover_image, m.year,
             m.total_episodes,
             round(avg(e.user_rating) / 10.0, 1) as value,
             count(*)::int as sample
      from media_entries e
      join media m on m.id = e.media_id
      ${PUBLIC_ONLY}
      where e.user_rating is not null ${where}
      group by m.id
      having count(*) >= ${MIN_SAMPLE}
      order by avg(e.user_rating) desc, count(*) desc
      limit ${limit}
    `);

    const [counted] = await db.execute<{ total: number }>(sql`
      select count(*)::int as total from (
        select m.id from media_entries e
        join media m on m.id = e.media_id
        ${PUBLIC_ONLY}
        where e.user_rating is not null ${where}
        group by m.id having count(*) >= ${MIN_SAMPLE}
      ) as eligible
    `).then((result) => result.rows);

    return { kind, items: toItems(rows.rows), eligible: counted?.total ?? 0 };
  }

  if (kind === 'watched') {
    const rows = await db.execute<Row>(sql`
      select m.source, m.media_type, m.external_id, m.title, m.cover_image, m.year,
             m.total_episodes,
             count(*)::int as value,
             count(*)::int as sample
      from media_entries e
      join media m on m.id = e.media_id
      ${PUBLIC_ONLY}
      where e.status <> 'planning' ${where}
      group by m.id
      order by count(*) desc
      limit ${limit}
    `);

    return { kind, items: toItems(rows.rows), eligible: rows.rows.length };
  }

  if (kind === 'dropped') {
    const rows = await db.execute<Row>(sql`
      select m.source, m.media_type, m.external_id, m.title, m.cover_image, m.year,
             m.total_episodes,
             round(100.0 * count(*) filter (where e.status = 'dropped') / count(*)) as value,
             count(*)::int as sample
      from media_entries e
      join media m on m.id = e.media_id
      ${PUBLIC_ONLY}
      where e.status <> 'planning' ${where}
      group by m.id
      /** Mesma amostra minima da nota: 100% de largadas em duas pessoas nao
          diz nada sobre a obra. */
      having count(*) >= ${MIN_SAMPLE} and count(*) filter (where e.status = 'dropped') > 0
      order by 100.0 * count(*) filter (where e.status = 'dropped') / count(*) desc
      limit ${limit}
    `);

    return { kind, items: toItems(rows.rows), eligible: rows.rows.length };
  }

  const rows = await db.execute<Row>(sql`
    select m.source, m.media_type, m.external_id, m.title, m.cover_image, m.year,
           m.total_episodes,
           count(*)::int as value,
           count(*)::int as sample
    from media_entries e
    join media m on m.id = e.media_id
    ${PUBLIC_ONLY}
    where e.created_at >= now() - interval '30 days' ${where}
    group by m.id
    order by count(*) desc
    limit ${limit}
  `);

  return { kind, items: toItems(rows.rows), eligible: rows.rows.length };
}

export async function getRankings(
  db: Database,
  type: MediaType | undefined,
  kind: RankingKind | undefined,
  limit: number
): Promise<{ boards: RankingBoard[]; minSample: number }> {
  const kinds: RankingKind[] = kind ? [kind] : ['rating', 'watched', 'dropped', 'trending'];
  const boards: RankingBoard[] = [];

  for (const current of kinds) {
    const key = `${current}-${type ?? 'all'}-${limit}`;
    const cached = cache.get(key);

    if (cached) {
      boards.push(cached);
      continue;
    }

    const board = await buildBoard(db, current, type, limit);
    cache.set(key, board);
    boards.push(board);
  }

  return { boards, minSample: MIN_SAMPLE };
}