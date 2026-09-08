import {
  badges,
  type Database,
  follows,
  media,
  mediaEntries,
  reviews,
  userBadges,
  userProfiles,
  users,
  watchEvents
} from '@watchlist/db';
import type { ActivityDay, PublicEntry, PublicProfile, PublicReview } from '@watchlist/shared';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { notFound } from '../lib/errors.js';

const DAY_MS = 86_400_000;
const ACTIVITY_DAYS = 182;
const PAGE_SIZE = 24;

const toIso = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

/**
 * Perfil privado responde 404, nunca 403: 403 confirmaria que o usuario
 * existe, e isso ja e informacao. O dono ve o proprio perfil normalmente.
 */
async function resolveUser(db: Database, username: string, viewerId: string | null) {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt,
      bio: userProfiles.bio,
      isPrivate: userProfiles.isPrivate,
      bannerImage: media.bannerImage
    })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(media, eq(media.id, userProfiles.bannerMediaId))
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!row || row.deletedAt) throw notFound('Perfil nao encontrado.');
  if (row.isPrivate && row.id !== viewerId) throw notFound('Perfil nao encontrado.');

  return row;
}

export async function getPublicProfile(
  db: Database,
  username: string,
  viewerId: string | null
): Promise<PublicProfile> {
  const user = await resolveUser(db, username, viewerId);

  const [totals] = await db.execute<{
    entries: number;
    rated: number | null;
    reviews: number;
  }>(sql`
    select
      count(distinct e.id)::int as entries,
      avg(e.user_rating)::float as rated,
      (select count(*)::int from reviews r where r.user_id = ${user.id}) as reviews
    from media_entries e
    where e.user_id = ${user.id}
  `).then((result) => result.rows);

  const [episodes] = await db
    .select({
      total: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(eq(watchEvents.userId, user.id));

  const [social] = await db.execute<{ followers: number; following: number }>(sql`
    select
      (select count(*)::int from follows where following_id = ${user.id}) as followers,
      (select count(*)::int from follows where follower_id = ${user.id}) as following
  `).then((result) => result.rows);

  const favorites = await db
    .select({
      id: media.id,
      title: media.title,
      coverImage: media.coverImage,
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId,
      userRating: mediaEntries.userRating
    })
    .from(mediaEntries)
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(eq(mediaEntries.userId, user.id), eq(mediaEntries.isFavorite, true)))
    .orderBy(desc(mediaEntries.userRating))
    .limit(4);

  const earned = await db
    .select({
      slug: badges.slug,
      name: badges.name,
      description: badges.description,
      iconName: badges.iconName,
      tier: badges.tier,
      earnedAt: userBadges.earnedAt
    })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, user.id))
    .orderBy(desc(userBadges.earnedAt))
    .limit(12);

  const today = toIso(new Date());
  const start = toIso(new Date(Date.now() - (ACTIVITY_DAYS - 1) * DAY_MS));

  const activityRows = await db
    .select({
      date: watchEvents.watchedOn,
      episodes: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(eq(watchEvents.userId, user.id), sql`${watchEvents.watchedOn} >= ${start}`))
    .groupBy(watchEvents.watchedOn);

  const byDate = new Map(activityRows.map((row) => [row.date, row]));
  const activity: ActivityDay[] = [];

  for (let offset = ACTIVITY_DAYS - 1; offset >= 0; offset -= 1) {
    const date = toIso(new Date(Date.parse(today) - offset * DAY_MS));
    const row = byDate.get(date);
    activity.push({ date, episodes: row?.episodes ?? 0, minutes: row?.minutes ?? 0 });
  }

  const allDates = await db
    .selectDistinct({ date: watchEvents.watchedOn })
    .from(watchEvents)
    .where(eq(watchEvents.userId, user.id));

  const active = new Set(allDates.map((row) => row.date));
  let currentStreak = 0;
  let cursor = active.has(today) ? today : toIso(new Date(Date.parse(today) - DAY_MS));

  while (active.has(cursor)) {
    currentStreak += 1;
    cursor = toIso(new Date(Date.parse(cursor) - DAY_MS));
  }

  let isFollowing: boolean | null = null;

  if (viewerId && viewerId !== user.id) {
    const [row] = await db
      .select({ id: follows.followerId })
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, user.id)))
      .limit(1);

    isFollowing = row !== undefined;
  }

  return {
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bannerImage: user.bannerImage,
    bio: user.bio,
    joinedAt: user.createdAt.toISOString(),
    totalEntries: totals?.entries ?? 0,
    totalEpisodes: episodes?.total ?? 0,
    totalMinutes: episodes?.minutes ?? 0,
    averageRating: totals?.rated ?? null,
    currentStreak,
    followers: social?.followers ?? 0,
    following: social?.following ?? 0,
    reviewsCount: totals?.reviews ?? 0,
    favorites,
    badges: earned.map((badge) => ({ ...badge, earnedAt: badge.earnedAt.toISOString() })),
    activity,
    isFollowing,
    isSelf: viewerId === user.id
  };
}

