import { type Database, sessions, userProfiles, users } from '@watchlist/db';
import type { Viewer } from '@watchlist/shared';
import { eq, lt } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { env } from '../env.js';
import { generateToken, hashToken } from '../lib/crypto.js';

/** Escrever last_seen_at a cada requisicao seria um UPDATE por pageview. */
const TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export async function createSession(
  db: Database,
  userId: string,
  request: FastifyRequest
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ip: request.ip,
    userAgent: request.headers['user-agent']?.slice(0, 300) ?? null
  });

  return token;
}

export async function resolveViewer(
  db: Database,
  token: string
): Promise<Viewer | null> {
  const id = hashToken(token);

  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      email: users.email,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      usernameSetAt: users.usernameSetAt,
      deletedAt: users.deletedAt,
      /** Carregado aqui porque toda rota social precisa filtrar por ele.
       *  Uma coluna a mais numa query que ja roda em cada requisicao. */
      spoilerMode: userProfiles.spoilerMode,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);

  if (!row || row.deletedAt) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  if (Date.now() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    email: row.email,
    role: row.role,
    emailVerified: row.emailVerifiedAt !== null,
    needsUsername: row.usernameSetAt === null,
    /** leftJoin com fallback: um usuario sem linha em user_profiles nao pode
     *  ficar impedido de entrar por causa de uma preferencia. */
    spoilerMode: row.spoilerMode ?? 'soft'
  };
}

export const deleteSession = (db: Database, token: string) =>
  db.delete(sessions).where(eq(sessions.id, hashToken(token)));

/** Usado no logout-all e, obrigatoriamente, no reset de senha. */
export const deleteAllSessions = (db: Database, userId: string) =>
  db.delete(sessions).where(eq(sessions.userId, userId));

export const deleteExpiredSessions = (db: Database) =>
  db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
