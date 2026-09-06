import { userTags } from '@watchlist/db';
import { createTagSchema, tagSchema } from '@watchlist/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { conflict, notFound } from '../lib/errors.js';

export const tagRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/tags',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Tags pessoais do viewer',
        tags: ['tags'],
        response: { 200: z.array(tagSchema) }
      }
    },
    async (request) =>
      app.db
        .select({
          id: userTags.id,
          name: userTags.name,
          color: userTags.color,
          isPublic: userTags.isPublic
        })
        .from(userTags)
        .where(eq(userTags.userId, request.viewer!.id))
        .orderBy(userTags.name)
  );

  app.post(
    '/tags',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Cria uma tag',
        tags: ['tags'],
        body: createTagSchema,
        response: { 201: tagSchema }
      }
    },
    async (request, reply) => {
      const [tag] = await app.db
        .insert(userTags)
        .values({ userId: request.viewer!.id, ...request.body })
        .onConflictDoNothing()
        .returning({
          id: userTags.id,
          name: userTags.name,
          color: userTags.color,
          isPublic: userTags.isPublic
        });

      /** O UNIQUE e sobre lower(name): "Comfort" e "comfort" sao a mesma tag. */
      if (!tag) throw conflict('Voce ja tem uma tag com esse nome.');

      return reply.status(201).send(tag);
    }
  );

  app.delete(
    '/tags/:id',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Remove uma tag',
        tags: ['tags'],
        params: z.object({ id: z.uuid() }),
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const result = await app.db
        .delete(userTags)
        .where(and(eq(userTags.id, request.params.id), eq(userTags.userId, request.viewer!.id)))
        .returning({ id: userTags.id });

      if (result.length === 0) throw notFound('Tag nao encontrada.');

      return reply.status(204).send(null);
    }
  );
};