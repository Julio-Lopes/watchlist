import type { ErrorCode } from '@watchlist/shared';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode | string;
  readonly details: unknown;

  constructor(statusCode: number, code: ErrorCode | string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** Recurso privado responde 404, nunca 403: 403 confirma que ele existe. */
export const notFound = (message = 'Recurso nao encontrado.', details?: unknown) =>
  new AppError(404, 'NOT_FOUND', message, details);

export const unauthorized = (message = 'Sessao invalida ou expirada.') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Voce nao tem permissao para isso.') =>
  new AppError(403, 'FORBIDDEN', message);

export const conflict = (message = 'Esse registro ja existe.', details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details);

export const unprocessable = (message: string, details?: unknown) =>
  new AppError(422, 'UNPROCESSABLE', message, details);

export const rateLimited = (message = 'Muitas tentativas. Tente de novo em instantes.') =>
  new AppError(429, 'RATE_LIMITED', message);