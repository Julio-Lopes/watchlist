import type { FastifyReply } from 'fastify';
import { env, isProduction } from '../env.js';

export const SESSION_COOKIE = 'wl_session';
export const OAUTH_STATE_COOKIE = 'wl_oauth_state';
export const OAUTH_VERIFIER_COOKIE = 'wl_oauth_verifier';

/**
 * Sem atributo Domain, de proposito. Com o proxy por rewrite decidido na
 * Etapa 0, o cookie e de primeira parte no dominio da Vercel. Adicionar
 * Domain aqui quebraria o fluxo inteiro.
 */
const base = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/'
} as const;

export function setSessionCookie(reply: FastifyReply, token: string): void {
  void reply.setCookie(SESSION_COOKIE, token, {
    ...base,
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  void reply.clearCookie(SESSION_COOKIE, base);
}

/** Vivem os 10 minutos do redirect ao Google e voltam assinados. */
export function setOAuthCookies(reply: FastifyReply, state: string, verifier: string): void {
  const options = { ...base, signed: true, maxAge: 600 };
  void reply.setCookie(OAUTH_STATE_COOKIE, state, options);
  void reply.setCookie(OAUTH_VERIFIER_COOKIE, verifier, options);
}

export function clearOAuthCookies(reply: FastifyReply): void {
  void reply.clearCookie(OAUTH_STATE_COOKIE, base);
  void reply.clearCookie(OAUTH_VERIFIER_COOKIE, base);
}