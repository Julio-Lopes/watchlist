import { z } from 'zod';
import { seasonSchema } from './enums';
import { mediaSummarySchema } from './media';

export const seasonEntrySchema = mediaSummarySchema.extend({
  /** 0 a 6, domingo a sabado, no fuso de Toquio. Null quando a fonte nao
   *  informa o dia de exibicao, comum em temporada futura. */
  airingWeekday: z.number().nullable(),
  /** Data de estreia, para obra que ainda nao comecou. */
  startDate: z.string().nullable(),
  bannerImage: z.string().nullable(),
  /** Se o viewer ja tem na biblioteca. Null para anonimo. */
  inLibrary: z.boolean().nullable()
});

export const seasonResponseSchema = z.object({
  year: z.number(),
  season: seasonSchema,
  items: z.array(seasonEntrySchema),
  hasMore: z.boolean(),
  inLibraryCount: z.number(),
  /** A fonte pode responder 504 quando o MyAnimeList esta fora. Sem este
   *  campo, falha e lista vazia ficam indistinguiveis na tela. */
  degraded: z.boolean()
});

export const scheduleEntrySchema = z.object({
  /** Dia da semana em Toquio, 0 a 6. O Jikan devolve o dia nominal do
   *  broadcast, nao uma data: o calendario semanal e o que ele oferece. */
  weekday: z.number(),
  /** "23:30" no fuso do Japao, quando a fonte informa. */
  time: z.string().nullable(),
  inLibrary: z.boolean().nullable(),
  media: mediaSummarySchema
});

export const scheduleResponseSchema = z.object({
  items: z.array(scheduleEntrySchema),
  degraded: z.boolean()
});

export const seasonQuerySchema = z.object({
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  season: seasonSchema.optional(),
  page: z.coerce.number().int().min(1).max(10).default(1),
  scope: z.enum(['all', 'mine']).default('all')
});

export const scheduleQuerySchema = z.object({
  scope: z.enum(['all', 'mine']).default('all')
});

export type SeasonEntry = z.infer<typeof seasonEntrySchema>;
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;