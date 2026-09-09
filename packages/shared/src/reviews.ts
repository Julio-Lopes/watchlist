import { z } from 'zod';

export const writeReviewSchema = z.object({
  /** Texto puro com quebras de linha, sem markdown. Elimina a superficie de
   *  XSS e dispensa biblioteca de renderizacao e de sanitizacao. */
  content: z.string().min(10, 'Escreva ao menos 10 caracteres.').max(5000),
  containsSpoilers: z.boolean().default(false)
});

export const reviewSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  containsSpoilers: z.boolean(),
  likesCount: z.number(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  rating: z.number().nullable(),
  author: z.object({
    username: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable()
  }),
  /** Null para visitante anonimo: o botao de curtir some em vez de aparecer
   *  e falhar. */
  likedByViewer: z.boolean().nullable(),
  isOwner: z.boolean()
});

export const reviewListSchema = z.object({
  items: z.array(reviewSchema),
  nextCursor: z.string().nullable(),
  total: z.number()
});

export const reviewQuerySchema = z.object({
  sort: z.enum(['likes', 'recent']).default('likes'),
  cursor: z.string().max(60).optional()
});

/** Review do proprio viewer numa entrada. Sem autor nem contadores sociais:
 *  serve para preencher o editor, nao para exibir. */
export const ownReviewSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  containsSpoilers: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export type OwnReview = z.infer<typeof ownReviewSchema>;

export type Review = z.infer<typeof reviewSchema>;