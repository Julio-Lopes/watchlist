import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { exportAll, exportCsv, exportLetterboxd } from '../services/export.js';

/** Nome do arquivo com a data, para quem exporta mais de uma vez nao ficar
 *  com "export (3).json" na pasta de downloads. */
const filename = (username: string, extension: string): string =>
  `watchlist-${username}-${new Date().toISOString().slice(0, 10)}.${extension}`;

export const exportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/export/json',
    {
      preHandler: app.requireAuth,
      schema: { summary: 'Exporta tudo em JSON', tags: ['export'] }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      /** Cinco por hora: exportar e raro e a consulta pesa quando ha muito
       *  historico. */
      await consumeRateLimit(app.db, `export:user:${viewer.id}`, 5, 3600);

      const data = await exportAll(app.db, viewer.id);

      return reply
        .header('content-type', 'application/json; charset=utf-8')
        .header('content-disposition', `attachment; filename="${filename(viewer.username, 'json')}"`)
        .send(JSON.stringify(data, null, 2));
    }
  );

  app.get(
    '/export/csv',
    {
      preHandler: app.requireAuth,
      schema: { summary: 'Exporta a biblioteca em CSV', tags: ['export'] }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `export:user:${viewer.id}`, 5, 3600);

      const csv = await exportCsv(app.db, viewer.id);

      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${filename(viewer.username, 'csv')}"`)
        .send(csv);
    }
  );

  app.get(
    '/export/letterboxd',
    {
      preHandler: app.requireAuth,
      schema: { summary: 'Filmes concluidos no formato do Letterboxd', tags: ['export'] }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `export:user:${viewer.id}`, 5, 3600);

      const csv = await exportLetterboxd(app.db, viewer.id);

      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header(
          'content-disposition',
          `attachment; filename="letterboxd-${viewer.username}.csv"`
        )
        .send(csv);
    }
  );
};