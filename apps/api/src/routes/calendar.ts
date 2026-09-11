import {
  scheduleQuerySchema,
  scheduleResponseSchema,
  seasonQuerySchema,
  seasonResponseSchema
} from '@watchlist/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { currentSeason, getSeasonCalendar, getWeekSchedule } from '../services/calendar.js';

export const calendarRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/calendar/schedule',
    {
      schema: {
        summary: 'Agenda da semana, por dia',
        tags: ['calendar'],
        querystring: scheduleQuerySchema,
        response: { 200: scheduleResponseSchema }
      }
    },
    async (request) => {
      /** Limite baixo porque cada chamada faz sete requisicoes ao Jikan, uma
       *  por dia da semana. */
      await consumeRateLimit(app.db, `calendar:ip:${request.ip}`, 10, 60);

      return getWeekSchedule(app.db, request.viewer?.id ?? null, request.query.scope);
    }
  );

  app.get(
    '/calendar/season',
    {
      schema: {
        summary: 'Animes de uma temporada',
        tags: ['calendar'],
        querystring: seasonQuerySchema,
        response: { 200: seasonResponseSchema }
      }
    },
    async (request) => {
      await consumeRateLimit(app.db, `calendar:ip:${request.ip}`, 30, 60);

      /** A temporada corrente sai do relogio do servidor, nao do cliente:
       *  duas abas com relogios diferentes mostrariam temporadas diferentes. */
      const fallback = currentSeason();
      const year = request.query.year ?? fallback.year;
      const season = request.query.season ?? fallback.season;

      const result = await getSeasonCalendar(
        app.db,
        year,
        season,
        request.query.page,
        request.viewer?.id ?? null
      );

      /** O filtro "meus" acontece aqui, sobre o que ja veio marcado: a fonte
       *  externa nao sabe o que esta na sua biblioteca. */
      const items =
        request.query.scope === 'mine'
          ? result.items.filter((item) => item.inLibrary === true)
          : result.items;

      return {
        year,
        season,
        items,
        hasMore: result.hasMore,
        inLibraryCount: result.inLibraryCount,
        degraded: result.degraded
      };
    }
  );
};