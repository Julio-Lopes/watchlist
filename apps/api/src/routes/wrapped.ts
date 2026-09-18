import { wrappedSchema } from '@watchlist/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { getWrapped } from '../services/wrapped.js';

export const wrappedRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/wrapped/:username/:year',
    {
      schema: {
        summary: 'Retrospecto de um ano',
        tags: ['wrapped'],
        params: z.object({
          username: z.string().max(30),
          /** 2024 e o primeiro ano com dado possivel; o limite superior
           *  acompanha o ano corrente mais um, para virada de ano. */
          year: z.coerce.number().int().min(2000).max(2100)
        }),
        response: { 200: wrappedSchema }
      }
    },
    async (request) => {
      await consumeRateLimit(app.db, `wrapped:ip:${request.ip}`, 60, 60);

      const { username, year } = request.params;
      return getWrapped(app.db, username, year, request.viewer?.id ?? null);
    }
  );
};