import {
  collectionItems,
  collections,
  type Database,
  media,
  mediaEntries,
  userProfiles,
  users
} from '@watchlist/db';
import type { CollectionDetail, CollectionSummary } from '@watchlist/shared';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { conflict, notFound } from '../lib/errors.js';

/** Slug a partir do nome. Colisao dentro do mesmo usuario ganha sufixo, e o
 *  UNIQUE (user_id, slug) e quem garante de verdade. */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return base || 'colecao';
}

/**
 * Fractional indexing sobre numeric. Soltar entre 1 e 2 grava 1.5, sem tocar
 * nos vizinhos. Ver decisao da Etapa 1. O driver devolve numeric como string,
 * entao a conversao fica isolada aqui.
 */
function between(previous: string | null, next: string | null): string {
  const before = previous === null ? 0 : Number(previous);
  const after = next === null ? before + 200 : Number(next);
  return ((before + after) / 2).toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
}

async function coversFor(db: Database, collectionIds: string[]) {
  if (collectionIds.length === 0) return new Map<string, string[]>();

  const rows = await db
    .select({
      collectionId: collectionItems.collectionId,
      coverImage: media.coverImage,
      position: collectionItems.position
    })
    .from(collectionItems)
    .innerJoin(media, eq(media.id, collectionItems.mediaId))
    .where(inArray(collectionItems.collectionId, collectionIds))
    .orderBy(asc(collectionItems.position));

  const byCollection = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.coverImage) continue;
    const list = byCollection.get(row.collectionId) ?? [];
    if (list.length < 6) list.push(row.coverImage);
    byCollection.set(row.collectionId, list);
  }

  return byCollection;
}

export async function listCollections(
  db: Database,
  userId: string
): Promise<CollectionSummary[]> {
  const rows = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, userId))
    .orderBy(desc(collections.updatedAt));

  const covers = await coversFor(db, rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isPublic: row.isPublic,
    isRanked: row.isRanked,
    itemCount: row.itemCount,
    updatedAt: row.updatedAt.toISOString(),
    covers: covers.get(row.id) ?? []
  }));
}

export async function listPublicCollections(
  db: Database,
  username: string,
  viewerId: string | null
): Promise<CollectionSummary[]> {
  const [owner] = await db
    .select({ id: users.id, isPrivate: userProfiles.isPrivate })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!owner) throw notFound('Perfil nao encontrado.');

  const isOwner = owner.id === viewerId;
  if (owner.isPrivate && !isOwner) throw notFound('Perfil nao encontrado.');

  const filters = [eq(collections.userId, owner.id)];
  if (!isOwner) filters.push(eq(collections.isPublic, true));

  const rows = await db
    .select()
    .from(collections)
    .where(and(...filters))
    .orderBy(desc(collections.updatedAt));

  const covers = await coversFor(db, rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isPublic: row.isPublic,
    isRanked: row.isRanked,
    itemCount: row.itemCount,
    updatedAt: row.updatedAt.toISOString(),
    covers: covers.get(row.id) ?? []
  }));
}

export async function getCollection(
  db: Database,
  username: string,
  slug: string,
  viewerId: string | null
): Promise<CollectionDetail> {
  const [row] = await db
    .select({
      collection: collections,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      ownerId: users.id,
      isPrivate: userProfiles.isPrivate
    })
    .from(collections)
    .innerJoin(users, eq(users.id, collections.userId))
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(eq(users.username, username.toLowerCase()), eq(collections.slug, slug)))
    .limit(1);

  if (!row) throw notFound('Colecao nao encontrada.');

  const isOwner = row.ownerId === viewerId;

  /** Colecao privada ou perfil privado responde 404, nunca 403: 403 confirma
   *  que existe, e isso ja e informacao. */
  if (!isOwner && (!row.collection.isPublic || row.isPrivate)) {
    throw notFound('Colecao nao encontrada.');
  }

  const items = await db
    .select({
      mediaId: collectionItems.mediaId,
      position: collectionItems.position,
      note: collectionItems.note,
      title: media.title,
      coverImage: media.coverImage,
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId,
      totalEpisodes: media.totalEpisodes,
      episodeDuration: media.episodeDuration,
      ownerRating: mediaEntries.userRating
    })
    .from(collectionItems)
    .innerJoin(media, eq(media.id, collectionItems.mediaId))
    /** Nota do dono, nao do visitante: a colecao e a curadoria dele. */
    .leftJoin(
      mediaEntries,
      and(eq(mediaEntries.mediaId, media.id), eq(mediaEntries.userId, row.ownerId))
    )
    .where(eq(collectionItems.collectionId, row.collection.id))
    .orderBy(asc(collectionItems.position));

  const totalEpisodes = items.reduce((sum, item) => sum + (item.totalEpisodes ?? 0), 0);
  const totalMinutes = items.reduce(
    (sum, item) => sum + (item.totalEpisodes ?? 0) * (item.episodeDuration ?? 0),
    0
  );

  return {
    id: row.collection.id,
    slug: row.collection.slug,
    name: row.collection.name,
    description: row.collection.description,
    isPublic: row.collection.isPublic,
    isRanked: row.collection.isRanked,
    itemCount: row.collection.itemCount,
    updatedAt: row.collection.updatedAt.toISOString(),
    covers: items
      .flatMap((item) => (item.coverImage ? [item.coverImage] : []))
      .slice(0, 6),
    owner: {
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl
    },
    totalEpisodes,
    totalMinutes,
    items,
    isOwner
  };
}

