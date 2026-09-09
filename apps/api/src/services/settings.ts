import {
  type Database,
  media,
  mediaEntries,
  presetAvatars,
  sessions,
  userProfiles,
  users,
  watchEvents
} from '@watchlist/db';
import type { Settings } from '@watchlist/shared';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { notFound, unprocessable } from '../lib/errors.js';

const DAY_MS = 86_400_000;

const toIso = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

export async function getSettings(db: Database, userId: string): Promise<Settings> {
  const [row] = await db
    .select({
      username: users.username,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      passwordHash: users.passwordHash,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: userProfiles.bio,
      avatarType: userProfiles.avatarType,
      avatarPresetId: userProfiles.avatarPresetId,
      bannerMediaId: userProfiles.bannerMediaId,
      theme: userProfiles.theme,
      isPrivate: userProfiles.isPrivate,
      timezone: userProfiles.timezone,
      ratingScale: userProfiles.ratingScale,
      spoilerMode: userProfiles.spoilerMode,
      bannerImage: media.bannerImage,
      bannerTitle: media.title
    })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(media, eq(media.id, userProfiles.bannerMediaId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) throw notFound('Conta nao encontrada.');

  const [entries] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(mediaEntries)
    .where(eq(mediaEntries.userId, userId));

  const [minutes] = await db
    .select({ total: sql<number>`coalesce(sum(${media.episodeDuration}), 0)::int` })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(eq(watchEvents.userId, userId));

  const allDates = await db
    .selectDistinct({ date: watchEvents.watchedOn })
    .from(watchEvents)
    .where(eq(watchEvents.userId, userId));

  const active = new Set(allDates.map((entry) => entry.date));
  const today = toIso(new Date());
  let currentStreak = 0;
  let cursor = active.has(today) ? today : toIso(new Date(Date.parse(today) - DAY_MS));

  while (active.has(cursor)) {
    currentStreak += 1;
    cursor = toIso(new Date(Date.parse(cursor) - DAY_MS));
  }

  return {
    username: row.username,
    email: row.email,
    emailVerified: row.emailVerifiedAt !== null,
    hasPassword: row.passwordHash !== null,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    avatarType: row.avatarType,
    avatarPresetId: row.avatarPresetId,
    bannerMediaId: row.bannerMediaId,
    bannerImage: row.bannerImage,
    bannerTitle: row.bannerTitle,
    theme: row.theme,
    isPrivate: row.isPrivate,
    timezone: row.timezone,
    ratingScale: row.ratingScale,
    spoilerMode: row.spoilerMode,
    totalEntries: entries?.total ?? 0,
    totalMinutes: minutes?.total ?? 0,
    currentStreak
  };
}

interface ProfileInput {
  displayName?: string | null;
  bio?: string | null;
  avatarPresetId?: string | null;
  /** Ja resolvido pela rota: undefined nao mexe, null remove, string define. */
  bannerMediaId?: string | null;
  theme?: 'cinema' | 'manga' | 'retro';
}

export async function updateProfile(
  db: Database,
  userId: string,
  input: ProfileInput
): Promise<void> {
  await db.transaction(async (tx) => {
    if (input.displayName !== undefined) {
      await tx
        .update(users)
        .set({ displayName: input.displayName })
        .where(eq(users.id, userId));
    }

    /** avatar_url guarda a URL resolvida para o feed e a navbar nao precisarem
     *  de join. Escrever nas duas tabelas na mesma transacao mantem as duas
     *  coerentes. Ver decisao da Etapa 12. */
    if (input.avatarPresetId !== undefined && input.avatarPresetId !== null) {
      const [preset] = await tx
        .select({ imageUrl: presetAvatars.imageUrl })
        .from(presetAvatars)
        .where(eq(presetAvatars.id, input.avatarPresetId))
        .limit(1);

      if (!preset) throw notFound('Avatar nao encontrado.');

      await tx.update(users).set({ avatarUrl: preset.imageUrl }).where(eq(users.id, userId));
    }

    if (input.bannerMediaId !== undefined && input.bannerMediaId !== null) {
      const [chosen] = await tx
        .select({ bannerImage: media.bannerImage })
        .from(media)
        .where(eq(media.id, input.bannerMediaId))
        .limit(1);

      if (!chosen?.bannerImage) {
        throw unprocessable('Essa obra nao tem banner disponivel.');
      }
    }

    const profileUpdate: Record<string, unknown> = {};

    if (input.bio !== undefined) profileUpdate.bio = input.bio;
    if (input.theme !== undefined) profileUpdate.theme = input.theme;
    if (input.bannerMediaId !== undefined) profileUpdate.bannerMediaId = input.bannerMediaId;

    if (input.avatarPresetId !== undefined) {
      profileUpdate.avatarPresetId = input.avatarPresetId;
      profileUpdate.avatarType = input.avatarPresetId === null ? 'custom' : 'preset';
    }

    if (Object.keys(profileUpdate).length > 0) {
      await tx.update(userProfiles).set(profileUpdate).where(eq(userProfiles.userId, userId));
    }
  });
}

interface PreferencesInput {
  isPrivate?: boolean;
  timezone?: string;
  ratingScale?: 'ten' | 'hundred' | 'stars';
  spoilerMode?: 'off' | 'soft' | 'strict';
}

export async function updatePreferences(
  db: Database,
  userId: string,
  input: PreferencesInput
): Promise<void> {
  if (input.timezone !== undefined) {
    /** Fuso invalido quebraria o calculo de watched_on e, com ele, o streak.
     *  O runtime tem a lista, entao a validacao e exata e nao exige tabela. */
    const valid = Intl.supportedValuesOf('timeZone').includes(input.timezone);
    if (!valid) throw unprocessable('Fuso horario invalido.');
  }

  await db.update(userProfiles).set(input).where(eq(userProfiles.userId, userId));
}

export async function listSessions(db: Database, userId: string, currentId: string) {
  const rows = await db
    .select({
      id: sessions.id,
      ip: sessions.ip,
      userAgent: sessions.userAgent,
      lastSeenAt: sessions.lastSeenAt,
      createdAt: sessions.createdAt
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastSeenAt));

  return rows.map((row) => ({
    ...row,
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    isCurrent: row.id === currentId
  }));
}

export async function revokeOtherSessions(
  db: Database,
  userId: string,
  keepId: string
): Promise<void> {
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, keepId)));
}