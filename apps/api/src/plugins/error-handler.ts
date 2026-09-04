import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { isProduction } from '../env.js';
import { AppError } from '../lib/errors.js';

/** Codigo do Postgres para violacao de unicidade. */
const PG_UNIQUE_VIOLATION = '23505';
/** O Neon responde assim quando o compute foi suspenso por estouro de cota. */
const PG_QUOTA_MESSAGES = ['quota', 'compute time exceeded'];

interface PgLikeError {
  code?: string;
  constraint?: string;
  message?: string;
}

export const errorHandler = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, request, reply) => {
    const send = (statusCode: number, code: string, message: string, details?: unknown) =>
      reply.status(statusCode).send({ error: { code, message, ...(details ? { details } : {}) } });

    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        path: issue.instancePath,
        message: issue.message
      }));
      request.log.info({ details }, 'validation failed');
      return send(400, 'VALIDATION_ERROR', 'Dados invalidos.', details);
    }

    if (error instanceof AppError) {
      request.log.info({ code: error.code }, error.message);
      return send(error.statusCode, error.code, error.message, error.details);
    }

    const pgError = error as PgLikeError;

    if (pgError.code === PG_UNIQUE_VIOLATION) {
      request.log.info({ constraint: pgError.constraint }, 'unique violation');
      return send(409, 'CONFLICT', 'Esse registro ja existe.');
    }

    const message = pgError.message?.toLowerCase() ?? '';
    if (PG_QUOTA_MESSAGES.some((needle) => message.includes(needle))) {
      request.log.error({ err: error }, 'neon quota exceeded');
      return send(
        503,
        'DATABASE_QUOTA_EXCEEDED',
        'O banco de dados atingiu a cota do plano gratuito. O servico volta no proximo ciclo.'
      );
    }

    /** Nada de stack trace na resposta. O x-request-id liga a tela ao log. */
    request.log.error({ err: error }, 'unhandled error');
    return send(
      500,
      'INTERNAL_ERROR',
      isProduction ? 'Erro interno. Tente novamente.' : (pgError.message ?? 'Erro interno.')
    );
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rota nao encontrada.' } });
  });
});