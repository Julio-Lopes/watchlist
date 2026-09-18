import { rankingsQuerySchema, rankingsResponseSchema } from '@watchlist/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { getRankings } from '../services/rankings.js';

export const rankingRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/rankings',
    {
      schema: {
        summary: 'Obras mais bem avaliadas, assistidas, largadas e em alta',
        tags: ['rankings'],
        querystring: rankingsQuerySchema,
        response: { 200: rankingsResponseSchema }
      }
    },
    async (request) => {
      await consumeRateLimit(app.db, `rankings:ip:${request.ip}`, 60, 60);

      const { type, kind, limit } = request.query;
      return getRankings(app.db, type, kind, limit);
    }
  );
};