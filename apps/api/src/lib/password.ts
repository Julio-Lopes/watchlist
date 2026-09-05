import { hash, verify } from '@node-rs/argon2';

/** Parametros OWASP para argon2id: 19 MiB, 2 iteracoes, 1 thread.
 *  A string evita o const enum Algorithm, que nao passa com verbatimModuleSyntax. */
const OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
} as const;

export const hashPassword = (plain: string): Promise<string> => hash(plain, OPTIONS);

export const verifyPassword = (digest: string, plain: string): Promise<boolean> =>
  verify(digest, plain, OPTIONS);

let dummy: Promise<string> | null = null;

/**
 * Hash descartavel para igualar o tempo do login quando o e-mail nao existe.
 * Sem isso, responder rapido para inexistente e devagar para existente
 * entrega por cronometro o que a mensagem de erro esconde.
 */
export async function burnPasswordTime(): Promise<void> {
  dummy ??= hashPassword(crypto.randomUUID());
  await verify(await dummy, 'senha-que-nunca-confere', OPTIONS).catch(() => false);
}