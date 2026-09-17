import { jobQueue } from '@watchlist/db';
import { importRequestSchema, importResultSchema, importStatusSchema } from '@watchlist/shared';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { notFound } from '../lib/errors.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { drainQueue, enqueue } from '../services/job-queue.js';

function toImportStatus(row: typeof jobQueue.$inferSelect) {
  const parsed = importResultSchema.safeParse(row.result);
  const status: 'pending' | 'failed' | 'running' | 'done' | 'cancelled' =
    row.status === 'processing'
      ? 'running'
      : row.status === 'completed'
        ? 'done'
        : row.status === 'cancelled'
          ? 'cancelled'
          : row.status === 'pending' || row.status === 'failed'
            ? row.status
            : 'failed';

  return {
    jobId: row.id,
    status,
    processed: row.progress,
    total: row.total,
    result: parsed.success ? parsed.data : null,
    error: row.lastError
  };
}

export const importRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/import/mal',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Importa a lista do MyAnimeList',
        tags: ['import'],
        body: importRequestSchema,
        response: { 202: z.object({ jobId: z.uuid() }) }
      }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      /** Tres por dia: importar e raro e cada execucao gasta minutos de
       *  chamadas a fonte. */
      await consumeRateLimit(app.db, `import:user:${viewer.id}`, 3, 86_400);

      const job = await enqueue(
        app.db,
        'import.mal',
        { userId: viewer.id, xml: request.body.xml, overwrite: request.body.overwrite },
        viewer.id
      );

      /** O null so acontece na deduplicacao de jobs globais, que nao se
       *  aplica aqui: job com userId sempre entra. */
      if (!job) throw new Error('enqueue de import.mal nao retornou job');

      /** Dispara o processamento agora, sem esperar: o cron diario faria a
       *  pessoa aguardar ate a madrugada. A tela consulta o progresso e essas
       *  requisicoes mantem o servico acordado enquanto o job roda. */
      void drainQueue(app.db, app.log).catch((error: unknown) => {
        app.log.error({ err: error }, 'drain apos import falhou');
      });

      return reply.status(202).send({ jobId: job.id });
    }
  );

  app.get(
    '/import/current',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Importacao atual do usuario',
        tags: ['import'],
        response: { 200: importStatusSchema.nullable() }
      }
    },
    async (request) => {
      const [row] = await app.db
        .select()
        .from(jobQueue)
        .where(
          and(
            eq(jobQueue.userId, request.viewer!.id),
            eq(jobQueue.type, 'import.mal')
          )
        )
        .orderBy(desc(jobQueue.createdAt))
        .limit(1);

      return row ? toImportStatus(row) : null;
    }
  );

  app.post(
    '/import/:jobId/cancel',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Cancela uma importacao',
        tags: ['import'],
        params: z.object({ jobId: z.uuid() }),
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const result = await app.db
        .update(jobQueue)
        .set({ status: 'cancelled', lastError: 'Importacao cancelada pelo usuario.' })
        .where(
          and(
            eq(jobQueue.id, request.params.jobId),
            eq(jobQueue.userId, request.viewer!.id),
            inArray(jobQueue.status, ['pending', 'processing'])
          )
        );

      if (!result.rowCount) throw notFound('Importacao nao encontrada ou ja finalizada.');
      return reply.status(204).send(null);
    }
  );

  app.get(
    '/import/:jobId',
    {
        preHandler: app.requireAuth,
        schema: {
        summary: 'Progresso da importacao',
        tags: ['import'],
        params: z.object({ jobId: z.uuid() }),
        response: { 200: importStatusSchema }
        }
    },
    async (request) => {
        const [row] = await app.db
        .select()
        .from(jobQueue)
        .where(
            and(
            eq(jobQueue.id, request.params.jobId),
            eq(jobQueue.userId, request.viewer!.id)
            )
        )
        .limit(1);

        if (!row) {
        throw notFound('Importacao nao encontrada.');
        }

        return toImportStatus(row);
    }
    );
};