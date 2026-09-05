'use client';

import { errorEnvelopeSchema } from '@watchlist/shared';
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * [SLEEP] O Railway dorme. A primeira requisicao depois de um periodo ocioso
 * leva alguns segundos, e o usuario precisa saber que nao travou. Mas avisar
 * de imediato faria uma resposta de 300 ms parecer defeito, entao o aviso
 * so aparece depois deste limite.
 */
const SLOW_REQUEST_MS = 2000;

type Listener = (waking: boolean) => void;

const listeners = new Set<Listener>();
let slowRequests = 0;

const emit = (): void => {
  for (const listener of listeners) listener(slowRequests > 0);
};

export function onWakingChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

interface FetchOptions<TSchema extends z.ZodType> extends Omit<RequestInit, 'body'> {
  schema?: TSchema;
  body?: unknown;
}

/**
 * Caminho relativo de proposito. O rewrite do next.config.ts encaminha
 * /api/* para o Railway, entao o cookie e de primeira parte e nao ha CORS.
 */
export async function apiFetch<TSchema extends z.ZodType>(
  path: string,
  { schema, body, headers, ...init }: FetchOptions<TSchema> = {}
): Promise<TSchema extends z.ZodType ? z.infer<TSchema> : unknown> {
  let counted = false;

  const timer = setTimeout(() => {
    counted = true;
    slowRequests += 1;
    emit();
  }, SLOW_REQUEST_MS);

  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });

    if (response.status === 204) return undefined as never;

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const parsed = errorEnvelopeSchema.safeParse(payload);

      throw new ApiError(
        response.status,
        parsed.success ? parsed.data.error.code : 'INTERNAL_ERROR',
        parsed.success ? parsed.data.error.message : 'Algo deu errado. Tente de novo.',
        parsed.success ? parsed.data.error.details : undefined
      );
    }

    return schema ? (schema.parse(payload) as never) : (payload as never);
  } finally {
    clearTimeout(timer);
    if (counted) {
      slowRequests -= 1;
      emit();
    }
  }
}