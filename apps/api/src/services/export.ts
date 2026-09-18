import {
  badges,
  collectionItems,
  collections,
  type Database,
  media,
  mediaEntries,
  mediaEntryTags,
  reviews,
  userBadges,
  userProfiles,
  users,
  userTags,
  watchEvents
} from '@watchlist/db';
import { asc, eq } from 'drizzle-orm';
import { notFound } from '../lib/errors.js';

/**
 * Exportacao completa. Diferente da importacao, aqui nao ha fonte externa:
 * sao consultas no banco, e uma biblioteca de trezentas obras sai em menos
 * de um segundo. Por isso e sincrono, sem job.
 */
export async function exportAll(db: Database, userId: string) {
  const [account] = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      createdAt: users.createdAt,
      bio: userProfiles.bio,
      timezone: userProfiles.timezone,
      ratingScale: userProfiles.ratingScale
    })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!account) throw notFound('Conta nao encontrada.');

  const entries = await db
    .select({
      status: mediaEntries.status,
      episodesWatched: mediaEntries.episodesWatched,
      /** Nota interna 0 a 100. O JSON leva as duas escalas para nao obrigar
       *  quem le a conhecer a convencao. */
      userRating: mediaEntries.userRating,
      rewatchCount: mediaEntries.rewatchCount,
      isFavorite: mediaEntries.isFavorite,
      dropReason: mediaEntries.dropReason,
      /** Campo privado, que nunca sai em rota publica. Aqui sai: e seu. */
      notes: mediaEntries.notes,
      startedAt: mediaEntries.startedAt,
      finishedAt: mediaEntries.finishedAt,
      createdAt: mediaEntries.createdAt,
      updatedAt: mediaEntries.updatedAt,
      entryId: mediaEntries.id,
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId,
      malId: media.malId,
      imdbId: media.imdbId,
      title: media.title,
      year: media.year,
      totalEpisodes: media.totalEpisodes,
      episodeDuration: media.episodeDuration,
      genres: media.genres
    })
    .from(mediaEntries)
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(eq(mediaEntries.userId, userId))
    .orderBy(asc(media.title));

  const events = await db
    .select({
      watchedOn: watchEvents.watchedOn,
      episodeNumber: watchEvents.episodeNumber,
      episodesDelta: watchEvents.episodesDelta,
      isRewatch: watchEvents.isRewatch,
      createdAt: watchEvents.createdAt,
      title: media.title,
      source: media.source,
      externalId: media.externalId
    })
    .from(watchEvents)
    .innerJoin(mediaEntries, eq(mediaEntries.id, watchEvents.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(eq(watchEvents.userId, userId))
    .orderBy(asc(watchEvents.watchedOn));

  const written = await db
    .select({
      content: reviews.content,
      containsSpoilers: reviews.containsSpoilers,
      likesCount: reviews.likesCount,
      createdAt: reviews.createdAt,
      title: media.title,
      source: media.source,
      externalId: media.externalId
    })
    .from(reviews)
    .innerJoin(mediaEntries, eq(mediaEntries.id, reviews.mediaEntryId))
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(eq(reviews.userId, userId))
    .orderBy(asc(reviews.createdAt));

  const lists = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, userId))
    .orderBy(asc(collections.createdAt));

  const listItems = await db
    .select({
      collectionId: collectionItems.collectionId,
      position: collectionItems.position,
      note: collectionItems.note,
      title: media.title,
      source: media.source,
      externalId: media.externalId
    })
    .from(collectionItems)
    .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
    .innerJoin(media, eq(media.id, collectionItems.mediaId))
    .where(eq(collections.userId, userId))
    .orderBy(asc(collectionItems.position));

  const tags = await db
    .select({ id: userTags.id, name: userTags.name, color: userTags.color })
    .from(userTags)
    .where(eq(userTags.userId, userId));

  const entryTags = await db
    .select({ entryId: mediaEntryTags.mediaEntryId, tagId: mediaEntryTags.tagId })
    .from(mediaEntryTags)
    .innerJoin(mediaEntries, eq(mediaEntries.id, mediaEntryTags.mediaEntryId))
    .where(eq(mediaEntries.userId, userId));

  const earned = await db
    .select({ slug: badges.slug, name: badges.name, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId));

  const tagsByEntry = new Map<string, string[]>();

  for (const row of entryTags) {
    const list = tagsByEntry.get(row.entryId) ?? [];
    list.push(row.tagId);
    tagsByEntry.set(row.entryId, list);
  }

  return {
    /** Versao do formato: se um dia mudarmos a estrutura, quem guardou um
     *  arquivo antigo sabe qual e. */
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    account: {
      ...account,
      createdAt: account.createdAt.toISOString()
    },
    entries: entries.map((entry) => ({
      ...entry,
      ratingOutOfTen: entry.userRating === null ? null : entry.userRating / 10,
      tagIds: tagsByEntry.get(entry.entryId) ?? [],
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    })),
    watchEvents: events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString()
    })),
    reviews: written.map((review) => ({
      ...review,
      createdAt: review.createdAt.toISOString()
    })),
    collections: lists.map((list) => ({
      slug: list.slug,
      name: list.name,
      description: list.description,
      isPublic: list.isPublic,
      isRanked: list.isRanked,
      createdAt: list.createdAt.toISOString(),
      items: listItems
        .filter((item) => item.collectionId === list.id)
        .map(({ collectionId: _ignored, ...item }) => item)
    })),
    tags,
    badges: earned.map((badge) => ({ ...badge, earnedAt: badge.earnedAt.toISOString() }))
  };
}

