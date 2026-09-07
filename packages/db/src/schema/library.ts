import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { users } from './auth.js';
import { dropReasonEnum, entryStatusEnum } from './enums.js';
import { media } from './media.js';

export const mediaEntries = pgTable(
  'media_entries',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id),
    status: entryStatusEnum('status').notNull(),
    /** 10-100, nunca 0. No XML do MAL, my_score = 0 significa "sem nota":
     *  aceitar 0 como nota valida perderia dado no round-trip de exportacao. */
    userRating: smallint('user_rating'),
    episodesWatched: smallint('episodes_watched').notNull().default(0),
    rewatchCount: smallint('rewatch_count').notNull().default(0),
    isFavorite: boolean('is_favorite').notNull().default(false),
    dropReason: dropReasonEnum('drop_reason'),
    /** Privado. NUNCA exposto em rota publica, nem agregado. */
    notes: text('notes'),
    startedAt: date('started_at'),
    finishedAt: date('finished_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [
    uniqueIndex('media_entries_user_media_key').on(t.userId, t.mediaId),
    index('media_entries_user_status_idx').on(t.userId, t.status),
    index('media_entries_user_updated_idx').on(t.userId, t.updatedAt.desc()),
    check(
      'media_entries_user_rating_range',
      sql`${t.userRating} is null or (${t.userRating} between 10 and 100)`
    )
  ]
);

export const watchEvents = pgTable(
  'watch_events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaEntryId: uuid('media_entry_id')
      .notNull()
      .references(() => mediaEntries.id, { onDelete: 'cascade' }),
    episodesDelta: smallint('episodes_delta').notNull().default(1),
    isRewatch: boolean('is_rewatch').notNull().default(false),
    /** Qual episodio foi. Nulo no historico anterior a esta coluna e em
     *  obras sem numeracao. O diario mostra quando existe e omite quando nao:
     *  deduzir por contagem erra em rewatch e depois de exclusao. */
    episodeNumber: smallint('episode_number'),
    /** Data local do usuario, calculada pela API a partir do timezone do perfil.
     *  O cliente manda a intencao, nunca a data: senao qualquer um forja streak. */
    watchedOn: date('watched_on').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('watch_events_user_watched_idx').on(t.userId, t.watchedOn.desc()),
    index('watch_events_media_entry_idx').on(t.mediaEntryId)
  ]
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaEntryId: uuid('media_entry_id')
      .notNull()
      .references(() => mediaEntries.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    containsSpoilers: boolean('contains_spoilers').notNull().default(false),
    /** Atualizado na MESMA transacao do like. Ver social.ts. */
    likesCount: integer('likes_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [
    uniqueIndex('reviews_media_entry_key').on(t.mediaEntryId),
    index('reviews_user_created_idx').on(t.userId, t.createdAt.desc())
  ]
);

export const userTags = pgTable(
  'user_tags',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 30 }).notNull(),
    color: varchar('color', { length: 7 }),
    isPublic: boolean('is_public').notNull().default(false)
  },
  (t) => [uniqueIndex('user_tags_user_name_key').on(t.userId, sql`lower(${t.name})`)]
);

export const mediaEntryTags = pgTable(
  'media_entry_tags',
  {
    mediaEntryId: uuid('media_entry_id')
      .notNull()
      .references(() => mediaEntries.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => userTags.id, { onDelete: 'cascade' })
  },
  (t) => [
    primaryKey({ columns: [t.mediaEntryId, t.tagId] }),
    index('media_entry_tags_tag_idx').on(t.tagId)
  ]
);

export const collections = pgTable(
  'collections',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 60 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    coverImage: varchar('cover_image', { length: 500 }),
    isPublic: boolean('is_public').notNull().default(true),
    isRanked: boolean('is_ranked').notNull().default(false),
    itemCount: smallint('item_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [
    uniqueIndex('collections_user_slug_key').on(t.userId, t.slug),
    index('collections_user_idx').on(t.userId)
  ]
);

export const collectionItems = pgTable(
  'collection_items',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id),
    /** Fractional indexing: soltar entre 1 e 2 grava 1.5, sem renumerar vizinhos.
     *  numeric sem precisao declarada; o driver devolve string em JS. */
    position: numeric('position').notNull().default('0'),
    note: text('note'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('collection_items_collection_media_key').on(t.collectionId, t.mediaId),
    index('collection_items_collection_position_idx').on(t.collectionId, t.position)
  ]
);