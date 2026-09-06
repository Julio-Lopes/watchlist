import { media, mediaEntries } from '@watchlist/db';
import {
  entryCountsSchema,
  entrySchema,
  featuredMediaSchema,
  type EntryCounts
} from '@watchlist/shared';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { listEntries } from '../services/entries.js';

export const libraryRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/entries/counts',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Contagem por status e por tipo',
        tags: ['entries'],
        response: { 200: entryCountsSchema }
      }
    },
    async (request) => {
      const userId = request.viewer!.id;

      /** Duas agregacoes, nao uma por filtro. A coluna lateral mostra dez
       *  numeros e nao pode custar dez idas ao banco. */
      const [byStatus, byType] = await Promise.all([
        app.db
          .select({ key: mediaEntries.status, total: count() })
          .from(mediaEntries)
          .where(eq(mediaEntries.userId, userId))
          .groupBy(mediaEntries.status),
        app.db
          .select({ key: media.mediaType, total: count() })
          .from(mediaEntries)
          .innerJoin(media, eq(media.id, mediaEntries.mediaId))
          .where(eq(mediaEntries.userId, userId))
          .groupBy(media.mediaType)
      ]);

      const counts: EntryCounts = { byStatus: {}, byType: {}, total: 0 };

      for (const row of byStatus) {
        counts.byStatus[row.key] = row.total;
        counts.total += row.total;
      }

      for (const row of byType) {
        counts.byType[row.key] = row.total;
      }

      return counts;
    }
  );

  app.get(
    '/entries/continue',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Obras em andamento, para retomar',
        tags: ['entries'],
        querystring: z.object({ limit: z.coerce.number().int().min(1).max(8).default(4) }),
        response: { 200: z.object({ items: z.array(entrySchema) }) }
      }
    },
    async (request) => {
      /** So 'watching': pausado e largado nao sao coisas para retomar hoje,
       *  e planejado nem comecou. */
      const page = await listEntries(app.db, request.viewer!.id, {
        status: 'watching',
        sort: 'recent'
      });

      return { items: page.items.slice(0, request.query.limit) };
    }
  );

  app.get(
    '/media/featured',
    {
      schema: {
        summary: 'Midia em destaque do dia, para a tela de entrada',
        tags: ['media'],
        response: { 200: featuredMediaSchema.nullable() }
      }
    },
    async () => {
      /** Publica e sem sessao: quem ve esta tela ainda nao entrou. */
      const pool = await app.db
        .select({
          title: media.title,
          bannerImage: media.bannerImage,
          year: media.year,
          source: media.source,
          mediaType: media.mediaType,
          externalId: media.externalId
        })
        .from(media)
        .where(and(isNotNull(media.bannerImage), isNotNull(media.avgScore)))
        .orderBy(desc(media.avgScore))
        .limit(30);

      if (pool.length === 0) return null;

      /** Escolha deterministica pela data: a mesma imagem o dia inteiro, para
       *  a tela nao piscar entre tentativas de login. */
      const day = Math.floor(Date.now() / 86_400_000);
      const chosen = pool[day % pool.length];

      if (!chosen?.bannerImage) return null;

      return { ...chosen, bannerImage: chosen.bannerImage };
    }
  );
};