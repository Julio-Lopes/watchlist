import {
  type Database,
  media,
  mediaEntries,
  reviewLikes,
  reviews,
  userProfiles,
  users
} from '@watchlist/db';
import type { Review } from '@watchlist/shared';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { conflict, notFound, unprocessable } from '../lib/errors.js';

const PAGE_SIZE = 10;

export async function writeReview(
  db: Database,
  userId: string,
  entryId: string,
  content: string,
  containsSpoilers: boolean
): Promise<string> {
  const [entry] = await db
    .select({ id: mediaEntries.id, status: mediaEntries.status })
    .from(mediaEntries)
    .where(and(eq(mediaEntries.id, entryId), eq(mediaEntries.userId, userId)))
    .limit(1);

  if (!entry) throw notFound('Entrada nao encontrada.');

  /** Nao exige ter concluido: largar no episodio tres e escrever por que
   *  e um uso legitimo, e o drop_reason so guarda a categoria. */
  if (entry.status === 'planning') {
    throw unprocessable('Assista pelo menos um episódio antes de escrever.');
  }

  /** UNIQUE (media_entry_id) desde a Etapa 1: uma review por obra por pessoa.
   *  Escrever de novo substitui, em vez de criar uma segunda. */
  const [row] = await db
    .insert(reviews)
    .values({ userId, mediaEntryId: entryId, content, containsSpoilers })
    .onConflictDoUpdate({
      target: reviews.mediaEntryId,
      set: { content, containsSpoilers, updatedAt: new Date() }
    })
    .returning({ id: reviews.id });

  if (!row) throw new Error('upsert de review nao retornou linha');

  return row.id;
}

export async function listReviews(
  db: Database,
  mediaId: string,
  viewerId: string | null,
  sort: 'likes' | 'recent',
  cursor?: string
): Promise<{ items: Review[]; nextCursor: string | null; total: number }> {
  const filters = [eq(mediaEntries.mediaId, mediaId), eq(userProfiles.isPrivate, false)];

  if (cursor) {
    const [primary, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');

    if (primary && id) {
      /** Cursor composto porque likes empatam com frequencia: sem o id como
       *  desempate, a pagina seguinte repetiria ou pularia linhas. */
      const after =
        sort === 'likes'
          ? or(
              lt(reviews.likesCount, Number(primary)),
              and(eq(reviews.likesCount, Number(primary)), lt(reviews.id, id))
            )
          : or(
              lt(reviews.createdAt, new Date(primary)),
              and(eq(reviews.createdAt, new Date(primary)), lt(reviews.id, id))
            );

      if (after) filters.push(after);
    }
  }

  const rows = await db
    .select({
      id: reviews.id,
      content: reviews.content,
      containsSpoilers: reviews.containsSpoilers,
      likesCount: reviews.likesCount,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      rating: mediaEntries.userRating,
      userId: reviews.userId,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      likedByViewer: viewerId
        ? sql<boolean>`exists (select 1 from review_likes l where l.review_id = ${reviews.id} and l.user_id = ${viewerId})`
        : sql<boolean>`false`
    })
    .from(reviews)
    .innerJoin(mediaEntries, eq(mediaEntries.id, reviews.mediaEntryId))
    .innerJoin(users, eq(users.id, reviews.userId))
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(...filters))
    .orderBy(
      ...(sort === 'likes'
        ? [desc(reviews.likesCount), desc(reviews.id)]
        : [desc(reviews.createdAt), desc(reviews.id)])
    )
    .limit(PAGE_SIZE + 1);

  const [counted] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(reviews)
    .innerJoin(mediaEntries, eq(mediaEntries.id, reviews.mediaEntryId))
    .innerJoin(userProfiles, eq(userProfiles.userId, reviews.userId))
    .where(and(eq(mediaEntries.mediaId, mediaId), eq(userProfiles.isPrivate, false)));

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = page.at(-1);

  const nextCursor =
    hasMore && last
      ? Buffer.from(
          `${sort === 'likes' ? last.likesCount : last.createdAt.toISOString()}|${last.id}`
        ).toString('base64url')
      : null;

  return {
    items: page.map((row) => ({
      id: row.id,
      content: row.content,
      containsSpoilers: row.containsSpoilers,
      likesCount: row.likesCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      rating: row.rating,
      author: {
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl
      },
      likedByViewer: viewerId ? row.likedByViewer : null,
      isOwner: row.userId === viewerId
    })),
    nextCursor,
    total: counted?.total ?? 0
  };
}

export async function setLike(
  db: Database,
  userId: string,
  reviewId: string,
  liked: boolean
): Promise<number> {
  return db.transaction(async (tx) => {
    const [review] = await tx
      .select({ userId: reviews.userId })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!review) throw notFound('Review nao encontrada.');

    /** Nao por moralismo: o numero perde significado se cada um comeca com um. */
    if (review.userId === userId) {
      throw conflict('Você não pode curtir a própria review.');
    }

    const changed = liked
      ? (
          await tx
            .insert(reviewLikes)
            .values({ userId, reviewId })
            .onConflictDoNothing()
            .returning({ userId: reviewLikes.userId })
        ).length
      : (
          await tx
            .delete(reviewLikes)
            .where(and(eq(reviewLikes.userId, userId), eq(reviewLikes.reviewId, reviewId)))
            .returning({ userId: reviewLikes.userId })
        ).length;

    if (changed === 0) {
      const [current] = await tx
        .select({ likesCount: reviews.likesCount })
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);

      return current?.likesCount ?? 0;
    }

    /** likes_count na mesma transacao do like. Denormalizacao deliberada da
     *  Etapa 1: contar review_likes a cada listagem seria um count por review. */
    const [updated] = await tx
      .update(reviews)
      .set({
        likesCount: liked
          ? sql`${reviews.likesCount} + 1`
          : sql`greatest(0, ${reviews.likesCount} - 1)`
      })
      .where(eq(reviews.id, reviewId))
      .returning({ likesCount: reviews.likesCount });

    return updated?.likesCount ?? 0;
  });
}

export async function findMediaId(
  db: Database,
  source: 'anilist' | 'tmdb' | 'mal',
  mediaType: 'anime' | 'show' | 'movie',
  externalId: number
): Promise<string | null> {
  const [row] = await db
    .select({ id: media.id })
    .from(media)
    .where(
      and(
        eq(media.source, source),
        eq(media.mediaType, mediaType),
        eq(media.externalId, externalId)
      )
    )
    .limit(1);

  return row?.id ?? null;
}