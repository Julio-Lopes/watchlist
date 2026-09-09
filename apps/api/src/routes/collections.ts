import { collections } from '@watchlist/db';
import {
  addItemSchema,
  collectionDetailSchema,
  collectionSummarySchema,
  createCollectionSchema,
  updateCollectionSchema,
  updateItemSchema
} from '@watchlist/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { notFound, unprocessable } from '../lib/errors.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import {
  addItem,
  createCollection,
  getCollection,
  listCollections,
  listPublicCollections,
  removeItem,
  updateItem
} from '../services/collections.js';
import { getMediaDetail } from '../services/media.js';

const idParam = z.object({ id: z.uuid() });
const itemParams = z.object({ id: z.uuid(), mediaId: z.uuid() });

export const collectionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/collections',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Colecoes do viewer',
        tags: ['collections'],
        response: { 200: z.array(collectionSummarySchema) }
      }
    },
    async (request) => listCollections(app.db, request.viewer!.id)
  );

  app.post(
    '/collections',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Cria colecao',
        tags: ['collections'],
        body: createCollectionSchema,
        response: { 201: z.object({ id: z.uuid(), slug: z.string() }) }
      }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `write:user:${viewer.id}`, 120, 60);

      const { cover, ...rest } = request.body;

      let coverMediaId: string | null = null;

      if (cover) {
        const detail = await getMediaDetail(
          app.db,
          cover.source,
          cover.mediaType,
          cover.externalId
        );

        if (!detail) throw notFound('Midia nao encontrada.');

        if (!detail.bannerImage) {
          throw unprocessable('Essa obra não tem banner disponível. Escolha outra.');
        }

        coverMediaId = detail.id;
      }

      const created = await createCollection(app.db, viewer.id, { ...rest, coverMediaId });
      return reply.status(201).send(created);
    }
  );

  app.get(
    '/collections/:username/:slug',
    {
      schema: {
        summary: 'Uma colecao',
        tags: ['collections'],
        params: z.object({ username: z.string().max(30), slug: z.string().max(60) }),
        response: { 200: collectionDetailSchema }
      }
    },
    async (request) =>
      getCollection(
        app.db,
        request.params.username,
        request.params.slug,
        request.viewer?.id ?? null
      )
  );

  app.get(
    '/users/:username/collections',
    {
      schema: {
        summary: 'Colecoes publicas de alguem',
        tags: ['collections'],
        params: z.object({ username: z.string().max(30) }),
        response: { 200: z.array(collectionSummarySchema) }
      }
    },
    async (request) =>
      listPublicCollections(app.db, request.params.username, request.viewer?.id ?? null)
  );

    app.patch(
    '/collections/:id',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Atualiza a colecao',
        tags: ['collections'],
        params: idParam,
        body: updateCollectionSchema,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      const { cover, ...rest } = request.body;

      /** undefined nao mexe, null remove, objeto define. Mesma mecanica do
       *  banner de perfil: a obra pode ainda nao existir em media, e escolher
       *  e o gesto que a persiste. */
      let coverMediaId: string | null | undefined;

      if (cover === null) {
        coverMediaId = null;
      } else if (cover) {
        const detail = await getMediaDetail(
          app.db,
          cover.source,
          cover.mediaType,
          cover.externalId
        );

        if (!detail) throw notFound('Midia nao encontrada.');

        if (!detail.bannerImage) {
          throw unprocessable('Essa obra não tem banner disponível. Escolha outra.');
        }

        coverMediaId = detail.id;
      }

      const patch = {
        ...rest,
        ...(coverMediaId === undefined ? {} : { coverMediaId })
      };

      if (Object.keys(patch).length === 0) {
        return reply.status(204).send(null);
      }

      const result = await app.db
        .update(collections)
        .set(patch)
        .where(and(eq(collections.id, request.params.id), eq(collections.userId, viewer.id)))
        .returning({ id: collections.id });

      if (result.length === 0) throw notFound('Colecao nao encontrada.');

      return reply.status(204).send(null);
    }
  );

  app.delete(
    '/collections/:id',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Apaga a colecao',
        tags: ['collections'],
        params: idParam,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const result = await app.db
        .delete(collections)
        .where(
          and(eq(collections.id, request.params.id), eq(collections.userId, request.viewer!.id))
        )
        .returning({ id: collections.id });

      if (result.length === 0) throw notFound('Colecao nao encontrada.');

      return reply.status(204).send(null);
    }
  );

  app.post(
    '/collections/:id/items',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Adiciona obra a colecao',
        tags: ['collections'],
        params: idParam,
        body: addItemSchema,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `write:user:${viewer.id}`, 120, 60);

      const { source, mediaType, externalId, note } = request.body;

      /** Colecao e curadoria, nao historico: nao exige ter na biblioteca.
       *  Escolher persiste a obra, como abrir o detalhe. */
      const detail = await getMediaDetail(app.db, source, mediaType, externalId);
      if (!detail) throw notFound('Midia nao encontrada.');

      await addItem(app.db, viewer.id, request.params.id, detail.id, note ?? null);
      return reply.status(204).send(null);
    }
  );

  app.delete(
    '/collections/:id/items/:mediaId',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Remove obra da colecao',
        tags: ['collections'],
        params: itemParams,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      await removeItem(app.db, request.viewer!.id, request.params.id, request.params.mediaId);
      return reply.status(204).send(null);
    }
  );

  app.patch(
    '/collections/:id/items/:mediaId',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Edita a nota ou reordena',
        tags: ['collections'],
        params: itemParams,
        body: updateItemSchema,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      await updateItem(
        app.db,
        request.viewer!.id,
        request.params.id,
        request.params.mediaId,
        request.body
      );
      return reply.status(204).send(null);
    }
  );
};