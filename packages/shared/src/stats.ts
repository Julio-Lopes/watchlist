import { z } from 'zod';

export const activityDaySchema = z.object({
  date: z.string(),
  episodes: z.number(),
  minutes: z.number()
});

export const activityStatsSchema = z.object({
  /** 365 dias, incluindo os vazios: o grid precisa de todas as celulas para
   *  desenhar as colunas na posicao certa. */
  days: z.array(activityDaySchema),
  currentStreak: z.number(),
  longestStreak: z.number(),
  longestStreakStart: z.string().nullable(),
  longestStreakEnd: z.string().nullable(),
  totalEpisodes: z.number(),
  totalMinutes: z.number(),
  activeDays: z.number()
});

export type ActivityDay = z.infer<typeof activityDaySchema>;
export type ActivityStats = z.infer<typeof activityStatsSchema>;