import { z } from 'zod';
import { dropReasonSchema, entryStatusSchema, mediaSourceSchema, mediaTypeSchema, type EntryStatus, type MediaType } from './enums';
import { mediaSummarySchema } from './media';

export const createEntrySchema = z.object({
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int().positive(),
  status: entryStatusSchema.default('planning'),
  /** Progresso na criacao: quem ja estava no episodio 47 antes de conhecer o
   *  app nao vai clicar 47 vezes. Ignorado quando o status e 'planning'. */
  episodesWatched: z.int().min(0).max(10_000).optional()
});

export const updateEntrySchema = z.object({
  status: entryStatusSchema.optional(),
  /** 10 a 100. null limpa a nota; 0 nao existe, ver decisao da Etapa 1. */
  userRating: z.int().min(10).max(100).nullable().optional(),
  episodesWatched: z.int().min(0).max(10_000).optional(),
  isFavorite: z.boolean().optional(),
  dropReason: dropReasonSchema.nullable().optional(),
  notes: z.string().max(5000).nullable().optional()
});

/** O cliente manda a intencao, nunca a data. A API calcula watched_on a partir
 *  do timezone do perfil: aceitar data do cliente permitiria forjar streak,
 *  que e a metrica mais visivel do produto. */
export const progressSchema = z.object({
  delta: z.union([z.literal(1), z.literal(-1)])
});

export const entryTagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.string().nullable()
});

export const entrySchema = z.object({
  id: z.uuid(),
  status: entryStatusSchema,
  userRating: z.number().nullable(),
  episodesWatched: z.number(),
  rewatchCount: z.number(),
  isFavorite: z.boolean(),
  dropReason: dropReasonSchema.nullable(),
  notes: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  updatedAt: z.iso.datetime(),
  media: mediaSummarySchema.extend({ id: z.uuid() }),
  tags: z.array(entryTagSchema)
});

export const entryListQuerySchema = z.object({
  status: entryStatusSchema.optional(),
  type: mediaTypeSchema.optional(),
  tagId: z.uuid().optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(['recent', 'title', 'rating']).default('recent'),
  cursor: z.string().max(200).optional()
});

export const entryListSchema = z.object({
  items: z.array(entrySchema),
  nextCursor: z.string().nullable()
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(30),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .nullable()
    .optional(),
  isPublic: z.boolean().default(false)
});

export const tagSchema = entryTagSchema.extend({ isPublic: z.boolean() });
export const setEntryTagsSchema = z.object({ tagIds: z.array(z.uuid()).max(10) });

export const entryCountsSchema = z.object({
  /** Parcial de proposito: status sem nenhuma entrada nao volta do group by,
   *  e inventar zero para todos seria afirmar o que o banco nao disse. */
  byStatus: z.record(z.string(), z.number()),
  byType: z.record(z.string(), z.number()),
  total: z.number()
});

export const featuredMediaSchema = z.object({
  title: z.string(),
  bannerImage: z.string(),
  year: z.number().nullable(),
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int()
});

export type Entry = z.infer<typeof entrySchema>;
export type EntryTag = z.infer<typeof tagSchema>;
export type EntryListQuery = z.infer<typeof entryListQuerySchema>;
export type EntryCounts = {
  byStatus: Partial<Record<EntryStatus, number>>;
  byType: Partial<Record<MediaType, number>>;
  total: number;
};
export type FeaturedMedia = z.infer<typeof featuredMediaSchema>;