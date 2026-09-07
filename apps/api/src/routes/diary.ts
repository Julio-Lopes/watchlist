import { mediaEntries, watchEvents } from '@watchlist/db';
import { diaryQuerySchema, diaryResponseSchema } from '@watchlist/shared';
import { and, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { notFound } from '../lib/errors.js';
import { listDiary, monthTotals } from '../services/diary.js';

export const diaryRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/diary',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Historico do viewer, agrupado por dia',
        tags: ['diary'],
        querystring: diaryQuerySchema,
        response: { 200: diaryResponseSchema }
      }
    },
    async (request) => {
      const userId = request.viewer!.id;
      const { type, cursor } = request.query;

      const [page, month] = await Promise.all([
        listDiary(app.db, userId, type, cursor),
        monthTotals(app.db, userId)
      ]);

      return { ...page, month };
    }
  );

  app.delete(
    '/diary/:id',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Apaga um episodio registrado por engano',
        tags: ['diary'],
        params: z.object({ id: z.uuid() }),
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const userId = request.viewer!.id;

      await app.db.transaction(async (tx) => {
        const [event] = await tx
          .delete(watchEvents)
          .where(and(eq(watchEvents.id, request.params.id), eq(watchEvents.userId, userId)))
          .returning({ entryId: watchEvents.mediaEntryId, delta: watchEvents.episodesDelta });

        if (!event) throw notFound('Registro nao encontrado.');

        /** Decrementa o progresso da entrada. Os numeros ja gravados nos outros
         *  eventos ficam como estao: o diario e o que aconteceu, nao uma
         *  sequencia recalculada. */
        await tx
          .update(mediaEntries)
          .set({
            episodesWatched: sql`greatest(0, ${mediaEntries.episodesWatched} - ${event.delta})`
          })
          .where(eq(mediaEntries.id, event.entryId));
      });

      return reply.status(204).send(null);
    }
  );
};