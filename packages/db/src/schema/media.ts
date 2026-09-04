import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import {
  airingStatusEnum,
  creditRoleEnum,
  mediaSourceEnum,
  mediaTypeEnum,
  personKindEnum,
  seasonEnum
} from './enums.js';

export const media = pgTable(
  'media',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    source: mediaSourceEnum('source').notNull(),
    externalId: integer('external_id').notNull(),
    /** Necessario para exportar ao MAL. Gravado desde a Etapa 4: a AniList
     *  entrega idMal na mesma query, e descobrir depois custa dias de rate limit. */
    malId: integer('mal_id'),
    /** Necessario para exportar ao Letterboxd. */
    imdbId: varchar('imdb_id', { length: 20 }),
    mediaType: mediaTypeEnum('media_type').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    titleOriginal: varchar('title_original', { length: 200 }),
    /** So o primeiro paragrafo. Os 0,5 GB do Neon sao o numero mais apertado
     *  da stack e esta e a tabela que cresce sozinha. Ver secao 3.2. */
    synopsis: text('synopsis'),
    coverImage: varchar('cover_image', { length: 500 }),
    bannerImage: varchar('banner_image', { length: 500 }),
    genres: text('genres').array(),
    year: smallint('year'),
    season: seasonEnum('season'),
    totalEpisodes: smallint('total_episodes'),
    episodeDuration: smallint('episode_duration'),
    /** 0-100. TMDB entrega 0-10 com decimal: normalize na Etapa 4. */
    avgScore: smallint('avg_score'),
    popularity: integer('popularity'),
    airingStatus: airingStatusEnum('airing_status'),
    /** Spoiler estrutural: filtrado no modo strict. */
    hasSequel: boolean('has_sequel').notNull().default(false),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    /** media_type entra na chave porque o TMDB usa espacos de ID independentes:
     *  o filme 550 e a serie 550 sao entidades diferentes. */
    uniqueIndex('media_source_type_external_key').on(t.source, t.mediaType, t.externalId),
    index('media_type_popularity_idx').on(t.mediaType, t.popularity.desc()),
    index('media_mal_id_idx')
      .on(t.malId)
      .where(sql`${t.malId} is not null`),
    index('media_genres_idx').using('gin', t.genres)
  ]
);

export const people = pgTable(
  'people',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    source: mediaSourceEnum('source').notNull(),
    externalId: integer('external_id').notNull(),
    kind: personKindEnum('kind').notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    nameNative: varchar('name_native', { length: 150 }),
    imageUrl: varchar('image_url', { length: 500 }),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('people_source_external_kind_key').on(t.source, t.externalId, t.kind),
    index('people_name_idx').on(t.name)
  ]
);

export const mediaCredits = pgTable(
  'media_credits',
  {
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    role: creditRoleEnum('role').notNull(),
    isMain: boolean('is_main').notNull().default(false)
  },
  (t) => [
    primaryKey({ columns: [t.mediaId, t.personId, t.role] }),
    index('media_credits_person_role_idx').on(t.personId, t.role)
  ]
);

export const airingSchedule = pgTable(
  'airing_schedule',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    episodeNumber: smallint('episode_number').notNull(),
    /** NULL em anime, onde cada temporada ja e um registro em media.
     *  Obrigatorio para series do TMDB, que modelam a serie inteira num registro. */
    seasonNumber: smallint('season_number'),
    airingAt: timestamp('airing_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
  },
  (t) => [
    /** nullsNotDistinct e o que torna o airing.sync idempotente. Sem ele, o
     *  Postgres trata cada NULL de season_number como valor distinto e o cron
     *  insere o mesmo episodio de anime todo dia. */
    unique('airing_schedule_media_season_episode_key')
      .on(t.mediaId, t.seasonNumber, t.episodeNumber)
      .nullsNotDistinct(),
    index('airing_schedule_airing_at_idx').on(t.airingAt)
  ]
);