import { z } from 'zod';
import { mediaSourceSchema, mediaTypeSchema } from './enums';

export const diaryEventSchema = z.object({
  id: z.uuid(),
  episodeNumber: z.number().nullable(),
  isRewatch: z.boolean(),
  /** Minutos do episodio, de media.episode_duration. Null quando a fonte
   *  nao informa duracao, e ai o dia soma so o que sabe. */
  minutes: z.number().nullable(),
  media: z.object({
    id: z.uuid(),
    title: z.string(),
    coverImage: z.string().nullable(),
    source: mediaSourceSchema,
    mediaType: mediaTypeSchema,
    externalId: z.int()
  })
});

export const diaryDaySchema = z.object({
  date: z.string(),
  totalEpisodes: z.number(),
  totalMinutes: z.number(),
  /** Dias sem registro entre este bloco e o anterior. A linha do tempo
   *  mentiria por omissao se colasse 5 de setembro em 29 de agosto. */
  gapDays: z.number(),
  events: z.array(diaryEventSchema)
});

export const diaryQuerySchema = z.object({
  type: mediaTypeSchema.optional(),
  cursor: z.string().max(30).optional()
});

export const diaryResponseSchema = z.object({
  days: z.array(diaryDaySchema),
  nextCursor: z.string().nullable(),
  month: z.object({ episodes: z.number(), minutes: z.number() })
});

export type DiaryDay = z.infer<typeof diaryDaySchema>;
export type DiaryEvent = z.infer<typeof diaryEventSchema>;