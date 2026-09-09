import { z } from 'zod';
import { mediaSourceSchema, mediaTypeSchema } from './enums';

export const collectionItemSchema = z.object({
  mediaId: z.uuid(),
  position: z.string(),
  /** Onde a curadoria acontece: sem isso, lista ranqueada e so uma ordem. */
  note: z.string().nullable(),
  title: z.string(),
  coverImage: z.string().nullable(),
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int(),
  totalEpisodes: z.number().nullable(),
  episodeDuration: z.number().nullable(),
  /** Nota do dono da colecao, se ele tiver a obra na biblioteca. */
  ownerRating: z.number().nullable()
});

export const collectionSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isPublic: z.boolean(),
  isRanked: z.boolean(),
  itemCount: z.number(),
  updatedAt: z.iso.datetime(),
  coverImage: z.string().nullable(),
  covers: z.array(z.string())
});

export const collectionDetailSchema = collectionSummarySchema.extend({
  owner: z.object({
    username: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable()
  }),
  totalEpisodes: z.number(),
  totalMinutes: z.number(),
  items: z.array(collectionItemSchema),
  isOwner: z.boolean()
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().default(true),
  isRanked: z.boolean().default(false),
  cover: z
    .object({
      source: mediaSourceSchema,
      mediaType: mediaTypeSchema,
      externalId: z.int().positive()
    })
    .nullable()
    .optional()
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
  isRanked: z.boolean().optional(),
  cover: z
    .object({
      source: mediaSourceSchema,
      mediaType: mediaTypeSchema,
      externalId: z.int().positive()
    })
    .nullable()
    .optional()
});

export const addItemSchema = z.object({
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int().positive(),
  note: z.string().max(300).nullable().optional()
});

export const updateItemSchema = z.object({
  note: z.string().max(300).nullable().optional(),
  /** Fractional indexing: a API recebe os vizinhos e calcula a posicao entre
   *  eles, sem renumerar a lista inteira. */
  afterMediaId: z.uuid().nullable().optional(),
  beforeMediaId: z.uuid().nullable().optional()
});

export type CollectionSummary = z.infer<typeof collectionSummarySchema>;
export type CollectionDetail = z.infer<typeof collectionDetailSchema>;
export type CollectionItem = z.infer<typeof collectionItemSchema>;