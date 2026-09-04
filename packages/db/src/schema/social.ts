import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { reviews } from './library.js';

/** Sem tabela de feed. O feed e derivado de watch_events e reviews de quem
 *  voce segue, com cursor. Fan-out on write so se paga com dezenas de
 *  milhares de usuarios ativos. */
export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index('follows_following_idx').on(t.followingId),
    check('follows_no_self', sql`${t.followerId} <> ${t.followingId}`)
  ]
);

export const reviewLikes = pgTable(
  'review_likes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.reviewId] }),
    index('review_likes_review_idx').on(t.reviewId)
  ]
);