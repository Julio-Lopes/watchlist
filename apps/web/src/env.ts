import { parseEnv } from '@watchlist/shared';
import { z } from 'zod';

const envSchema = z.object({
  API_ORIGIN: z.url()
});

export type Env = z.infer<typeof envSchema>;

/** Somente servidor. Nunca importe este modulo de um Client Component. */
export const env: Env = parseEnv(envSchema);