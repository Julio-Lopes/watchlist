import { createHash, randomBytes } from 'node:crypto';

/** 32 bytes: o token que vai no cookie ou no link de e-mail. */
export const generateToken = (): string => randomBytes(32).toString('base64url');

/** SHA-256 em hex, 64 caracteres, encaixa em char(64).
 *  O banco guarda so o hash: dump vazado nao vira sessao nem reset valido. */
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');