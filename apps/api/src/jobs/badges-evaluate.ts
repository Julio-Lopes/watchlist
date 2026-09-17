import { users } from '@watchlist/db';
import { isNull } from 'drizzle-orm';
import { evaluateBadges } from '../services/badges.js';
import type { JobContext } from './index.js';

/**
 * Avalia todo mundo uma vez por dia. A rota de listagem tambem avalia, entao
 * quem abre a tela ve na hora; o job cobre quem nao abre e garante que o
 * perfil publico esteja em dia.
 */
export async function badgesEvaluate({ db, log, onProgress }: JobContext): Promise<void> {
  const all = await db.select({ id: users.id }).from(users).where(isNull(users.deletedAt));

  let granted = 0;

  for (const [index, user] of all.entries()) {
    granted += await evaluateBadges(db, user.id);
    if (index % 10 === 0) await onProgress(index, all.length);
  }

  log.info({ users: all.length, granted }, 'badges.evaluate concluido');
}