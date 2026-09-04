import { pgEnum } from 'drizzle-orm/pg-core';
import {
  AIRING_STATUSES,
  AVATAR_TYPES,
  BADGE_TIERS,
  CREDIT_ROLES,
  DROP_REASONS,
  ENTRY_STATUSES,
  JOB_STATUSES,
  MEDIA_SOURCES,
  MEDIA_TYPES,
  OAUTH_PROVIDERS,
  PERSON_KINDS,
  PROFILE_THEMES,
  RATING_SCALES,
  SEASONS,
  SPOILER_MODES,
  USER_ROLES
} from '@watchlist/shared';

/** Os enums do Postgres nascem das mesmas constantes que os schemas Zod.
 *  Divergencia entre validacao e banco deixa de ser possivel. */
export const mediaSourceEnum = pgEnum('media_source', MEDIA_SOURCES);
export const mediaTypeEnum = pgEnum('media_type', MEDIA_TYPES);
export const seasonEnum = pgEnum('season', SEASONS);
export const airingStatusEnum = pgEnum('airing_status', AIRING_STATUSES);
export const entryStatusEnum = pgEnum('entry_status', ENTRY_STATUSES);
export const dropReasonEnum = pgEnum('drop_reason', DROP_REASONS);
export const creditRoleEnum = pgEnum('credit_role', CREDIT_ROLES);
export const personKindEnum = pgEnum('person_kind', PERSON_KINDS);
export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const oauthProviderEnum = pgEnum('oauth_provider', OAUTH_PROVIDERS);
export const jobStatusEnum = pgEnum('job_status', JOB_STATUSES);
export const ratingScaleEnum = pgEnum('rating_scale', RATING_SCALES);
export const spoilerModeEnum = pgEnum('spoiler_mode', SPOILER_MODES);
export const badgeTierEnum = pgEnum('badge_tier', BADGE_TIERS);
export const avatarTypeEnum = pgEnum('avatar_type', AVATAR_TYPES);
export const profileThemeEnum = pgEnum('profile_theme', PROFILE_THEMES);