/** Campo com virgula, aspas ou quebra precisa de aspas duplas, e aspas
 *  internas viram duas. Regra do RFC 4180. */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const csvRows = (rows: unknown[][]): string =>
  rows.map((row) => row.map(csvField).join(',')).join('\r\n');

const STATUS_LABEL: Record<string, string> = {
  watching: 'Assistindo',
  completed: 'Concluído',
  paused: 'Pausado',
  dropped: 'Largado',
  planning: 'Planejo assistir'
};

const TYPE_LABEL: Record<string, string> = { anime: 'Anime', show: 'Série', movie: 'Filme' };

export async function exportCsv(db: Database, userId: string): Promise<string> {
  const data = await exportAll(db, userId);

  const header = [
    'Título',
    'Tipo',
    'Ano',
    'Status',
    'Episódios assistidos',
    'Total de episódios',
    'Nota',
    'Favorito',
    'Rewatches',
    'Início',
    'Fim',
    'Gêneros',
    'Anotações'
  ];

  const rows = data.entries.map((entry) => [
    entry.title,
    TYPE_LABEL[entry.mediaType] ?? entry.mediaType,
    entry.year,
    STATUS_LABEL[entry.status] ?? entry.status,
    entry.episodesWatched,
    entry.totalEpisodes,
    entry.ratingOutOfTen === null ? '' : entry.ratingOutOfTen.toFixed(1).replace('.', ','),
    entry.isFavorite ? 'sim' : 'não',
    entry.rewatchCount,
    entry.startedAt,
    entry.finishedAt,
    (entry.genres ?? []).join('; '),
    entry.notes
  ]);

  /** BOM no inicio: sem ele o Excel no Windows le UTF-8 como latin-1 e os
   *  acentos viram lixo. */
  return `\uFEFF${csvRows([header, ...rows])}`;
}

/**
 * Formato de importacao do Letterboxd. So filmes: eles nao tem series nem
 * anime no catalogo, e mandar o resto so geraria erro na importacao deles.
 */
export async function exportLetterboxd(db: Database, userId: string): Promise<string> {
  const data = await exportAll(db, userId);

  const movies = data.entries.filter(
    (entry) => entry.mediaType === 'movie' && entry.status === 'completed'
  );

  const header = ['Title', 'Year', 'Rating10', 'WatchedDate', 'Review'];

  const rows = movies.map((entry) => [
    entry.title,
    entry.year,
    entry.ratingOutOfTen === null ? '' : entry.ratingOutOfTen.toFixed(1),
    entry.finishedAt,
    data.reviews.find((review) => review.externalId === entry.externalId)?.content ?? ''
  ]);

  return csvRows([header, ...rows]);
}