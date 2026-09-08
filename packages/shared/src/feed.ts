import { z } from 'zod';
import { mediaSourceSchema, mediaTypeSchema } from './enums';

const actorSchema = z.object({
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable()
});

const feedMediaSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  coverImage: z.string().nullable(),
  source: mediaSourceSchema,
  mediaType: mediaTypeSchema,
  externalId: z.int()
});

export const feedItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('watched'),
    id: z.string(),
    at: z.iso.datetime(),
    actor: actorSchema,
    media: feedMediaSchema,
    episodes: z.number(),
    firstEpisode: z.number().nullable(),
    lastEpisode: z.number().nullable(),
    minutes: z.number()
  }),
  z.object({
    kind: z.literal('review'),
    id: z.string(),
    at: z.iso.datetime(),
    actor: actorSchema,
    media: feedMediaSchema,
    excerpt: z.string(),
    containsSpoilers: z.boolean(),
    rating: z.number().nullable()
  })
]);

export const feedResponseSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable()
});

export const suggestedUserSchema = z.object({
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  entriesCount: z.number()
});

export type FeedItem = z.infer<typeof feedItemSchema>;
export type SuggestedUser = z.infer<typeof suggestedUserSchema>;