async function assertOwner(db: Database, collectionId: string, userId: string) {
  const [row] = await db
    .select({ id: collections.id, isRanked: collections.isRanked })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1);

  if (!row) throw notFound('Colecao nao encontrada.');
  return row;
}

export async function createCollection(
  db: Database,
  userId: string,
  input: { name: string; description?: string | null; isPublic: boolean; isRanked: boolean }
) {
  const base = slugify(input.name);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;

    const [created] = await db
      .insert(collections)
      .values({
        userId,
        slug,
        name: input.name,
        description: input.description ?? null,
        isPublic: input.isPublic,
        isRanked: input.isRanked
      })
      .onConflictDoNothing()
      .returning({ id: collections.id, slug: collections.slug });

    if (created) return created;
  }

  throw conflict('Nao foi possivel gerar um endereco para essa colecao.');
}

export async function addItem(
  db: Database,
  userId: string,
  collectionId: string,
  mediaId: string,
  note: string | null
): Promise<void> {
  await assertOwner(db, collectionId, userId);

  await db.transaction(async (tx) => {
    const [last] = await tx
      .select({ position: collectionItems.position })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, collectionId))
      .orderBy(desc(collectionItems.position))
      .limit(1);

    const inserted = await tx
      .insert(collectionItems)
      .values({
        collectionId,
        mediaId,
        note,
        position: between(last?.position ?? null, null)
      })
      .onConflictDoNothing()
      .returning({ id: collectionItems.id });

    if (inserted.length === 0) throw conflict('Essa obra ja esta na colecao.');

    /** item_count denormalizado, atualizado na mesma transacao: a listagem
     *  mostra o numero sem contar itens de cada colecao. */
    await tx
      .update(collections)
      .set({ itemCount: sql`${collections.itemCount} + 1` })
      .where(eq(collections.id, collectionId));
  });
}

export async function removeItem(
  db: Database,
  userId: string,
  collectionId: string,
  mediaId: string
): Promise<void> {
  await assertOwner(db, collectionId, userId);

  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(collectionItems)
      .where(
        and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.mediaId, mediaId))
      )
      .returning({ id: collectionItems.id });

    if (removed.length === 0) throw notFound('Item nao encontrado.');

    await tx
      .update(collections)
      .set({ itemCount: sql`greatest(0, ${collections.itemCount} - 1)` })
      .where(eq(collections.id, collectionId));
  });
}

export async function updateItem(
  db: Database,
  userId: string,
  collectionId: string,
  mediaId: string,
  input: { note?: string | null; afterMediaId?: string | null; beforeMediaId?: string | null }
): Promise<void> {
  await assertOwner(db, collectionId, userId);

  const patch: Record<string, unknown> = {};

  if (input.note !== undefined) patch.note = input.note;

  if (input.afterMediaId !== undefined || input.beforeMediaId !== undefined) {
    const positionOf = async (target: string | null | undefined): Promise<string | null> => {
      if (!target) return null;

      const [row] = await db
        .select({ position: collectionItems.position })
        .from(collectionItems)
        .where(
          and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.mediaId, target))
        )
        .limit(1);

      return row?.position ?? null;
    };

    patch.position = between(
      await positionOf(input.afterMediaId),
      await positionOf(input.beforeMediaId)
    );
  }

  if (Object.keys(patch).length === 0) return;

  await db
    .update(collectionItems)
    .set(patch)
    .where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.mediaId, mediaId)));

  await db
    .update(collections)
    .set({ updatedAt: new Date() })
    .where(eq(collections.id, collectionId));
}