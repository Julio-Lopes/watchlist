import { z } from 'zod';

/**
 * Codigos de erro estaveis. O front decide comportamento por code,
 * nunca por message: message e texto de exibicao e pode mudar.
 */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE',
  'RATE_LIMITED',
  'DATABASE_QUOTA_EXCEEDED',
  'INTERNAL_ERROR'
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
