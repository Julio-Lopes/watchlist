import { jobQueue } from '@watchlist/db';
import { jobViewSchema } from '@watchlist/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { notFound, unprocessable } from '../lib/errors.js';

const params = z.object({ id: z.uuid() });

export const jobRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/jobs/:id',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Status e progresso de um job',
        tags: ['jobs'],
        params,
        response: { 200: jobViewSchema }
      }
    },
    async (request) => {
      const [job] = await app.db
        .select()
        .from(jobQueue)
        .where(
          /** Filtrar por dono na propria query, e nao depois: 404 para job
           *  alheio nao revela sequer que o id existe. */
          and(eq(jobQueue.id, request.params.id), eq(jobQueue.userId, request.viewer!.id))
        )
        .limit(1);

      if (!job) throw notFound('Job nao encontrado.');

      return {
        id: job.id,
        type: job.type as never,
        status: job.status,
        progress: job.progress,
        total: job.total,
        result: job.result,
        attempts: job.attempts,
        lastError: job.lastError,
        createdAt: job.createdAt.toISOString()
      };
    }
  );

  app.delete(
    '/jobs/:id',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Cancela um job ainda pendente',
        tags: ['jobs'],
        params,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const [job] = await app.db
        .select({ status: jobQueue.status })
        .from(jobQueue)
        .where(and(eq(jobQueue.id, request.params.id), eq(jobQueue.userId, request.viewer!.id)))
        .limit(1);

      if (!job) throw notFound('Job nao encontrado.');

      /** Job em processing nao pode ser cancelado: ele ja esta escrevendo,
       *  e interromper no meio deixaria dado parcial sem dono. */
      if (job.status !== 'pending') {
        throw unprocessable('Esse job ja saiu da fila e nao pode ser cancelado.');
      }

      await app.db.delete(jobQueue).where(eq(jobQueue.id, request.params.id));
      return reply.status(204).send(null);
    }
  );
};