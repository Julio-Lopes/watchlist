import { parseEnv } from '@watchlist/shared';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().min(1, 'obrigatoria'),
  WEB_ORIGIN: z.url(),
  /** Segredo de 32+ bytes. Assina os cookies curtos do fluxo OAuth. */
  COOKIE_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),
  /** Ausente em dev: o e-mail vai para o log em vez de sair de verdade. */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Watchlist <onboarding@resend.dev>'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** Chave do TMDB. Aceita a v3 (string curta) ou o token v4 (JWT, comeca com eyJ). */
  TMDB_API_KEY: z.string().min(1),
  /** O limite oficial da AniList e 90/min, mas ela ja operou degradada a 30
   *  sem sinalizar nos headers. Padrao conservador, ajustavel sem deploy. */
  ANILIST_RATE_LIMIT: z.coerce.number().int().positive().default(30),
  /** Espacamento minimo entre chamadas, contra o limitador de rajada. */
  ANILIST_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(700),
  /** Idade maxima de media.refreshed_at antes de rebuscar na fonte. */
  MEDIA_TTL_HOURS: z.coerce.number().int().positive().default(24)
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = parseEnv(envSchema);
export const isProduction = env.NODE_ENV === 'production';