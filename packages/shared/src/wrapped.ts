import { z } from 'zod';
import { mediaSourceSchema, mediaTypeSchema } from './enums';
import { activityDaySchema } from './stats';

const highlightSchema = z.object({
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int(),
  title: z.string(),
  coverImage: z.string().nullable(),
  userRating: z.number().nullable(),
  episodes: z.number()
});

export const wrappedSchema = z.object({
  year: z.number(),
  /** Ano corrente aparece como "ate agora": mostrar 2026 fechado em setembro
   *  seria mentira. */
  partial: z.boolean(),
  owner: z.object({
    username: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable()
  }),

  totalEpisodes: z.number(),
  totalMinutes: z.number(),
  activeDays: z.number(),
  completedCount: z.number(),
  longestStreak: z.number(),
  averageRating: z.number().nullable(),
  publicAverage: z.number().nullable(),

  topGenre: z.string().nullable(),
  topGenreCount: z.number(),
  busiestMonth: z.number().nullable(),
  busiestMonthEpisodes: z.number(),

  /** Ate cinco, ordenadas por nota: e o que a pessoa mostra para os outros. */
  highlights: z.array(highlightSchema),
  /** A obra com mais episodios assistidos no ano, que nem sempre e a mais
   *  bem avaliada. */
  mostWatched: highlightSchema.nullable(),

  activity: z.array(activityDaySchema)
});

export type Wrapped = z.infer<typeof wrappedSchema>;