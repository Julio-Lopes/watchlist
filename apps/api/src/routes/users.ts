import {
  entryStatusSchema,
  publicEntriesSchema,
  publicProfileSchema,
  publicReviewsSchema
} from '@watchlist/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { consumeRateLimit } from '../lib/rate-limit.js';
import {
  getPublicProfile,
  listPublicEntries,
  listPublicReviews,
  setFollow
} from '../services/profile.js';

const params = z.object({ username: z.string().min(3).max(30) });

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/users/:username',
    {
      schema: {
        summary: 'Perfil publico',
        tags: ['users'],
        params,
        response: { 200: publicProfileSchema }
      }
    },
    async (request) =>
      getPublicProfile(app.db, request.params.username, request.viewer?.id ?? null)
  );

  app.get(
    '/users/:username/entries',
    {
      schema: {
        summary: 'Biblioteca publica',
        tags: ['users'],
        params,
        querystring: z.object({
          status: entryStatusSchema.optional(),
          cursor: z.string().max(200).optional()
        }),
        response: { 200: publicEntriesSchema }
      }
    },
    async (request) =>
      listPublicEntries(
        app.db,
        request.params.username,
        request.viewer?.id ?? null,
        request.query.status,
        request.query.cursor
      )
  );

  app.get(
    '/users/:username/reviews',
    {
      schema: {
        summary: 'Reviews publicas',
        tags: ['users'],
        params,
        querystring: z.object({ cursor: z.string().max(40).optional() }),
        response: { 200: publicReviewsSchema }
      }
    },
    async (request) =>
      listPublicReviews(
        app.db,
        request.params.username,
        request.viewer?.id ?? null,
        request.query.cursor
      )
  );

  app.post(
    '/users/:username/follow',
    {
      preHandler: app.requireOnboarded,
      schema: { summary: 'Segue um perfil', tags: ['users'], params, response: { 204: z.null() } }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `follow:user:${viewer.id}`, 60, 3600);

      await setFollow(app.db, viewer.id, request.params.username, true);
      return reply.status(204).send(null);
    }
  );

  app.delete(
    '/users/:username/follow',
    {
      preHandler: app.requireOnboarded,
      schema: { summary: 'Deixa de seguir', tags: ['users'], params, response: { 204: z.null() } }
    },
    async (request, reply) => {
      await setFollow(app.db, request.viewer!.id, request.params.username, false);
      return reply.status(204).send(null);
    }
  );
};