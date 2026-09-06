import {
  type Database,
  media,
  mediaEntries,
  userProfiles,
  userTags,
  mediaEntryTags,
  watchEvents
} from '@watchlist/db';
import type { Entry, EntryListQuery } from '@watchlist/shared';
import { and, asc, desc, eq, ilike, inArray, lt, or, sql } from 'drizzle-orm';
import { notFound } from '../lib/errors.js';

/**
 * Data local do usuario, calculada no servidor a partir do timezone do perfil.
 * en-CA porque formata como YYYY-MM-DD, que e o formato da coluna date.
 */
export function localDate(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

export async function getTimezone(db: Database, userId: string): Promise<string> {
  const [profile] = await db
    .select({ timezone: userProfiles.timezone })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return profile?.timezone ?? 'America/Sao_Paulo';
}

/** Cursor opaco sobre (updated_at, id). OFFSET degrada alem de 10 mil linhas,
 *  e trocar depois significaria reescrever tela e endpoint. */
const encodeCursor = (updatedAt: Date, id: string): string =>
  Buffer.from(`${updatedAt.toISOString()}|${id}`).toString('base64url');

const decodeCursor = (cursor: string): { updatedAt: Date; id: string } | null => {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (!iso || !id) return null;

  const updatedAt = new Date(iso);
  return Number.isNaN(updatedAt.getTime()) ? null : { updatedAt, id };
};

const ENTRY_COLUMNS = {
  id: mediaEntries.id,
  status: mediaEntries.status,
  userRating: mediaEntries.userRating,
  episodesWatched: mediaEntries.episodesWatched,
  rewatchCount: mediaEntries.rewatchCount,
  isFavorite: mediaEntries.isFavorite,
  dropReason: mediaEntries.dropReason,
  notes: mediaEntries.notes,
  startedAt: mediaEntries.startedAt,
  finishedAt: mediaEntries.finishedAt,
  updatedAt: mediaEntries.updatedAt,
  mediaId: media.id,
  source: media.source,
  mediaType: media.mediaType,
  externalId: media.externalId,
  title: media.title,
  coverImage: media.coverImage,
  year: media.year,
  avgScore: media.avgScore,
  totalEpisodes: media.totalEpisodes
} as const;

type Row = {
  id: string;
  status: Entry['status'];
  userRating: number | null;
  episodesWatched: number;
  rewatchCount: number;
  isFavorite: boolean;
  dropReason: Entry['dropReason'];
  notes: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: Date;
  mediaId: string;
  source: Entry['media']['source'];
  mediaType: Entry['media']['mediaType'];
  externalId: number;
  title: string;
  coverImage: string | null;
  year: number | null;
  avgScore: number | null;
  totalEpisodes: number | null;
};

/** Uma query para as tags de todas as entradas da pagina, nunca uma por
 *  entrada: 24 cards nao podem virar 25 idas ao banco. */
async function attachTags(db: Database, rows: Row[]): Promise<Entry[]> {
  const ids = rows.map((row) => row.id);

  const tagRows =
    ids.length === 0
      ? []
      : await db
          .select({
            entryId: mediaEntryTags.mediaEntryId,
            id: userTags.id,
            name: userTags.name,
            color: userTags.color
          })
          .from(mediaEntryTags)
          .innerJoin(userTags, eq(userTags.id, mediaEntryTags.tagId))
          .where(inArray(mediaEntryTags.mediaEntryId, ids));

  const byEntry = new Map<string, { id: string; name: string; color: string | null }[]>();

  for (const tag of tagRows) {
    const list = byEntry.get(tag.entryId) ?? [];
    list.push({ id: tag.id, name: tag.name, color: tag.color });
    byEntry.set(tag.entryId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    userRating: row.userRating,
    episodesWatched: row.episodesWatched,
    rewatchCount: row.rewatchCount,
    isFavorite: row.isFavorite,
    dropReason: row.dropReason,
    notes: row.notes,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    updatedAt: row.updatedAt.toISOString(),
    media: {
      id: row.mediaId,
      source: row.source,
      mediaType: row.mediaType,
      externalId: row.externalId,
      title: row.title,
      coverImage: row.coverImage,
      year: row.year,
      avgScore: row.avgScore,
      totalEpisodes: row.totalEpisodes
    },
    tags: byEntry.get(row.id) ?? []
  }));
}

const PAGE_SIZE = 24;

