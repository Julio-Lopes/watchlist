import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number()
});

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        summary: 'Verifica se o processo esta vivo',
        tags: ['system'],
        response: { 200: healthResponseSchema }
      }
    },
    async () => ({ status: 'ok' as const, uptime: Math.round(process.uptime()) })
  );
};