import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import { env, isProduction } from './env.js';
import { authPlugin } from './plugins/auth.js';
import { dbPlugin } from './plugins/db.js';
import { errorHandler } from './plugins/error-handler.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { mediaRoutes } from './routes/media.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: true,
    genReqId: (request) => (request.headers['x-request-id'] as string | undefined) ?? randomUUID(),
    logger: {
      level: env.LOG_LEVEL,
      /** Nada de credencial em log, nem em erro, nem em modo debug. */
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          '*.password',
          '*.token',
          '*.passwordHash'
        ],
        censor: '[redacted]'
      },
      ...(isProduction ? {} : { transport: { target: 'pino-pretty' } })
    }
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  /** Correlaciona o erro na tela com a linha de log no outro servico. */
  app.addHook('onSend', async (request, reply) => {
    void reply.header('x-request-id', request.id);
  });

  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(errorHandler);
  await app.register(dbPlugin);
  await app.register(authPlugin);

  await app.register(swagger, {
    openapi: {
      info: { title: 'Watchlist API', version: '0.1.0' },
      servers: [{ url: `${env.WEB_ORIGIN}/api` }]
    },
    transform: jsonSchemaTransform
  });

  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(mediaRoutes);

  return app;
}