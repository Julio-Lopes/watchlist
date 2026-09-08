import {
  type Database,
  follows,
  media,
  mediaEntries,
  reviews,
  userProfiles,
  users,
  watchEvents
} from '@watchlist/db';
import type { FeedItem, SuggestedUser } from '@watchlist/shared';
import { and, count, desc, eq, lt, ne, notInArray, sql } from 'drizzle-orm';

const PAGE_SIZE = 20;

export async function listFeed(
  db: Database,
  userId: string,
  cursor?: string
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const before = cursor ? new Date(cursor) : new Date();

  /** Perfil privado nao entra no feed nem de quem segue. A checagem fica na
   *  query, nao depois: filtrar em memoria vaza pelo count. */
  const following = db
    .select({ id: follows.followingId })
    .from(follows)
    .innerJoin(userProfiles, eq(userProfiles.userId, follows.followingId))
    .where(and(eq(follows.followerId, userId), eq(userProfiles.isPrivate, false)));

  const watched = await db
    .select({
      date: watchEvents.watchedOn,
      at: sql<string>`max(${watchEvents.createdAt})`,
      episodes: sql<number>`count(*)::int`,
      firstEpisode: sql<number | null>`min(${watchEvents.episodeNumber})`,
      lastEpisode: sql<number | null>`max(${watchEvents.episodeNumber})`,
      minutes: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int`,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      mediaId: media.id,
      title: media.title,
      coverImage: media.coverImage,
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId
    })
    .from(watchEvents)
    .innerJoin(users, eq(users.id, watchEvents.userId))
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(
      and(
        sql`${watchEvents.userId} in ${following}`,
        lt(watchEvents.createdAt, before)
      )
    )
    /** Agrupado por pessoa, obra e dia: quem maratonou vinte episodios vira
     *  um item, nao vinte. */
    .groupBy(
      watchEvents.userId,
      watchEvents.watchedOn,
      users.username,
      users.displayName,
      users.avatarUrl,
      media.id
    )
    .orderBy(desc(sql`max(${watchEvents.createdAt})`))
    .limit(PAGE_SIZE);

  const written = await db
    .select({
      id: reviews.id,
      at: reviews.createdAt,
      content: reviews.content,
      containsSpoilers: reviews.containsSpoilers,
      rating: mediaEntries.userRating,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      mediaId: media.id,
      title: media.title,
      coverImage: media.coverImage,
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .innerJoin(mediaEntries, eq(mediaEntries.id, reviews.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(sql`${reviews.userId} in ${following}`, lt(reviews.createdAt, before)))
    .orderBy(desc(reviews.createdAt))
    .limit(PAGE_SIZE);

  const items: FeedItem[] = [
    ...watched.map((row) => ({
      kind: 'watched' as const,
      id: `w-${row.username}-${row.mediaId}-${row.date}`,
      at: new Date(row.at).toISOString(),
      actor: { username: row.username, displayName: row.displayName, avatarUrl: row.avatarUrl },
      media: {
        id: row.mediaId,
        title: row.title,
        coverImage: row.coverImage,
        source: row.source,
        mediaType: row.mediaType,
        externalId: row.externalId
      },
      episodes: row.episodes,
      firstEpisode: row.firstEpisode,
      lastEpisode: row.lastEpisode,
      minutes: row.minutes
    })),
    ...written.map((row) => ({
      kind: 'review' as const,
      id: `r-${row.id}`,
      at: row.at.toISOString(),
      actor: { username: row.username, displayName: row.displayName, avatarUrl: row.avatarUrl },
      media: {
        id: row.mediaId,
        title: row.title,
        coverImage: row.coverImage,
        source: row.source,
        mediaType: row.mediaType,
        externalId: row.externalId
      },
      /** Trecho, nao a review inteira: o feed convida a abrir, nao substitui. */
      excerpt: row.content.length > 240 ? `${row.content.slice(0, 237)}...` : row.content,
      containsSpoilers: row.containsSpoilers,
      rating: row.rating
    }))
  ];

  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const page = items.slice(0, PAGE_SIZE);
  const last = page.at(-1);

  return {
    items: page,
    nextCursor: items.length > PAGE_SIZE && last ? last.at : null
  };
}

/** Sugestoes para quem ainda nao segue ninguem. Publicos, com biblioteca,
 *  ordenados por tamanho: perfil vazio nao ajuda a decidir. */
export async function suggestUsers(
  db: Database,
  userId: string,
  limit = 5
): Promise<SuggestedUser[]> {
  const alreadyFollowing = db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const rows = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      entriesCount: count(mediaEntries.id)
    })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(mediaEntries, eq(mediaEntries.userId, users.id))
    .where(
      and(
        ne(users.id, userId),
        eq(userProfiles.isPrivate, false),
        sql`${users.deletedAt} is null`,
        sql`${users.usernameSetAt} is not null`,
        notInArray(users.id, alreadyFollowing)
      )
    )
    .groupBy(users.id, users.username, users.displayName, users.avatarUrl)
    .orderBy(desc(count(mediaEntries.id)))
    .limit(limit);

  return rows.filter((row) => row.entriesCount > 0);
}