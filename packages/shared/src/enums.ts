import { z } from 'zod';

export const MEDIA_SOURCES = ['anilist', 'tmdb'] as const;
export const MEDIA_TYPES = ['anime', 'show', 'movie'] as const;
export const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
export const AIRING_STATUSES = ['airing', 'finished', 'not_yet_released', 'cancelled'] as const;
export const ENTRY_STATUSES = ['watching', 'completed', 'dropped', 'planning', 'paused'] as const;
export const DROP_REASONS = ['pacing', 'characters', 'art', 'plot', 'no_time', 'other'] as const;
export const CREDIT_ROLES = [
  'studio',
  'director',
  'writer',
  'composer',
  'character_design',
  'original_creator',
  'producer',
  'voice',
  'cast'
] as const;
export const PERSON_KINDS = ['person', 'studio'] as const;
export const USER_ROLES = ['user', 'admin'] as const;
export const OAUTH_PROVIDERS = ['google'] as const;
export const JOB_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export const RATING_SCALES = ['ten', 'hundred', 'stars'] as const;
export const SPOILER_MODES = ['off', 'soft', 'strict'] as const;

export const mediaSourceSchema = z.enum(MEDIA_SOURCES);
export const mediaTypeSchema = z.enum(MEDIA_TYPES);
export const seasonSchema = z.enum(SEASONS);
export const airingStatusSchema = z.enum(AIRING_STATUSES);
export const entryStatusSchema = z.enum(ENTRY_STATUSES);
export const dropReasonSchema = z.enum(DROP_REASONS);
export const creditRoleSchema = z.enum(CREDIT_ROLES);
export const personKindSchema = z.enum(PERSON_KINDS);
export const userRoleSchema = z.enum(USER_ROLES);
export const oauthProviderSchema = z.enum(OAUTH_PROVIDERS);
export const jobStatusSchema = z.enum(JOB_STATUSES);
export const ratingScaleSchema = z.enum(RATING_SCALES);
export const spoilerModeSchema = z.enum(SPOILER_MODES);

export type MediaSource = z.infer<typeof mediaSourceSchema>;
export type MediaType = z.infer<typeof mediaTypeSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type AiringStatus = z.infer<typeof airingStatusSchema>;
export type EntryStatus = z.infer<typeof entryStatusSchema>;
export type DropReason = z.infer<typeof dropReasonSchema>;
export type CreditRole = z.infer<typeof creditRoleSchema>;
export type PersonKind = z.infer<typeof personKindSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type RatingScale = z.infer<typeof ratingScaleSchema>;
export type SpoilerMode = z.infer<typeof spoilerModeSchema>;
export const BADGE_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export const AVATAR_TYPES = ['custom', 'preset'] as const;
export const PROFILE_THEMES = ['cinema', 'manga', 'retro'] as const;

export const badgeTierSchema = z.enum(BADGE_TIERS);
export const avatarTypeSchema = z.enum(AVATAR_TYPES);
export const profileThemeSchema = z.enum(PROFILE_THEMES);

export type BadgeTier = z.infer<typeof badgeTierSchema>;
export type AvatarType = z.infer<typeof avatarTypeSchema>;
export type ProfileTheme = z.infer<typeof profileThemeSchema>;

export const RESERVED_USERNAMES = new Set([
  'api', 'admin', 'u', 'c', 'media', 'ranking', 'calendario', 'config',
  'auth', 'login', 'logout', 'about', 'terms', 'privacy', 'settings', 'public'
]);

/** Prefixo dos usernames temporarios de onboarding. Bloqueado no cadastro:
 *  assim um "user-" em producao e sinal de bug, nunca coincidencia. */
export const PLACEHOLDER_USERNAME_PREFIX = 'user-';
