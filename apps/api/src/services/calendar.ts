import { type Database, media, mediaEntries } from '@watchlist/db';
import type { ScheduleEntry, Season, SeasonEntry } from '@watchlist/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { JikanSchedule } from '../clients/jikan.js';
import { getSchedule, getSeason, jikanImage } from '../clients/jikan.js';
import { TtlCache } from '../lib/cache.js';

/**
 * [SLEEP] Cache em memoria, sem Redis. Ele morre quando o servico dorme, e
 * isso e aceitavel: o objetivo e sobreviver a uma queda do MyAnimeList, que
 * derruba /seasons e /schedules enquanto /anime/{id} continua respondendo do
 * cache do proprio Jikan.
 */
const seasonCache = new TtlCache<{ items: SeasonEntry[]; hasMore: boolean }>(
  6 * 60 * 60 * 1000,
  40
);

/** Duas horas na agenda: o que esta no ar muda mais que a temporada, mas
 *  ainda assim muda pouco dentro de um dia. */
const scheduleCache = new TtlCache<ScheduleEntry[]>(2 * 60 * 60 * 1000, 4);

/**
 * Convencao do MAL, hemisferio norte: dezembro ja conta como inverno do ano
 * seguinte. Calculado no servidor, nao no cliente: duas abas com relogios
 * diferentes mostrariam temporadas diferentes.
 */
export function currentSeason(): { year: number; season: Season } {
  const now = new Date();
  const month = now.getUTCMonth() + 1;

  if (month === 12) return { year: now.getUTCFullYear() + 1, season: 'winter' };
  if (month <= 2) return { year: now.getUTCFullYear(), season: 'winter' };
  if (month <= 5) return { year: now.getUTCFullYear(), season: 'spring' };
  if (month <= 8) return { year: now.getUTCFullYear(), season: 'summer' };
  return { year: now.getUTCFullYear(), season: 'fall' };
}

const WEEKDAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
] as const;

/** Ids do MAL que o viewer ja tem na biblioteca. */
async function ownedIds(db: Database, viewerId: string | null, only?: number[]) {
  if (!viewerId) return new Set<number>();

  const filters = [eq(mediaEntries.userId, viewerId), eq(media.source, 'mal')];
  if (only && only.length > 0) filters.push(inArray(media.externalId, only));

  const entries = await db
    .select({ externalId: media.externalId })
    .from(mediaEntries)
    .innerJoin(media, eq(media.id, mediaEntries.mediaId))
    .where(and(...filters));

  return new Set(entries.map((entry) => entry.externalId));
}

/** O Jikan devolve o dia no plural, como "Mondays". */
function weekdayFromBroadcast(day: string | null | undefined): number | null {
  if (!day) return null;

  const normalized = day.toLowerCase().replace(/s$/, '');
  const index = WEEKDAY_NAMES.indexOf(normalized as (typeof WEEKDAY_NAMES)[number]);

  return index >= 0 ? index : null;
}

export async function getSeasonCalendar(
  db: Database,
  year: number,
  season: Season,
  page: number,
  viewerId: string | null
): Promise<{ items: SeasonEntry[]; hasMore: boolean; inLibraryCount: number; degraded: boolean }> {
  const cacheKey = `${year}-${season}-${page}`;
  const cached = seasonCache.get(cacheKey);

  let base: SeasonEntry[];
  let hasMore = false;
  let degraded = false;

  if (cached) {
    base = cached.items;
    hasMore = cached.hasMore;
  } else {
    let rows: JikanSchedule[] = [];

    try {
      const result = await getSeason(year, season, page);
      rows = result.items;
      hasMore = result.hasNextPage;
    } catch {
      /** 504 do Jikan quando o MyAnimeList esta fora. O sinal sobe para a
       *  tela em vez de virar uma temporada vazia sem explicacao. */
      degraded = true;
    }

    base = rows.map((row) => ({
      source: 'mal' as const,
      mediaType: 'anime' as const,
      externalId: row.mal_id,
      title: row.title,
      coverImage: jikanImage(row.images),
      /** O Jikan nao tem banner. O grid usa so a capa. */
      bannerImage: null,
      year: row.year,
      avgScore: row.score ? Math.round(row.score * 10) : null,
      totalEpisodes: row.episodes,
      airingWeekday: weekdayFromBroadcast(row.broadcast?.day),
      startDate: row.aired?.from ?? null,
      inLibrary: null
    }));

    /** So guarda resultado bom: cachear uma falha manteria a tela vazia por
     *  seis horas depois de a fonte voltar. */
    if (!degraded && base.length > 0) {
      seasonCache.set(cacheKey, { items: base, hasMore });
    }
  }

  /** inLibrary e por viewer, entao fica fora do cache e e aplicado depois:
   *  guardar junto vazaria a biblioteca de um usuario para outro. */
  const owned = await ownedIds(
    db,
    viewerId,
    base.map((item) => item.externalId)
  );

  const items = base.map((item) => ({
    ...item,
    inLibrary: viewerId ? owned.has(item.externalId) : null
  }));

  return {
    items,
    hasMore,
    inLibraryCount: owned.size,
    /** So avisa de falha quando nao ha o que mostrar: se o cache salvou a
     *  tela, o aviso seria ruido. */
    degraded: degraded && items.length === 0
  };
}

/**
 * Agenda da semana corrente. O Jikan so oferece o que esta no ar agora, sem
 * parametro de data: temporada passada continua na aba de temporada, onde
 * data de exibicao nao acrescenta nada.
 */
export async function getWeekSchedule(
  db: Database,
  viewerId: string | null,
  scope: 'all' | 'mine'
): Promise<{ items: ScheduleEntry[]; degraded: boolean }> {
  const cached = scheduleCache.get('week');

  let base: ScheduleEntry[] = [];
  let degraded = false;

  if (cached) {
    base = cached;
  } else {
    let failures = 0;

    /** Sete chamadas, uma por dia. Com o intervalo minimo de 350 ms isso leva
     *  uns dois segundos e meio, o que e aceitavel para uma pagina que nao e
     *  a primeira a carregar, e o cache evita repetir. */
    for (const [weekday, name] of WEEKDAY_NAMES.entries()) {
      const entries = await getSchedule(name).catch(() => {
        failures += 1;
        return [] as JikanSchedule[];
      });

      for (const entry of entries) {
        base.push({
          weekday,
          time: entry.broadcast?.time ?? null,
          inLibrary: null,
          media: {
            source: 'mal',
            mediaType: 'anime',
            externalId: entry.mal_id,
            title: entry.title,
            coverImage: jikanImage(entry.images),
            year: entry.year,
            avgScore: entry.score ? Math.round(entry.score * 10) : null,
            totalEpisodes: entry.episodes
          }
        });
      }
    }

    degraded = failures > 0;

    if (!degraded && base.length > 0) scheduleCache.set('week', base);
  }

  const owned = await ownedIds(db, viewerId);

  const items = base
    .filter((entry) => scope !== 'mine' || owned.has(entry.media.externalId))
    .map((entry) => ({
      ...entry,
      inLibrary: viewerId ? owned.has(entry.media.externalId) : null
    }));

  return { items, degraded: degraded && items.length === 0 };
}