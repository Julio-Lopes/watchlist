import { type Database, media, mediaEntries, userProfiles, users, watchEvents } from '@watchlist/db';
import type { ActivityDay, Wrapped } from '@watchlist/shared';
import { and, eq, sql } from 'drizzle-orm';
import { forbidden, notFound } from '../lib/errors.js';

const DAY_MS = 86_400_000;

/** Menos que isso nao rende retrospecto: a tela avisa que ainda e cedo em
 *  vez de mostrar numeros vazios. */
export const MIN_EPISODES = 20;

const toIso = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

export async function getWrapped(
  db: Database,
  username: string,
  year: number,
  viewerId: string | null
): Promise<Wrapped> {
  const [owner] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      deletedAt: users.deletedAt,
      isPrivate: userProfiles.isPrivate
    })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!owner || owner.deletedAt) throw notFound('Retrospecto nao encontrado.');

  const isOwner = owner.id === viewerId;

  if (owner.isPrivate) {
    /** O dono recebe 403 com explicacao; visitante recebe 404, indistinguivel
     *  de username inexistente. Dizer "esse perfil e privado" para estranho
     *  ja confirmaria que a conta existe. */
    if (isOwner) {
      throw forbidden('O Wrapped só funciona em perfis públicos.');
    }

    throw notFound('Retrospecto nao encontrado.');
  }

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const window = and(
    eq(watchEvents.userId, owner.id),
    sql`${watchEvents.watchedOn} between ${start} and ${end}`
  );

  const [totals] = await db
    .select({
      episodes: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`,
      activeDays: sql<number>`count(distinct ${watchEvents.watchedOn})::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(window);

  /**
   * Base do retrospecto: obras com atividade registrada no ano, ou concluidas
   * no ano segundo a data que a pessoa trouxe. A uniao existe porque a
   * importacao do MAL nao cria watch_events, entao quem importou aparece pelo
   * finished_at, e quem marca episodio aqui aparece pelos eventos. O distinct
   * impede que quem satisfaz os dois conte duas vezes.
   */
  const touched = sql`
    select distinct on (e.id)
           e.id, e.media_id, e.user_rating, e.status, e.episodes_watched
    from media_entries e
    left join watch_events w
      on w.media_entry_id = e.id
     and w.watched_on between ${start} and ${end}
    where e.user_id = ${owner.id}
      and (
        w.id is not null
        or (e.status = 'completed' and e.finished_at between ${start} and ${end})
      )
  `;

  const [completed] = await db.execute<{ total: number }>(sql`
    select count(*)::int as total from (${touched}) as t
    where t.status = 'completed'
  `).then((result) => result.rows);

  const [ratings] = await db.execute<{ mine: number | null; theirs: number | null }>(sql`
    select
      avg(t.user_rating)::float as mine,
      avg(m.avg_score) filter (where t.user_rating is not null)::float as theirs
    from (${touched}) as t
    join media m on m.id = t.media_id
    where t.user_rating is not null
  `).then((result) => result.rows);

  const [genre] = await db.execute<{ name: string; count: number }>(sql`
    select g.name, count(*)::int as count
    from (${touched}) as t
    join media m on m.id = t.media_id
    cross join lateral unnest(coalesce(m.genres, '{}')) as g(name)
    group by g.name
    order by count(*) desc
    limit 1
  `).then((result) => result.rows);

  const [month] = await db
    .select({
      month: sql<number>`extract(month from ${watchEvents.watchedOn})::int`,
      episodes: sql<number>`count(*)::int`
    })
    .from(watchEvents)
    .where(window)
    .groupBy(sql`extract(month from ${watchEvents.watchedOn})`)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  /** Destaques por nota, entre as obras do ano. Sem nota nao entra: a
   *  ausencia de avaliacao nao e um destaque. */
  const highlights = await db.execute<{
    source: string;
    media_type: string;
    external_id: number;
    title: string;
    cover_image: string | null;
    user_rating: number;
    episodes: number;
  }>(sql`
    select m.source, m.media_type, m.external_id, m.title, m.cover_image,
           t.user_rating, t.episodes_watched as episodes
    from (${touched}) as t
    join media m on m.id = t.media_id
    where t.user_rating is not null
    order by t.user_rating desc
    limit 5
  `).then((result) => result.rows);

  /** A obra com mais episodios no ano, que nem sempre e a mais bem avaliada:
   *  quem maratonou 200 episodios de algo mediano viveu isso tambem. */
  const [mostWatched] = await db
    .select({
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId,
      title: media.title,
      coverImage: media.coverImage,
      userRating: mediaEntries.userRating,
      episodes: sql<number>`count(*)::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(window)
    .groupBy(media.id, mediaEntries.userRating)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  const dayRows = await db
    .select({
      date: watchEvents.watchedOn,
      episodes: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(window)
    .groupBy(watchEvents.watchedOn);

  const byDate = new Map(dayRows.map((row) => [row.date, row]));
  const activity: ActivityDay[] = [];

  const now = new Date();
  const partial = year === now.getUTCFullYear();
  const lastDay = partial ? now : new Date(Date.UTC(year, 11, 31));

  for (
    let cursor = Date.UTC(year, 0, 1);
    cursor <= lastDay.getTime();
    cursor += DAY_MS
  ) {
    const date = toIso(new Date(cursor));
    const row = byDate.get(date);
    activity.push({ date, episodes: row?.episodes ?? 0, minutes: row?.minutes ?? 0 });
  }

  /** Maior sequencia dentro do ano, nao de todos os tempos: o retrospecto e
   *  sobre este periodo. */
  const active = new Set(dayRows.map((row) => row.date));
  const sorted = [...active].sort();
  let longestStreak = 0;
  let run = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const contiguous =
      previous !== undefined && Date.parse(sorted[index]!) - Date.parse(previous) === DAY_MS;

    run = contiguous ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
  }

  return {
    year,
    partial,
    owner: {
      username: owner.username,
      displayName: owner.displayName,
      avatarUrl: owner.avatarUrl
    },
    totalEpisodes: totals?.episodes ?? 0,
    totalMinutes: totals?.minutes ?? 0,
    activeDays: totals?.activeDays ?? 0,
    completedCount: completed?.total ?? 0,
    longestStreak,
    averageRating: ratings?.mine ?? null,
    publicAverage: ratings?.theirs ?? null,
    topGenre: genre?.name ?? null,
    topGenreCount: genre?.count ?? 0,
    busiestMonth: month?.month ?? null,
    busiestMonthEpisodes: month?.episodes ?? 0,
    highlights: highlights.map((row) => ({
      source: row.source as Wrapped['highlights'][number]['source'],
      mediaType: row.media_type as Wrapped['highlights'][number]['mediaType'],
      externalId: row.external_id,
      title: row.title,
      coverImage: row.cover_image,
      userRating: row.user_rating,
      episodes: row.episodes
    })),
    mostWatched: mostWatched ?? null,
    activity
  };
}