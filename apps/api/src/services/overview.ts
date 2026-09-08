import { type Database, media, mediaEntries, watchEvents } from '@watchlist/db';
import type { Affinity, Overview } from '@watchlist/shared';
import { and, eq, gte, sql } from 'drizzle-orm';

/** Um estudio com uma obra e nota 10 apareceria como afinidade maxima.
 *  Tres obras concluidas e o minimo para o numero significar algo. */
const MIN_SAMPLE = 3;
const TOP_LIMIT = 6;

const periodFilter = (period: 'year' | 'all') =>
  period === 'year'
    ? sql`and e.updated_at >= now() - interval '1 year'`
    : sql``;

export async function getOverview(
  db: Database,
  userId: string,
  period: 'year' | 'all'
): Promise<Overview> {
  const window = periodFilter(period);

  const [totals] = await db.execute<{
    total: number;
    rated: number;
    mine: number | null;
    theirs: number | null;
  }>(sql`
    select
      count(*)::int as total,
      count(e.user_rating)::int as rated,
      avg(e.user_rating)::float as mine,
      avg(m.avg_score) filter (where e.user_rating is not null)::float as theirs
    from media_entries e
    join media m on m.id = e.media_id
    where e.user_id = ${userId}
      and e.status <> 'planning'
      ${window}
  `).then((result) => result.rows);

  /** unnest abre o array de generos em linhas. Fazer isso no Postgres evita
   *  trazer 143 arrays para memoria so para contar. */
  const genres = await db.execute<{ name: string; count: number; rating: number | null }>(sql`
    select
      g.name,
      count(*)::int as count,
      avg(e.user_rating)::float as rating
    from media_entries e
    join media m on m.id = e.media_id
    cross join lateral unnest(coalesce(m.genres, '{}')) as g(name)
    where e.user_id = ${userId}
      and e.status <> 'planning'
      ${window}
    group by g.name
    order by count(*) desc
    limit 8
  `).then((result) => result.rows);

  const ratings = await db.execute<{ bucket: number; count: number }>(sql`
    select
      floor(e.user_rating / 10)::int as bucket,
      count(*)::int as count
    from media_entries e
    where e.user_id = ${userId}
      and e.user_rating is not null
      ${window}
    group by 1
    order by 1
  `).then((result) => result.rows);

  const months = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${watchEvents.watchedOn}), 'YYYY-MM')`,
      episodes: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(
      and(
        eq(watchEvents.userId, userId),
        gte(watchEvents.watchedOn, sql`(current_date - interval '12 months')::date`)
      )
    )
    .groupBy(sql`date_trunc('month', ${watchEvents.watchedOn})`)
    .orderBy(sql`date_trunc('month', ${watchEvents.watchedOn})`);

  /** Uma query parametrizada por papel em vez de tres quase iguais. */
  const affinityByRole = async (role: string): Promise<Affinity[]> => {
    const rows = await db.execute<{
      name: string;
      image: string | null;
      count: number;
      rating: number;
    }>(sql`
      select
        p.name,
        p.image_url as image,
        count(*)::int as count,
        avg(e.user_rating)::float as rating
      from media_entries e
      join media m on m.id = e.media_id
      join media_credits c on c.media_id = m.id and c.role = ${role}
      join people p on p.id = c.person_id
      where e.user_id = ${userId}
        and e.status = 'completed'
        and e.user_rating is not null
        ${window}
      group by p.id, p.name, p.image_url
      having count(*) >= ${MIN_SAMPLE}
      order by avg(e.user_rating) desc, count(*) desc
      limit ${TOP_LIMIT}
    `);

    return rows.rows.map((row) => ({
      name: row.name,
      imageUrl: row.image,
      count: row.count,
      averageRating: row.rating
    }));
  };

  const [studios, directors, composers] = await Promise.all([
    affinityByRole('studio'),
    affinityByRole('director'),
    affinityByRole('composer')
  ]);

  const [belowThreshold] = await db.execute<{ count: number }>(sql`
    select count(*)::int as count from (
      select c.person_id
      from media_entries e
      join media_credits c on c.media_id = e.media_id
      where e.user_id = ${userId}
        and e.status = 'completed'
        and e.user_rating is not null
        ${window}
      group by c.person_id
      having count(*) < ${MIN_SAMPLE}
    ) as few
  `).then((result) => result.rows);

  const dropReasons = await db
    .select({
      reason: mediaEntries.dropReason,
      count: sql<number>`count(*)::int`
    })
    .from(mediaEntries)
    .where(and(eq(mediaEntries.userId, userId), eq(mediaEntries.status, 'dropped')))
    .groupBy(mediaEntries.dropReason)
    .orderBy(sql`count(*) desc`);

  return {
    totalEntries: totals?.total ?? 0,
    ratedEntries: totals?.rated ?? 0,
    averageRating: totals?.mine ?? null,
    publicAverage: totals?.theirs ?? null,
    genres: genres.map((row) => ({
      name: row.name,
      count: row.count,
      averageRating: row.rating
    })),
    ratings: ratings.map((row) => ({ score: row.bucket, count: row.count })),
    months: months.map((row) => ({
      month: row.month,
      episodes: row.episodes,
      minutes: row.minutes
    })),
    studios,
    directors,
    composers,
    dropReasons: dropReasons
      .filter((row): row is { reason: NonNullable<typeof row.reason>; count: number } =>
        row.reason !== null
      )
      .map((row) => ({ reason: row.reason, count: row.count })),
    affinitiesBelowThreshold: belowThreshold?.count ?? 0,
    minSampleSize: MIN_SAMPLE
  };
}