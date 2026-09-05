import { z } from 'zod';
import { mediaTypeSchema } from './enums';

/**
 * Nunca SQL cru em coluna: seria injecao por design e impossivel de testar.
*/
export const badgeCriteriaSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('episodes_total'), threshold: z.int().positive() }),
  z.object({
    type: z.literal('entries_completed'),
    threshold: z.int().positive(),
    mediaType: mediaTypeSchema.optional()
  }),
  z.object({ type: z.literal('reviews_written'), threshold: z.int().positive() }),
  z.object({ type: z.literal('streak_days'), threshold: z.int().positive() }),
  z.object({
    type: z.literal('genre_count'),
    genre: z.string().min(1),
    threshold: z.int().positive()
  }),
  z.object({ type: z.literal('rating_variance'), minVariance: z.number().positive() }),
  z.object({ type: z.literal('single_day_episodes'), threshold: z.int().positive() }),
  z.object({ type: z.literal('night_owl'), threshold: z.int().positive() }),
  z.object({ type: z.literal('season_complete'), threshold: z.int().positive() })
]);

export type BadgeCriteria = z.infer<typeof badgeCriteriaSchema>;

/** Progresso parcial exibido antes de conquistar a badge. */
export const badgeProgressSchema = z.object({
  current: z.number(),
  target: z.number()
});

export type BadgeProgress = z.infer<typeof badgeProgressSchema>;

/** Handles, nao URLs. A URL completa e montada na renderizacao. */
export const socialLinksSchema = z.object({
  twitter: z.string().max(50).optional(),
  github: z.string().max(50).optional(),
  letterboxd: z.string().max(50).optional(),
  anilist: z.string().max(50).optional(),
  mal: z.string().max(50).optional()
});

export type SocialLinks = z.infer<typeof socialLinksSchema>;
