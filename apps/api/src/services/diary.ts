import { type Database, media, mediaEntries, watchEvents } from '@watchlist/db';
import type { DiaryDay, MediaType } from '@watchlist/shared';
import { and, desc, eq, lt, sql } from 'drizzle-orm';

const DAYS_PER_PAGE = 10;
const DAY_MS = 86_400_000;

/** Dias vazios entre dois registros. Sem isso a linha do tempo colaria
 *  5 de setembro em 29 de agosto como se fossem vizinhos. */
const daysBetween = (later: string, earlier: string): number =>
  Math.max(0, Math.round((Date.parse(later) - Date.parse(earlier)) / DAY_MS) - 1);

export async function listDiary(
  db: Database,
  userId: string,
  type?: MediaType,
  cursor?: string
): Promise<{ days: DiaryDay[]; nextCursor: string | null }> {
  const base = [eq(watchEvents.userId, userId)];
  if (type) base.push(eq(media.mediaType, type));

  /** Pagina por dia, nao por evento: cortar um dia ao meio deixaria o total
   *  do bloco errado. */
  const dates = await db
    .selectDistinct({ date: watchEvents.watchedOn })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(cursor ? and(...base, lt(watchEvents.watchedOn, cursor)) : and(...base))
    .orderBy(desc(watchEvents.watchedOn))
    .limit(DAYS_PER_PAGE + 1);

  const hasMore = dates.length > DAYS_PER_PAGE;
  const page = hasMore ? dates.slice(0, DAYS_PER_PAGE) : dates;

  if (page.length === 0) return { days: [], nextCursor: null };

  const newest = page[0]!.date;
  const oldest = page.at(-1)!.date;

  const rows = await db
    .select({
      id: watchEvents.id,
      date: watchEvents.watchedOn,
      episodeNumber: watchEvents.episodeNumber,
      isRewatch: watchEvents.isRewatch,
      minutes: media.episodeDuration,
      mediaId: media.id,
      title: media.title,
      coverImage: media.coverImage,
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(...base, sql`${watchEvents.watchedOn} between ${oldest} and ${newest}`))
    .orderBy(desc(watchEvents.watchedOn), desc(watchEvents.createdAt));

  const byDate = new Map<string, DiaryDay>();

  for (const row of rows) {
    const day = byDate.get(row.date) ?? {
      date: row.date,
      totalEpisodes: 0,
      totalMinutes: 0,
      gapDays: 0,
      events: []
    };

    day.totalEpisodes += 1;
    day.totalMinutes += row.minutes ?? 0;

    day.events.push({
      id: row.id,
      episodeNumber: row.episodeNumber,
      isRewatch: row.isRewatch,
      minutes: row.minutes,
      media: {
        id: row.mediaId,
        title: row.title,
        coverImage: row.coverImage,
        source: row.source,
        mediaType: row.mediaType,
        externalId: row.externalId
      }
    });

    byDate.set(row.date, day);
  }

  const days = page
    .map((entry) => byDate.get(entry.date))
    .filter((day): day is DiaryDay => day !== undefined);

  for (let index = 1; index < days.length; index += 1) {
    days[index]!.gapDays = daysBetween(days[index - 1]!.date, days[index]!.date);
  }

  return { days, nextCursor: hasMore ? oldest : null };
}

export async function monthTotals(
  db: Database,
  userId: string
): Promise<{ episodes: number; minutes: number }> {
  const [row] = await db
    .select({
      episodes: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(
      and(
        eq(watchEvents.userId, userId),
        sql`date_trunc('month', ${watchEvents.watchedOn}) = date_trunc('month', current_date)`
      )
    );

  return { episodes: row?.episodes ?? 0, minutes: row?.minutes ?? 0 };
}