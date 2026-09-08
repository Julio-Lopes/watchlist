import { z } from 'zod';
import { entryStatusSchema, mediaSourceSchema, mediaTypeSchema, badgeTierSchema } from './enums';
import { activityDaySchema } from './stats';

export const profileMediaSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  coverImage: z.string().nullable(),
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int(),
  userRating: z.number().nullable()
});

export const profileBadgeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  iconName: z.string().nullable(),
  tier: badgeTierSchema,
  earnedAt: z.iso.datetime()
});

export const publicProfileSchema = z.object({
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bannerImage: z.string().nullable(),
  bio: z.string().nullable(),
  joinedAt: z.iso.datetime(),

  totalEntries: z.number(),
  totalEpisodes: z.number(),
  totalMinutes: z.number(),
  averageRating: z.number().nullable(),
  currentStreak: z.number(),
  followers: z.number(),
  following: z.number(),
  reviewsCount: z.number(),

  favorites: z.array(profileMediaSchema),
  badges: z.array(profileBadgeSchema),
  /** Seis meses, nao 365: o perfil e vitrine, nao painel. */
  activity: z.array(activityDaySchema),

  /** Null para visitante anonimo. O botao de seguir some, em vez de
   *  aparecer e falhar. */
  isFollowing: z.boolean().nullable(),
  isSelf: z.boolean()
});

export const publicEntrySchema = profileMediaSchema.extend({
  status: entryStatusSchema,
  episodesWatched: z.number(),
  totalEpisodes: z.number().nullable()
});

export const publicEntriesSchema = z.object({
  items: z.array(publicEntrySchema),
  nextCursor: z.string().nullable()
});

export const publicReviewSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  containsSpoilers: z.boolean(),
  likesCount: z.number(),
  createdAt: z.iso.datetime(),
  rating: z.number().nullable(),
  media: profileMediaSchema
});

export const publicReviewsSchema = z.object({
  items: z.array(publicReviewSchema),
  nextCursor: z.string().nullable()
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicEntry = z.infer<typeof publicEntrySchema>;
export type PublicReview = z.infer<typeof publicReviewSchema>;
export type ProfileBadge = z.infer<typeof profileBadgeSchema>;