import {
  collections,
  collectionItems,
  type Database,
  follows,
  mediaEntries,
  mediaEntryTags,
  reviews,
  userTags,
  watchEvents
} from '@watchlist/db';
import type { EntryStatus } from '@watchlist/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { CatalogEntry } from './catalog.js';
import type { Random } from './random.js';
import type { SeedUser } from './users.js';

const MONTHS_BACK = 18;
const DAY_MS = 86_400_000;

const REVIEW_SNIPPETS = [
  'Começou devagar, mas o terceiro ato justifica cada minuto.',
  'A direção de arte carrega o resto. A história é o de menos aqui.',
  'Revi depois de dois anos e envelheceu melhor do que eu esperava.',
  'Personagem principal irritante nos primeiros episódios, e depois some o problema.',
  'Trilha sonora impecável. Assisti metade só pelo som.',
  'Não é para todo mundo, e tudo bem. Para mim funcionou.'
];

const TAG_NAMES = ['comfort', 'chorei', 'rewatch', 'superestimado', 'trilha boa', 'largar?'];

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Dias ativos em rajadas, nunca uniformes. Heatmap e streak sao as
 * funcionalidades das Etapas 10 e 11, e testa-las contra distribuicao
 * uniforme nao revelaria nada: todo dia igual nao tem streak nem buraco.
 */
function activeDays(random: Random, start: number, end: number): number[] {
  const days: number[] = [];
  let cursor = start;

  while (cursor < end) {
    /** Buraco de alguns dias a algumas semanas. */
    cursor += random.int(1, 18) * DAY_MS;
    if (cursor >= end) break;

    const streak = random.int(1, 14);

    for (let i = 0; i < streak && cursor < end; i += 1) {
      days.push(cursor);
      cursor += DAY_MS;
    }
  }

  return days;
}

export async function seedActivity(
  db: Database,
  random: Random,
  people: SeedUser[],
  catalog: CatalogEntry[],
  log: FastifyBaseLogger
): Promise<void> {
  const end = Date.now();
  const start = end - MONTHS_BACK * 30 * DAY_MS;
  let totalEvents = 0;

  for (const person of people) {
    const chosen = random.shuffle(catalog).slice(0, random.int(8, 25));

    const tagRows = await db
      .insert(userTags)
      .values(
        random.shuffle(TAG_NAMES)
          .slice(0, random.int(2, 4))
          .map((name) => ({
            userId: person.id,
            name,
            color: random.pick(['#7c3aed', '#22c55e', '#f59e0b', '#ef4444']),
            isPublic: random.chance(0.6)
          }))
      )
      .returning({ id: userTags.id });

    const days = activeDays(random, start, end);
    let dayIndex = 0;

    for (const item of chosen) {
      const status: EntryStatus = random.chance(0.5)
        ? 'completed'
        : random.chance(0.4)
          ? 'watching'
          : random.chance(0.5)
            ? 'planning'
            : random.chance(0.6)
              ? 'dropped'
              : 'paused';

      const episodes = item.totalEpisodes ?? (item.mediaType === 'movie' ? 1 : 12);

      const watched =
        status === 'completed'
          ? episodes
          : status === 'planning'
            ? 0
            : random.int(1, Math.max(1, Math.floor(episodes * 0.7)));

      /** NULL e sem nota; 10 a 100 e o intervalo do CHECK. Nao existe 0. */
      const rating =
        status === 'planning' || random.chance(0.25)
          ? null
          : status === 'dropped'
            ? random.int(20, 55)
            : random.int(55, 100);

      const [entry] = await db
        .insert(mediaEntries)
        .values({
          userId: person.id,
          mediaId: item.id,
          status,
          userRating: rating,
          episodesWatched: watched,
          rewatchCount: status === 'completed' && random.chance(0.2) ? random.int(1, 3) : 0,
          isFavorite: status === 'completed' && random.chance(0.18),
          dropReason: status === 'dropped'
            ? random.pick(['pacing', 'characters', 'art', 'plot', 'no_time', 'other'] as const)
            : null
        })
        .onConflictDoNothing()
        .returning({ id: mediaEntries.id });

      if (!entry) continue;

      for (const tagId of random.shuffle(tagRows).slice(0, random.chance(0.4) ? 1 : 0)) {
        await db
          .insert(mediaEntryTags)
          .values({ mediaEntryId: entry.id, tagId: tagId.id })
          .onConflictDoNothing();
      }

      const events: (typeof watchEvents.$inferInsert)[] = [];

      for (let done = 0; done < watched && dayIndex < days.length; ) {
        const day = days[dayIndex] as number;
        /** Sessao de 1 a 4 episodios no mesmo dia, com maratona ocasional. */
        const session = Math.min(watched - done, random.chance(0.1) ? random.int(5, 12) : random.int(1, 4));

        for (let i = 0; i < session; i += 1) {
          events.push({
            userId: person.id,
            mediaEntryId: entry.id,
            episodesDelta: 1,
            isRewatch: false,
            watchedOn: toDateOnly(new Date(day))
          });
        }

        done += session;
        dayIndex += 1;
      }

      if (events.length > 0) {
        await db.insert(watchEvents).values(events);
        totalEvents += events.length;
      }

      if (status === 'completed' && random.chance(0.3)) {
        await db
          .insert(reviews)
          .values({
            userId: person.id,
            mediaEntryId: entry.id,
            content: `${random.pick(REVIEW_SNIPPETS)} ${random.pick(REVIEW_SNIPPETS)}`,
            containsSpoilers: random.chance(0.25),
            likesCount: random.int(0, 40)
          })
          .onConflictDoNothing();
      }
    }

    if (random.chance(0.6)) {
      const [collection] = await db
        .insert(collections)
        .values({
          userId: person.id,
          slug: 'favoritos-do-ano',
          name: 'Favoritos do ano',
          description: 'O que ficou na cabeça depois de acabar.',
          isPublic: true,
          isRanked: random.chance(0.5)
        })
        .onConflictDoNothing()
        .returning({ id: collections.id });

      if (collection) {
        const picks = random.shuffle(catalog).slice(0, random.int(3, 8));

        for (const [index, pick] of picks.entries()) {
          await db
            .insert(collectionItems)
            .values({
              collectionId: collection.id,
              mediaId: pick.id,
              position: String((index + 1) * 100)
            })
            .onConflictDoNothing();
        }

        await db.update(collections).set({ itemCount: picks.length });
      }
    }
  }

  for (const person of people) {
    for (const other of random.shuffle(people).slice(0, random.int(2, 8))) {
      if (other.id === person.id) continue;

      await db
        .insert(follows)
        .values({ followerId: person.id, followingId: other.id })
        .onConflictDoNothing();
    }
  }

  log.info({ totalEvents }, 'atividade gerada');
}