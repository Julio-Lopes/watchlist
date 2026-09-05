import { z } from 'zod';
import {
  airingStatusSchema,
  creditRoleSchema,
  mediaSourceSchema,
  mediaTypeSchema,
  seasonSchema
} from './enums';

/** Identidade externa. A URL publica e /media/[source]/[type]/[id],
 *  entao a busca nao precisa de id local e nao grava nada. */
export const mediaRefSchema = z.object({
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int()
});

export const mediaSummarySchema = mediaRefSchema.extend({
  title: z.string(),
  coverImage: z.string().nullable(),
  year: z.number().nullable(),
  avgScore: z.number().nullable(),
  totalEpisodes: z.number().nullable()
});

export const mediaCreditSchema = z.object({
  role: creditRoleSchema,
  name: z.string(),
  imageUrl: z.string().nullable(),
  isMain: z.boolean()
});

export const mediaDetailSchema = mediaRefSchema.extend({
  id: z.uuid(),
  malId: z.number().nullable(),
  imdbId: z.string().nullable(),
  title: z.string(),
  titleOriginal: z.string().nullable(),
  synopsis: z.string().nullable(),
  coverImage: z.string().nullable(),
  bannerImage: z.string().nullable(),
  genres: z.array(z.string()),
  year: z.number().nullable(),
  season: seasonSchema.nullable(),
  totalEpisodes: z.number().nullable(),
  episodeDuration: z.number().nullable(),
  avgScore: z.number().nullable(),
  popularity: z.number().nullable(),
  airingStatus: airingStatusSchema.nullable(),
  hasSequel: z.boolean(),
  credits: z.array(mediaCreditSchema),
  /** true quando a fonte externa esta fora e servimos o que ja estava salvo. */
  stale: z.boolean()
});

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Digite ao menos 2 caracteres.').max(100),
  type: mediaTypeSchema.optional(),
  page: z.coerce.number().int().min(1).max(20).default(1)
});

export const searchResponseSchema = z.object({
  results: z.array(mediaSummarySchema),
  /** Fontes que falharam nesta busca. O produto segue com o que respondeu. */
  degraded: z.array(mediaSourceSchema)
});

export type MediaSummary = z.infer<typeof mediaSummarySchema>;
export type MediaCredit = z.infer<typeof mediaCreditSchema>;
export type MediaDetail = z.infer<typeof mediaDetailSchema>;
