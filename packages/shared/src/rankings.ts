import { z } from 'zod';
import { mediaSourceSchema, mediaTypeSchema } from './enums';

export const rankingKindSchema = z.enum(['rating', 'watched', 'dropped', 'trending']);

export const rankingItemSchema = z.object({
  position: z.number(),
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int(),
  title: z.string(),
  coverImage: z.string().nullable(),
  year: z.number().nullable(),
  totalEpisodes: z.number().nullable(),
  /** O numero que ordena, na unidade do criterio: nota de 0 a 10, contagem
   *  de pessoas, ou porcentagem. */
  value: z.number(),
  /** Tamanho da amostra por item. Sem isso, "9.4" nao diz se veio de cinco
   *  ou de cinco mil pessoas. */
  sample: z.number()
});

export const rankingBoardSchema = z.object({
  kind: rankingKindSchema,
  items: z.array(rankingItemSchema),
  /** Quantas obras entraram no criterio. Com poucos usuarios o numero e
   *  pequeno, e esconder isso seria desonesto. */
  eligible: z.number()
});

export const rankingsResponseSchema = z.object({
  boards: z.array(rankingBoardSchema),
  minSample: z.number()
});

export const rankingsQuerySchema = z.object({
  type: mediaTypeSchema.optional(),
  kind: rankingKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(3)
});

export type RankingItem = z.infer<typeof rankingItemSchema>;
export type RankingBoard = z.infer<typeof rankingBoardSchema>;
export type RankingKind = z.infer<typeof rankingKindSchema>;