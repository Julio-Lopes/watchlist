import { badges, type Database, media, mediaEntries, userBadges, userProfiles, watchEvents } from '@watchlist/db';
import type { BadgeStatus } from '@watchlist/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';

interface Criteria {
  type: string;
  threshold?: number;
  minVariance?: number;
  genre?: string;
}

/**
 * Uma query por tipo de criterio, nao por badge: tres badges usam
 * episodes_total com limiares diferentes, e contar tres vezes seria
 * desperdicio. O resultado e um mapa de tipo para valor atual.
 */
async function measure(db: Database, userId: string, timezone: string) {
  const [counts] = await db.execute<{
    episodes: number;
    completed: number;
    reviews: number;
    single_day: number;
    night_owl: number;
  }>(sql`
    select
      (select count(*)::int from watch_events where user_id = ${userId}) as episodes,
      (select count(*)::int from media_entries where user_id = ${userId} and status = 'completed') as completed,
      (select count(*)::int from reviews where user_id = ${userId}) as reviews,
      coalesce((
        select max(day_count)::int from (
          select count(*) as day_count from watch_events
          where user_id = ${userId} group by watched_on
        ) as days
      ), 0) as single_day,
      /** Madrugada no fuso do perfil, nao em UTC: quem assiste as 2h em
       *  Sao Paulo esta na madrugada dele, nao na de Londres. */
      (
        select count(*)::int from watch_events
        where user_id = ${userId}
          and extract(hour from created_at at time zone ${timezone}) between 0 and 4
      ) as night_owl
  `).then((result) => result.rows);

  /** Recorde, nao o streak atual: badge nao e revogada, e usar o atual faria
   *  ela aparecer e sumir conforme a pessoa para de assistir. */
  const dates = await db
    .selectDistinct({ date: watchEvents.watchedOn })
    .from(watchEvents)
    .where(eq(watchEvents.userId, userId));

  const sorted = dates.map((row) => row.date).sort();
  let longest = 0;
  let run = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const contiguous =
      previous !== undefined && Date.parse(sorted[index]!) - Date.parse(previous) === 86_400_000;

    run = contiguous ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  /** Variancia entre a sua nota e a media publica da mesma obra. Obra sem
   *  avg_score fica de fora: tratar como zero inflaria o desvio. */
  const [variance] = await db
    .select({
      value: sql<number>`coalesce(avg(power(${mediaEntries.userRating} - ${media.avgScore}, 2)), 0)::float`,
      rated: sql<number>`count(*)::int`
    })
    .from(mediaEntries)
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(
      and(
        eq(mediaEntries.userId, userId),
        sql`${mediaEntries.userRating} is not null`,
        sql`${media.avgScore} is not null`
      )
    );

  const genres = await db.execute<{ name: string; count: number }>(sql`
    select g.name, count(*)::int as count
    from media_entries e
    join media m on m.id = e.media_id
    cross join lateral unnest(coalesce(m.genres, '{}')) as g(name)
    where e.user_id = ${userId} and e.status = 'completed'
    group by g.name
  `).then((result) => result.rows);

  return {
    episodes_total: counts?.episodes ?? 0,
    entries_completed: counts?.completed ?? 0,
    reviews_written: counts?.reviews ?? 0,
    single_day_episodes: counts?.single_day ?? 0,
    night_owl: counts?.night_owl ?? 0,
    streak_days: longest,
    /** Cinco obras avaliadas no minimo: variancia de duas notas nao diz nada
     *  sobre o gosto de ninguem. */
    rating_variance: (variance?.rated ?? 0) >= 5 ? (variance?.value ?? 0) : 0,
    genres: new Map(genres.map((row) => [row.name, row.count]))
  };
}

type Measures = Awaited<ReturnType<typeof measure>>;

function evaluate(criteria: Criteria, measures: Measures): { current: number; target: number } {
  if (criteria.type === 'genre_count') {
    return {
      current: measures.genres.get(criteria.genre ?? '') ?? 0,
      target: criteria.threshold ?? 1
    };
  }

  if (criteria.type === 'rating_variance') {
    return { current: Math.round(measures.rating_variance), target: criteria.minVariance ?? 1 };
  }

  const current = measures[criteria.type as keyof Measures];

  return {
    current: typeof current === 'number' ? current : 0,
    target: criteria.threshold ?? 1
  };
}

/** Avalia e concede. Usado pelo job e pela rota de listagem, que aproveita a
 *  passagem para conceder o que estiver pronto. */
export async function evaluateBadges(db: Database, userId: string): Promise<number> {
  const [profile] = await db
    .select({ timezone: userProfiles.timezone })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const measures = await measure(db, userId, profile?.timezone ?? 'America/Sao_Paulo');

  const all = await db.select({ id: badges.id, criteria: badges.criteria }).from(badges);

  const owned = await db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const ownedIds = new Set(owned.map((row) => row.badgeId));
  let granted = 0;

  for (const badge of all) {
    if (ownedIds.has(badge.id)) continue;

    const { current, target } = evaluate(badge.criteria as Criteria, measures);
    if (current < target) continue;

    const inserted = await db
      .insert(userBadges)
      .values({ userId, badgeId: badge.id })
      .onConflictDoNothing()
      .returning({ badgeId: userBadges.badgeId });

    granted += inserted.length;
  }

  return granted;
}

export async function listBadges(db: Database, userId: string) {
  /** Avalia antes de listar: abrir a tela e o momento em que a pessoa espera
   *  ver o resultado, e esperar o cron da madrugada seria frustrante. */
  await evaluateBadges(db, userId);

  const [profile] = await db
    .select({ timezone: userProfiles.timezone })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const measures = await measure(db, userId, profile?.timezone ?? 'America/Sao_Paulo');

  const rows = await db
    .select({
      slug: badges.slug,
      name: badges.name,
      description: badges.description,
      iconName: badges.iconName,
      tier: badges.tier,
      isSecret: badges.isSecret,
      criteria: badges.criteria,
      earnedAt: userBadges.earnedAt,
      seenAt: userBadges.seenAt
    })
    .from(badges)
    .leftJoin(
      userBadges,
      and(eq(userBadges.badgeId, badges.id), eq(userBadges.userId, userId))
    )
    .where(eq(badges.isActive, true))
    .orderBy(badges.sortOrder, badges.tier, badges.slug);

  const items: BadgeStatus[] = rows.map((row) => {
    const earned = row.earnedAt !== null;
    const { current, target } = evaluate(row.criteria as Criteria, measures);

    /** Secreta nao ganha esconde ate o progresso: mostrar "3 de 50"
     *  entregaria o criterio. */
    const revealed = earned || !row.isSecret;

    return {
      slug: row.slug,
      name: revealed ? row.name : 'Badge secreta',
      description: revealed ? row.description : null,
      iconName: revealed ? row.iconName : null,
      tier: row.tier,
      isSecret: row.isSecret,
      earnedAt: row.earnedAt?.toISOString() ?? null,
      current: revealed ? current : null,
      target: revealed ? target : null
    };
  });

  const unseen = rows
    .filter((row) => row.earnedAt !== null && row.seenAt === null)
    .map((row) => items.find((item) => item.slug === row.slug))
    .filter((item): item is BadgeStatus => item !== undefined);

  return {
    items,
    earned: rows.filter((row) => row.earnedAt !== null).length,
    total: rows.length,
    unseen
  };
}

export async function markSeen(db: Database, userId: string): Promise<void> {
  await db
    .update(userBadges)
    .set({ seenAt: new Date() })
    .where(and(eq(userBadges.userId, userId), isNull(userBadges.seenAt)));
}