export async function listEntries(
  db: Database,
  userId: string,
  query: EntryListQuery
): Promise<{ items: Entry[]; nextCursor: string | null }> {
  const filters = [eq(mediaEntries.userId, userId)];

  if (query.status) filters.push(eq(mediaEntries.status, query.status));
  if (query.type) filters.push(eq(media.mediaType, query.type));
  if (query.q) filters.push(ilike(media.title, `%${query.q}%`));

  if (query.tagId) {
    filters.push(
      sql`exists (select 1 from media_entry_tags t where t.media_entry_id = ${mediaEntries.id} and t.tag_id = ${query.tagId})`
    );
  }

  if (query.sort === 'recent' && query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      const after = or(
        lt(mediaEntries.updatedAt, decoded.updatedAt),
        and(eq(mediaEntries.updatedAt, decoded.updatedAt), lt(mediaEntries.id, decoded.id))
      );
      if (after) filters.push(after);
    }
  }

  const order =
    query.sort === 'title'
      ? [asc(media.title)]
      : query.sort === 'rating'
        ? [desc(mediaEntries.userRating), desc(mediaEntries.updatedAt)]
        : [desc(mediaEntries.updatedAt), desc(mediaEntries.id)];

  const rows = await db
    .select(ENTRY_COLUMNS)
    .from(mediaEntries)
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(...filters))
    .orderBy(...order)
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = page.at(-1);

  return {
    items: await attachTags(db, page),
    /** Cursor so em 'recent'. Ordenar por titulo ou nota com cursor exigiria
     *  chave composta com esses campos; ate haver volume, nao se paga. */
    nextCursor:
      hasMore && last && query.sort === 'recent' ? encodeCursor(last.updatedAt, last.id) : null
  };
}

export async function getEntry(db: Database, userId: string, id: string): Promise<Entry> {
  const rows = await db
    .select(ENTRY_COLUMNS)
    .from(mediaEntries)
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(eq(mediaEntries.id, id), eq(mediaEntries.userId, userId)))
    .limit(1);

  const [entry] = await attachTags(db, rows);
  if (!entry) throw notFound('Entrada nao encontrada.');

  return entry;
}

interface ProgressResult {
  episodesWatched: number;
  status: Entry['status'];
}

/**
 * Marcar episodio grava watch_event e ajusta o status sozinho. As transicoes
 * automaticas existem porque quem marca o ultimo episodio nao quer abrir um
 * menu depois so para dizer que terminou.
 */
export async function applyProgress(
  db: Database,
  userId: string,
  entryId: string,
  delta: 1 | -1,
  timezone: string
): Promise<ProgressResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: mediaEntries.id,
        status: mediaEntries.status,
        episodesWatched: mediaEntries.episodesWatched,
        startedAt: mediaEntries.startedAt,
        totalEpisodes: media.totalEpisodes
      })
      .from(mediaEntries)
      .innerJoin(media, eq(media.id, mediaEntries.mediaId))
      .where(and(eq(mediaEntries.id, entryId), eq(mediaEntries.userId, userId)))
      .limit(1);

    if (!row) throw notFound('Entrada nao encontrada.');

    const total = row.totalEpisodes;
    const next = Math.max(0, row.episodesWatched + delta);

    if (total !== null && next > total) {
      return { episodesWatched: row.episodesWatched, status: row.status };
    }

    const today = localDate(timezone);
    const completed = total !== null && next >= total;

    const status: Entry['status'] = completed
      ? 'completed'
      : row.status === 'planning' || row.status === 'completed'
        ? 'watching'
        : row.status;

    await tx
      .update(mediaEntries)
      .set({
        episodesWatched: next,
        status,
        startedAt: row.startedAt ?? today,
        finishedAt: completed ? today : null
      })
      .where(eq(mediaEntries.id, entryId));

    if (delta === 1) {
      await tx.insert(watchEvents).values({
        userId,
        mediaEntryId: entryId,
        episodesDelta: 1,
        isRewatch: row.status === 'completed',
        watchedOn: today
      });
    } else {
      /** Desmarcar apaga o evento mais recente em vez de gravar um negativo:
       *  o heatmap contaria a correcao como atividade do dia. */
      await tx.execute(sql`
        delete from watch_events
        where id = (
          select id from watch_events
          where media_entry_id = ${entryId}
          order by created_at desc
          limit 1
        )
      `);
    }

    return { episodesWatched: next, status };
  });
}