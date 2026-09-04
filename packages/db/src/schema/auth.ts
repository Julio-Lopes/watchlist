import { sql } from 'drizzle-orm';
import {
  char,
  index,
  inet,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { oauthProviderEnum, userRoleEnum } from './enums.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    /** Gravado sempre em minusculas. A URL publica e /u/<username>. */
    username: varchar('username', { length: 30 }).notNull(),
    /** Gravado sempre em minusculas: UNIQUE simples ja garante unicidade real. */
    email: varchar('email', { length: 255 }).notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** argon2id. NULL significa conta so por OAuth. */
    passwordHash: text('password_hash'),
    displayName: varchar('display_name', { length: 60 }),
    /** URL ja resolvida (preset ou upload), escrita junto com user_profiles. */
    avatarUrl: varchar('avatar_url', { length: 500 }),
    role: userRoleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    /** Soft delete: desativa a conta e mantem o username reservado.
     *  Exclusao da LGPD e hard delete, nao este campo. */
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (t) => [
    uniqueIndex('users_username_key').on(t.username),
    uniqueIndex('users_email_key').on(t.email),
    index('users_deleted_at_idx').on(t.deletedAt)
  ]
);

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderEnum('provider').notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('oauth_accounts_provider_account_key').on(t.provider, t.providerAccountId),
    index('oauth_accounts_user_id_idx').on(t.userId)
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    /** Hash SHA-256 do token que vai no cookie. Dump vazado nao vira sessao. */
    id: char('id', { length: 64 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** So atualizado apos 15 min: senao toda requisicao vira um UPDATE. */
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    ip: inet('ip'),
    userAgent: varchar('user_agent', { length: 300 })
  },
  (t) => [index('sessions_user_id_idx').on(t.userId), index('sessions_expires_at_idx').on(t.expiresAt)]
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    tokenHash: char('token_hash', { length: 64 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('email_verification_tokens_user_id_idx').on(t.userId)]
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    tokenHash: char('token_hash', { length: 64 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('password_reset_tokens_user_id_idx').on(t.userId)]
);

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256. A chave em claro aparece uma unica vez, na criacao. */
    keyHash: char('key_hash', { length: 64 }).notNull(),
    name: varchar('name', { length: 60 }).notNull(),
    scopes: text('scopes')
      .array()
      .notNull()
      .default(sql`ARRAY['read']::text[]`),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex('api_keys_key_hash_key').on(t.keyHash), index('api_keys_user_id_idx').on(t.userId)]
);