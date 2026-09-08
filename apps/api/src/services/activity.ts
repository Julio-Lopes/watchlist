import { type Database, media, mediaEntries, watchEvents } from '@watchlist/db';
import type { ActivityDay, ActivityStats } from '@watchlist/shared';
import { and, eq, gte, sql } from 'drizzle-orm';

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 365;

const toIso = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

interface StreakResult {
  current: number;
  longest: number;
  longestStart: string | null;
  longestEnd: string | null;
}

/**
 * O streak conta ate o fim do dia de hoje. Se contasse so dias ja fechados,
 * o numero cairia toda manha e voltaria a noite, o que pareceria defeito.
 */
function computeStreaks(activeDates: Set<string>, today: string): StreakResult {
  if (activeDates.size === 0) {
    return { current: 0, longest: 0, longestStart: null, longestEnd: null };
  }

  const sorted = [...activeDates].sort();

  let longest = 0;
  let longestStart: string | null = null;
  let longestEnd: string | null = null;
  let runLength = 0;
  let runStart = sorted[0]!;

  for (let index = 0; index < sorted.length; index += 1) {
    const date = sorted[index]!;
    const previous = sorted[index - 1];

    const contiguous =
      previous !== undefined && Date.parse(date) - Date.parse(previous) === DAY_MS;

    if (contiguous) {
      runLength += 1;
    } else {
      runLength = 1;
      runStart = date;
    }

    if (runLength > longest) {
      longest = runLength;
      longestStart = runStart;
      longestEnd = date;
    }
  }

  /** Ancora no ultimo dia ativo. Se ele for hoje ou ontem, a sequencia esta
   *  viva; qualquer coisa mais antiga significa que ja quebrou. */
  const last = sorted.at(-1)!;
  const distanceFromToday = Math.round((Date.parse(today) - Date.parse(last)) / DAY_MS);

  let current = 0;

  if (distanceFromToday <= 1) {
    let cursor = last;
    while (activeDates.has(cursor)) {
      current += 1;
      cursor = toIso(new Date(Date.parse(cursor) - DAY_MS));
    }
  }

  return { current, longest, longestStart, longestEnd };
}

export async function getActivity(
  db: Database,
  userId: string,
  today: string
): Promise<ActivityStats> {
  const start = toIso(new Date(Date.parse(today) - (WINDOW_DAYS - 1) * DAY_MS));

  const rows = await db
    .select({
      date: watchEvents.watchedOn,
      episodes: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(eq(watchEvents.userId, userId), gte(watchEvents.watchedOn, start)))
    .groupBy(watchEvents.watchedOn);

  const byDate = new Map(rows.map((row) => [row.date, row]));

  /** Preenche os 365 dias, inclusive vazios: sem eles o grid nao consegue
   *  posicionar as colunas por semana. */
  const days: ActivityDay[] = [];

  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const date = toIso(new Date(Date.parse(today) - offset * DAY_MS));
    const row = byDate.get(date);
    days.push({ date, episodes: row?.episodes ?? 0, minutes: row?.minutes ?? 0 });
  }

  /** O streak olha o historico inteiro, nao so a janela do grid: uma sequencia
   *  de 400 dias nao pode ser cortada em 365. */
  const allDates = await db
    .selectDistinct({ date: watchEvents.watchedOn })
    .from(watchEvents)
    .where(eq(watchEvents.userId, userId));

  const streaks = computeStreaks(new Set(allDates.map((row) => row.date)), today);

  const [totals] = await db
    .select({
      episodes: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`,
      activeDays: sql<number>`count(distinct ${watchEvents.watchedOn})::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(eq(watchEvents.userId, userId));

  return {
    days,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    longestStreakStart: streaks.longestStart,
    longestStreakEnd: streaks.longestEnd,
    totalEpisodes: totals?.episodes ?? 0,
    totalMinutes: totals?.minutes ?? 0,
    activeDays: totals?.activeDays ?? 0
  };
}