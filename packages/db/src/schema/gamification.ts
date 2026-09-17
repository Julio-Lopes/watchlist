import type { BadgeCriteria, BadgeProgress } from '@watchlist/shared';
import { boolean, jsonb, pgTable, primaryKey, smallint, index, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { users } from './auth.js';
import { badgeTierEnum } from './enums.js';

export const badges = pgTable(
  'badges',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    slug: varchar('slug', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    /** Nome do icone em lucide-react. Precisa existir no inventario de icones. */
    iconName: varchar('icon_name', { length: 50 }),
    tier: badgeTierEnum('tier').notNull(),
    /** Criterio tipado, avaliado em codigo. Nunca SQL cru em coluna. */
    criteria: jsonb('criteria').$type<BadgeCriteria>().notNull(),
    isSecret: boolean('is_secret').notNull().default(false),
    sortOrder: smallint('sort_order'),
    isActive: boolean('is_active').notNull().default(true)
  },
  (t) => [uniqueIndex('badges_slug_key').on(t.slug)]
);

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: uuid('badge_id')
      .notNull()
      .references(() => badges.id),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
    progress: jsonb('progress').$type<BadgeProgress>(),
    /** Nulo ate a pessoa ver. O job concede em silencio e a proxima tela
     *  mostra o aviso, sem precisar de sistema de notificacao. */
    seenAt: timestamp('seen_at', { withTimezone: true })
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.badgeId] }),
    /** Raridade da badge conta usuarios por badge_id, o inverso da PK. */
    index('user_badges_badge_idx').on(t.badgeId)
  ]
);