export async function listPublicEntries(
  db: Database,
  username: string,
  viewerId: string | null,
  status?: string,
  cursor?: string
): Promise<{ items: PublicEntry[]; nextCursor: string | null }> {
  const user = await resolveUser(db, username, viewerId);

  const filters = [eq(mediaEntries.userId, user.id)];
  if (status) filters.push(sql`${mediaEntries.status} = ${status}`);

  if (cursor) {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    if (iso && id) {
      const after = or(
        lt(mediaEntries.updatedAt, new Date(iso)),
        and(eq(mediaEntries.updatedAt, new Date(iso)), lt(mediaEntries.id, id))
      );
      if (after) filters.push(after);
    }
  }

  const rows = await db
    .select({
      entryId: mediaEntries.id,
      updatedAt: mediaEntries.updatedAt,
      status: mediaEntries.status,
      episodesWatched: mediaEntries.episodesWatched,
      userRating: mediaEntries.userRating,
      id: media.id,
      title: media.title,
      coverImage: media.coverImage,
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId,
      totalEpisodes: media.totalEpisodes
    })
    .from(mediaEntries)
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(...filters))
    .orderBy(desc(mediaEntries.updatedAt), desc(mediaEntries.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = page.at(-1);

  /** notes nunca sai daqui: e campo privado por definicao, mesmo no perfil
   *  publico do proprio dono. */
  return {
    items: page.map((row) => ({
      id: row.id,
      title: row.title,
      coverImage: row.coverImage,
      source: row.source,
      mediaType: row.mediaType,
      externalId: row.externalId,
      userRating: row.userRating,
      status: row.status,
      episodesWatched: row.episodesWatched,
      totalEpisodes: row.totalEpisodes
    })),
    nextCursor:
      hasMore && last
        ? Buffer.from(`${last.updatedAt.toISOString()}|${last.entryId}`).toString('base64url')
        : null
  };
}

export async function listPublicReviews(
  db: Database,
  username: string,
  viewerId: string | null,
  cursor?: string
): Promise<{ items: PublicReview[]; nextCursor: string | null }> {
  const user = await resolveUser(db, username, viewerId);

  const filters = [eq(reviews.userId, user.id)];
  if (cursor) filters.push(lt(reviews.createdAt, new Date(cursor)));

  const rows = await db
    .select({
      id: reviews.id,
      content: reviews.content,
      containsSpoilers: reviews.containsSpoilers,
      likesCount: reviews.likesCount,
      createdAt: reviews.createdAt,
      rating: mediaEntries.userRating,
      mediaId: media.id,
      title: media.title,
      coverImage: media.coverImage,
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId
    })
    .from(reviews)
    .innerJoin(mediaEntries, eq(mediaEntries.id, reviews.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(...filters))
    .orderBy(desc(reviews.createdAt))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return {
    items: page.map((row) => ({
      id: row.id,
      content: row.content,
      containsSpoilers: row.containsSpoilers,
      likesCount: row.likesCount,
      createdAt: row.createdAt.toISOString(),
      rating: row.rating,
      media: {
        id: row.mediaId,
        title: row.title,
        coverImage: row.coverImage,
        source: row.source,
        mediaType: row.mediaType,
        externalId: row.externalId,
        userRating: row.rating
      }
    })),
    nextCursor: hasMore ? (page.at(-1)?.createdAt.toISOString() ?? null) : null
  };
}

export async function setFollow(
  db: Database,
  followerId: string,
  username: string,
  following: boolean
): Promise<void> {
  const user = await resolveUser(db, username, followerId);

  if (user.id === followerId) {
    throw notFound('Perfil nao encontrado.');
  }

  if (following) {
    await db
      .insert(follows)
      .values({ followerId, followingId: user.id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, user.id)));
  }
}