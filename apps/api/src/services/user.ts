import { randomBytes } from 'node:crypto';
import { PLACEHOLDER_USERNAME_PREFIX } from '@watchlist/shared';
import { eq } from 'drizzle-orm';
import { type Database, oauthAccounts, userProfiles, users } from '@watchlist/db';
import { conflict } from '../lib/errors.js';

/** Nunca aparece em URL nem em tela. O prefixo e reservado no cadastro. */
const placeholderUsername = (): string =>
  `${PLACEHOLDER_USERNAME_PREFIX}${randomBytes(4).toString('hex')}`;

interface NewUser {
  email: string;
  passwordHash?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}

export async function createUser(db: Database, input: NewUser) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        username: placeholderUsername(),
        email: input.email,
        passwordHash: input.passwordHash ?? null,
        displayName: input.displayName ?? null,
        avatarUrl: input.avatarUrl ?? null,
        emailVerifiedAt: input.emailVerified ? new Date() : null
      })
      .returning();

    if (!user) throw new Error('insert de usuario nao retornou linha');

    await tx.insert(userProfiles).values({ userId: user.id });

    return user;
  });
}

export const findUserByEmail = async (db: Database, email: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
};

export async function setUsername(db: Database, userId: string, username: string) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) throw conflict('Esse nome de usuario ja esta em uso.');

  await db
    .update(users)
    .set({ username, usernameSetAt: new Date() })
    .where(eq(users.id, userId));
}

export async function linkOAuthAccount(
  db: Database,
  userId: string,
  providerAccountId: string
) {
  await db
    .insert(oauthAccounts)
    .values({ userId, provider: 'google', providerAccountId })
    .onConflictDoNothing();
}

export const findUserByOAuth = async (db: Database, providerAccountId: string) => {
  const [row] = await db
    .select({ user: users })
    .from(oauthAccounts)
    .innerJoin(users, eq(users.id, oauthAccounts.userId))
    .where(eq(oauthAccounts.providerAccountId, providerAccountId))
    .limit(1);

  return row?.user ?? null;
};
