import type { SocialLinks } from '@watchlist/shared';
import { boolean, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { avatarTypeEnum, profileThemeEnum, ratingScaleEnum, spoilerModeEnum } from './enums.js';
import { badges } from './gamification.js';

export const presetAvatars = pgTable('preset_avatars', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  category: varchar('category', { length: 50 }),
  isPremium: boolean('is_premium').notNull().default(false)
});

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bannerUrl: varchar('banner_url', { length: 500 }),
  avatarType: avatarTypeEnum('avatar_type').notNull().default('preset'),
  avatarPresetId: varchar('avatar_preset_id', { length: 50 }).references(() => presetAvatars.id),
  /** Markdown, sanitizado ANTES de gravar. Sanitizar so no render entrega
   *  HTML hostil pela API publica da Etapa 23. */
  bio: text('bio'),
  theme: profileThemeEnum('theme').notNull().default('cinema'),
  featuredBadgeId: uuid('featured_badge_id').references(() => badges.id),
  socialLinks: jsonb('social_links').$type<SocialLinks>(),
  /** Padrao publico, com divulgacao explicita no cadastro. Ver secao 13. */
  isPrivate: boolean('is_private').notNull().default(false),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Sao_Paulo'),
  ratingScale: ratingScaleEnum('rating_scale').notNull().default('ten'),
  spoilerMode: spoilerModeEnum('spoiler_mode').notNull().default('soft'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});