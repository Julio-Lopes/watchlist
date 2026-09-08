import { activityStatsSchema, feedResponseSchema, suggestedUserSchema } from '@watchlist/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getActivity } from '../services/activity.js';
import { getTimezone, localDate } from '../services/entries.js';
import { listFeed, suggestUsers } from '../services/feed.js';
import { overviewQuerySchema, overviewSchema } from '@watchlist/shared';
import { getOverview } from '../services/overview.js';

export const statsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/stats/activity',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Heatmap de 365 dias, streaks e totais',
        tags: ['stats'],
        response: { 200: activityStatsSchema }
      }
    },
    async (request) => {
      const userId = request.viewer!.id;
      /** "Hoje" e o dia local do usuario. Usar UTC quebraria o streak de quem
       *  assiste de madrugada. */
      const today = localDate(await getTimezone(app.db, userId));

      return getActivity(app.db, userId, today);
    }
  );

  app.get(
    '/feed',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Atividade de quem o viewer segue',
        tags: ['feed'],
        querystring: z.object({ cursor: z.string().max(40).optional() }),
        response: { 200: feedResponseSchema }
      }
    },
    async (request) => listFeed(app.db, request.viewer!.id, request.query.cursor)
  );

  app.get(
    '/feed/suggestions',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Pessoas para seguir',
        tags: ['feed'],
        response: { 200: z.array(suggestedUserSchema) }
      }
    },
    async (request) => suggestUsers(app.db, request.viewer!.id)
  );

  app.get(
    '/stats/overview',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Generos, notas, tempo e afinidades',
        tags: ['stats'],
        querystring: overviewQuerySchema,
        response: { 200: overviewSchema }
      }
    },
    async (request) => getOverview(app.db, request.viewer!.id, request.query.period)
  );
};