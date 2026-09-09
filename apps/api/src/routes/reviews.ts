import { mediaEntries, reviews } from '@watchlist/db';
import {
  mediaSourceSchema,
  mediaTypeSchema,
  ownReviewSchema,
  reviewListSchema,
  reviewQuerySchema,
  writeReviewSchema
} from '@watchlist/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { notFound } from '../lib/errors.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { findMediaId, listReviews, setLike, writeReview } from '../services/reviews.js';

const idParam = z.object({ id: z.uuid() });

export const reviewRoutes: FastifyPluginAsyncZod = async (app) => {

  app.get(
    '/entries/:id/review',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Review do viewer nesta entrada, se houver',
        tags: ['reviews'],
        params: idParam,
        response: { 200: ownReviewSchema.nullable() }
      }
    },
    async (request) => {
      const [row] = await app.db
        .select({
          id: reviews.id,
          content: reviews.content,
          containsSpoilers: reviews.containsSpoilers,
          createdAt: reviews.createdAt,
          updatedAt: reviews.updatedAt
        })
        .from(reviews)
        .innerJoin(mediaEntries, eq(mediaEntries.id, reviews.mediaEntryId))
        /** Filtra pela entrada e pelo dono na mesma query: sem o segundo
         *  predicado, alguem leria a review de outra pessoa passando o id
         *  da entrada dela. */
        .where(
          and(eq(reviews.mediaEntryId, request.params.id), eq(mediaEntries.userId, request.viewer!.id))
        )
        .limit(1);

      if (!row) return null;

      return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      };
    }
  );
  
  app.post(
    '/entries/:id/review',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Escreve ou substitui a review da entrada',
        tags: ['reviews'],
        params: idParam,
        body: writeReviewSchema,
        response: { 200: z.object({ id: z.uuid() }) }
      }
    },
    async (request) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `review:user:${viewer.id}`, 20, 3600);

      const id = await writeReview(
        app.db,
        viewer.id,
        request.params.id,
        request.body.content,
        request.body.containsSpoilers
      );

      return { id };
    }
  );

  app.patch(
    '/reviews/:id',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Edita a review',
        tags: ['reviews'],
        params: idParam,
        body: writeReviewSchema,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const result = await app.db
        .update(reviews)
        .set({
          content: request.body.content,
          containsSpoilers: request.body.containsSpoilers
        })
        .where(and(eq(reviews.id, request.params.id), eq(reviews.userId, request.viewer!.id)))
        .returning({ id: reviews.id });

      if (result.length === 0) throw notFound('Review nao encontrada.');

      return reply.status(204).send(null);
    }
  );

  app.delete(
    '/reviews/:id',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Apaga a review',
        tags: ['reviews'],
        params: idParam,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const result = await app.db
        .delete(reviews)
        .where(and(eq(reviews.id, request.params.id), eq(reviews.userId, request.viewer!.id)))
        .returning({ id: reviews.id });

      if (result.length === 0) throw notFound('Review nao encontrada.');

      return reply.status(204).send(null);
    }
  );

  app.get(
    '/media/:source/:type/:id/reviews',
    {
      schema: {
        summary: 'Reviews publicas de uma obra',
        tags: ['reviews'],
        params: z.object({
          source: mediaSourceSchema,
          type: mediaTypeSchema,
          id: z.coerce.number().int().positive()
        }),
        querystring: reviewQuerySchema,
        response: { 200: reviewListSchema }
      }
    },
    async (request) => {
      const { source, type, id } = request.params;

      const mediaId = await findMediaId(app.db, source, type, id);

      /** Obra que ninguem abriu ainda nao esta em media, entao nao tem review.
       *  Lista vazia e mais honesto que 404: a obra existe, so nao ha texto. */
      if (!mediaId) return { items: [], nextCursor: null, total: 0 };

      return listReviews(
        app.db,
        mediaId,
        request.viewer?.id ?? null,
        request.query.sort,
        request.query.cursor
      );
    }
  );

  app.post(
    '/reviews/:id/like',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Curte uma review',
        tags: ['reviews'],
        params: idParam,
        response: { 200: z.object({ likesCount: z.number() }) }
      }
    },
    async (request) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `like:user:${viewer.id}`, 120, 3600);

      const likesCount = await setLike(app.db, viewer.id, request.params.id, true);
      return { likesCount };
    }
  );

  app.delete(
    '/reviews/:id/like',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Descurte',
        tags: ['reviews'],
        params: idParam,
        response: { 200: z.object({ likesCount: z.number() }) }
      }
    },
    async (request) => {
      const likesCount = await setLike(app.db, request.viewer!.id, request.params.id, false);
      return { likesCount };
    }
  );
};