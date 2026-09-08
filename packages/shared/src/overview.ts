import { z } from 'zod';
import { dropReasonSchema } from './enums';

export const genreStatSchema = z.object({
  name: z.string(),
  count: z.number(),
  /** Media das suas notas nas obras desse genero. Null quando nenhuma
   *  delas foi avaliada. */
  averageRating: z.number().nullable()
});

export const ratingBucketSchema = z.object({
  /** Faixa de 1 em 1 na escala de exibicao: 3 significa "de 3,0 a 3,9". */
  score: z.number(),
  count: z.number()
});

export const monthStatSchema = z.object({
  month: z.string(),
  episodes: z.number(),
  minutes: z.number()
});

export const affinitySchema = z.object({
  name: z.string(),
  imageUrl: z.string().nullable(),
  count: z.number(),
  averageRating: z.number()
});

export const dropReasonStatSchema = z.object({
  reason: dropReasonSchema,
  count: z.number()
});

export const overviewSchema = z.object({
  totalEntries: z.number(),
  ratedEntries: z.number(),
  /** Sua media contra a media publica das mesmas obras. Obra sem avg_score
   *  fica de fora dos dois lados, senao a comparacao distorce. */
  averageRating: z.number().nullable(),
  publicAverage: z.number().nullable(),
  genres: z.array(genreStatSchema),
  ratings: z.array(ratingBucketSchema),
  months: z.array(monthStatSchema),
  studios: z.array(affinitySchema),
  directors: z.array(affinitySchema),
  composers: z.array(affinitySchema),
  dropReasons: z.array(dropReasonStatSchema),
  /** Quantas afinidades ficaram de fora por falta de amostra. Mostrar isso
   *  e mais honesto que fingir que o ranking cobre tudo. */
  affinitiesBelowThreshold: z.number(),
  minSampleSize: z.number()
});

export const overviewQuerySchema = z.object({
  period: z.enum(['year', 'all']).default('all')
});

export type Overview = z.infer<typeof overviewSchema>;
export type GenreStat = z.infer<typeof genreStatSchema>;
export type Affinity = z.infer<typeof affinitySchema>;