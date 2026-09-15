import {
  mediaDetailSchema,
  mediaSourceSchema,
  mediaTypeSchema,
  recommendationsSchema,
  searchQuerySchema,
  searchResponseSchema
} from '@watchlist/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TtlCache } from '../lib/cache.js';
import { notFound } from '../lib/errors.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { getMediaDetail, getRecommendationsFor, searchMedia, type SearchOutcome } from '../services/media.js';

/** Cache curto so para rajada: digitar na busca dispara varias chamadas
 *  quase iguais. O que importa persistir ja vai para media no detalhe. */
const searchCache = new TtlCache<SearchOutcome>(5 * 60 * 1000);

export const mediaRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/media/search',
    {
      schema: {
        summary: 'Busca na fonte de anime e no TMDB',
        tags: ['media'],
        querystring: searchQuerySchema,
        response: { 200: searchResponseSchema }
      }
    },
    async (request) => {
      await consumeRateLimit(app.db, `search:ip:${request.ip}`, 60, 60);

      const { q, type, page } = request.query;
      const key = `${q.toLowerCase()}|${type ?? 'all'}|${page}`;

      const cached = searchCache.get(key);
      if (cached) return cached;

      const outcome = await searchMedia(q, page, type);

      /** Resultado degradado nao entra no cache: a proxima busca deve tentar
       *  de novo assim que a fonte voltar. */
      if (outcome.degraded.length === 0) searchCache.set(key, outcome);

      return outcome;
    }
  );

  app.get(
    '/media/:source/:type/:id',
    {
      schema: {
        summary: 'Detalhe da midia; grava em media no primeiro acesso',
        tags: ['media'],
        params: z.object({
          source: mediaSourceSchema,
          type: mediaTypeSchema,
          id: z.coerce.number().int().positive()
        }),
        response: { 200: mediaDetailSchema }
      }
    },
    async (request) => {
      await consumeRateLimit(app.db, `media:ip:${request.ip}`, 120, 60);

      const { source, type, id } = request.params;

      /** Anime so vem das fontes de anime; filme e serie so do TMDB.
       *  Combinacao invalida e 404, nao 400: a URL e publica e indexavel. */
      const valid = source === 'tmdb' ? type !== 'anime' : type === 'anime';
      if (!valid) throw notFound('Midia nao encontrada.');

      const detail = await getMediaDetail(app.db, source, type, id);
      if (!detail) throw notFound('Midia nao encontrada.');

      return detail;
    }
  );

  app.get(
    '/media/:source/:type/:id/recommendations',
    {
      schema: {
        summary: 'Obras parecidas, segundo a fonte',
        tags: ['media'],
        params: z.object({
          source: mediaSourceSchema,
          type: mediaTypeSchema,
          id: z.coerce.number().int().positive()
        }),
        response: { 200: recommendationsSchema }
      }
    },
    async (request) => {
      await consumeRateLimit(app.db, `recs:ip:${request.ip}`, 60, 60);

      const { source, type, id } = request.params;
      const items = await getRecommendationsFor(source, type, id);

      return { items };
    }
  );
};