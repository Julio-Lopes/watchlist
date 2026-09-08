import { media, mediaEntries, mediaEntryTags, userTags, watchEvents } from '@watchlist/db';
import {
  createEntrySchema,
  entryListQuerySchema,
  entryListSchema,
  entrySchema,
  progressSchema,
  setEntryTagsSchema,
  updateEntrySchema
} from '@watchlist/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { conflict, notFound, unprocessable } from '../lib/errors.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import {
  applyProgress,
  getEntry,
  getTimezone,
  listEntries,
  localDate
} from '../services/entries.js';
import { getMediaDetail } from '../services/media.js';

const params = z.object({ id: z.uuid() });

export const entryRoutes: FastifyPluginAsyncZod = async (app) => {
  /** Toda escrita exige onboarding concluido: conta com username placeholder
   *  le, mas nao escreve. Ver decisao da opcao A na Etapa 3. */
  const write = app.requireOnboarded;

  app.get(
    '/entries',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Biblioteca do viewer',
        tags: ['entries'],
        querystring: entryListQuerySchema,
        response: { 200: entryListSchema }
      }
    },
    async (request) => listEntries(app.db, request.viewer!.id, request.query)
  );

  app.post(
    '/entries',
    {
      preHandler: write,
      schema: {
        summary: 'Adiciona midia a biblioteca',
        tags: ['entries'],
        body: createEntrySchema,
        response: { 201: entrySchema }
      }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `write:user:${viewer.id}`, 120, 60);

      const { source, mediaType, externalId, status } = request.body;

      /** Buscar o detalhe grava a midia em media. Ate aqui, a obra so existia
       *  na fonte externa: adicionar e o gesto que a persiste. */
      const detail = await getMediaDetail(app.db, source, mediaType, externalId);
      if (!detail) throw notFound('Midia nao encontrada.');

      const total = detail.totalEpisodes;
      const requested = request.body.episodesWatched ?? 0;

      /** O total manda: pedir mais episodios do que a obra tem e erro do
       *  cliente, e truncar e melhor que gravar 300 de 220. */
      const watched =
        status === 'completed'
          ? (total ?? requested)
          : status === 'planning'
            ? 0
            : total === null
              ? requested
              : Math.min(requested, total);

      /** Preencher o progresso ate o fim significa concluido, mesmo que o
       *  cliente tenha mandado outro status. */
      const finalStatus =
        total !== null && watched >= total && status !== 'planning' ? 'completed' : status;

      const timezone = watched > 0 ? await getTimezone(app.db, viewer.id) : null;
      const today = timezone ? localDate(timezone) : null;

      /** Nenhum watch_event aqui, de proposito. Informar que voce esta no
       *  episodio 47 nao e o mesmo que ter assistido 47 episodios hoje, e
       *  inventar esses eventos estragaria heatmap, streak e diario. */
      const [entry] = await app.db
        .insert(mediaEntries)
        .values({
          userId: viewer.id,
          mediaId: detail.id,
          status: finalStatus,
          episodesWatched: watched,
          startedAt: today,
          finishedAt: finalStatus === 'completed' ? today : null
        })
        .onConflictDoNothing()
        .returning({ id: mediaEntries.id });

      if (!entry) throw conflict('Essa obra ja esta na sua biblioteca.');

      return reply.status(201).send(await getEntry(app.db, viewer.id, entry.id));
    }
  );

  app.get(
    '/entries/:id',
    {
      preHandler: app.requireAuth,
      schema: { summary: 'Uma entrada', tags: ['entries'], params, response: { 200: entrySchema } }
    },
    async (request) => getEntry(app.db, request.viewer!.id, request.params.id)
  );

  app.patch(
    '/entries/:id',
    {
      preHandler: write,
      schema: {
        summary: 'Atualiza status, progresso, nota e afins',
        tags: ['entries'],
        params,
        body: updateEntrySchema,
        response: { 200: entrySchema }
      }
    },
    async (request) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `write:user:${viewer.id}`, 120, 60);

      const body = request.body;

      if (body.dropReason && body.status && body.status !== 'dropped') {
        throw unprocessable('Motivo de abandono so vale para obra abandonada.');
      }

      const [current] = await app.db
        .select({
          status: mediaEntries.status,
          episodesWatched: mediaEntries.episodesWatched,
          startedAt: mediaEntries.startedAt,
          finishedAt: mediaEntries.finishedAt,
          totalEpisodes: media.totalEpisodes
        })
        .from(mediaEntries)
        .innerJoin(media, eq(media.id, mediaEntries.mediaId))
        .where(and(eq(mediaEntries.id, request.params.id), eq(mediaEntries.userId, viewer.id)))
        .limit(1);

      if (!current) throw notFound('Entrada nao encontrada.');

      const total = current.totalEpisodes;
      const status = body.status ?? current.status;

      const requested = body.episodesWatched ?? current.episodesWatched;
      let watched = total === null ? requested : Math.min(requested, total);

      /** Mesma coerencia do POST nos dois sentidos: concluir preenche o
       *  progresso, e completar o progresso conclui. */
      if (status === 'completed' && total !== null) watched = total;

      const finalStatus =
        total !== null && watched >= total && status !== 'planning' ? 'completed' : status;

      const timezone = await getTimezone(app.db, viewer.id);
      const today = localDate(timezone);

      /** Avanco pequeno e uso normal e vira registro no diario; salto grande
       *  e declaracao de historico e nao inventa atividade de hoje. */
      const SMALL_ADVANCE = 3;
      const advance = watched - current.episodesWatched;
      const shouldRecord = advance > 0 && advance <= SMALL_ADVANCE;

      await app.db
        .update(mediaEntries)
        .set({
          ...body,
          status: finalStatus,
          episodesWatched: watched,
          startedAt: current.startedAt ?? (watched > 0 ? today : null),
          finishedAt: finalStatus === 'completed' ? (current.finishedAt ?? today) : null,
          ...(finalStatus === 'dropped' ? {} : { dropReason: null })
        })
        .where(eq(mediaEntries.id, request.params.id));

        if (shouldRecord) {
        await app.db.insert(watchEvents).values(
          Array.from({ length: advance }, (_, index) => ({
            userId: viewer.id,
            mediaEntryId: request.params.id,
            episodesDelta: 1,
            isRewatch: current.status === 'completed',
            episodeNumber: current.episodesWatched + index + 1,
            watchedOn: today
          }))
        );
      }

      return getEntry(app.db, viewer.id, request.params.id);
    }
  );

  app.delete(
    '/entries/:id',
    {
      preHandler: write,
      schema: {
        summary: 'Remove da biblioteca',
        tags: ['entries'],
        params,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const result = await app.db
        .delete(mediaEntries)
        .where(
          and(eq(mediaEntries.id, request.params.id), eq(mediaEntries.userId, request.viewer!.id))
        )
        .returning({ id: mediaEntries.id });

      if (result.length === 0) throw notFound('Entrada nao encontrada.');

      return reply.status(204).send(null);
    }
  );

  app.post(
    '/entries/:id/progress',
    {
      preHandler: write,
      schema: {
        summary: 'Marca ou desmarca um episodio',
        tags: ['entries'],
        params,
        body: progressSchema,
        response: { 200: z.object({ episodesWatched: z.number(), status: z.string() }) }
      }
    },
    async (request) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `write:user:${viewer.id}`, 120, 60);

      const timezone = await getTimezone(app.db, viewer.id);
      return applyProgress(app.db, viewer.id, request.params.id, request.body.delta, timezone);
    }
  );

  app.put(
    '/entries/:id/tags',
    {
      preHandler: write,
      schema: {
        summary: 'Substitui as tags de uma entrada',
        tags: ['entries'],
        params,
        body: setEntryTagsSchema,
        response: { 200: entrySchema }
      }
    },
    async (request) => {
      const viewer = request.viewer!;
      const { tagIds } = request.body;

      await app.db.transaction(async (tx) => {
        const [entry] = await tx
          .select({ id: mediaEntries.id })
          .from(mediaEntries)
          .where(and(eq(mediaEntries.id, request.params.id), eq(mediaEntries.userId, viewer.id)))
          .limit(1);

        if (!entry) throw notFound('Entrada nao encontrada.');

        if (tagIds.length > 0) {
          /** Confere a posse das tags: sem isso, alguem marcaria a propria
           *  entrada com a tag de outra pessoa e vazaria o nome dela. */
          const owned = await tx
            .select({ id: userTags.id })
            .from(userTags)
            .where(and(inArray(userTags.id, tagIds), eq(userTags.userId, viewer.id)));

          if (owned.length !== tagIds.length) throw notFound('Tag nao encontrada.');
        }

        await tx.delete(mediaEntryTags).where(eq(mediaEntryTags.mediaEntryId, entry.id));

        if (tagIds.length > 0) {
          await tx
            .insert(mediaEntryTags)
            .values(tagIds.map((tagId) => ({ mediaEntryId: entry.id, tagId })));
        }
      });

      return getEntry(app.db, viewer.id, request.params.id);
    }
  );
};