import { ScopeToggle, SeasonNav, TabNav, WeekdayFilter } from '@/components/calendar-nav';
import { SeasonGrid } from '@/components/season-grid';
import { WeekSchedule } from '@/components/week-schedule';
import { serverFetch } from '@/lib/api-server';
import { scheduleResponseSchema, seasonResponseSchema } from '@watchlist/shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendário · Watchlist' };

const SEASON_LABEL: Record<string, string> = {
  winter: 'Inverno',
  spring: 'Primavera',
  summer: 'Verão',
  fall: 'Outono'
};

export default async function CalendarioPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resolved = await searchParams;

  const tab = resolved.tab === 'season' ? 'season' : 'schedule';
  const scope = resolved.scope === 'mine' ? 'mine' : 'all';
  const weekday = resolved.weekday !== undefined ? Number(resolved.weekday) : null;
  const page = Number(resolved.page ?? 1);

  const header = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-h2">Calendário</h1>
        <ScopeToggle scope={scope} />
      </div>

      <TabNav tab={tab} />
    </div>
  );

  if (tab === 'schedule') {
    const data = await serverFetch(`/calendar/schedule?scope=${scope}`, scheduleResponseSchema);

    if (!data) {
      return (
        <div className="space-y-6">
          {header}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
            <p className="text-body">Não foi possível carregar a agenda</p>
            <p className="mt-1 text-small text-fg-muted">Tente de novo em instantes.</p>
          </div>
        </div>
      );
    }

    const filtered =
      weekday === null ? data.items : data.items.filter((item) => item.weekday === weekday);

    return (
      <div className="space-y-6">
        {header}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <WeekdayFilter weekday={weekday} />
          {/** Declarado, senao alguem marca 23:30 na agenda e perde por doze
           *   horas de diferenca. */}
          <span className="font-data text-caption text-fg-muted">horários de Tóquio</span>
        </div>

        {data.degraded && (
          <p className="text-small text-warning">
            A fonte de dados não respondeu. Isso costuma passar em alguns minutos.
          </p>
        )}

        <WeekSchedule items={filtered} />
      </div>
    );
  }

  const query = new URLSearchParams({ scope, page: String(page) });
  if (resolved.year) query.set('year', resolved.year);
  if (resolved.season) query.set('season', resolved.season);

  const data = await serverFetch(`/calendar/season?${query.toString()}`, seasonResponseSchema);

  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <p className="text-body">Não foi possível carregar a temporada</p>
          <p className="mt-1 text-small text-fg-muted">Tente de novo em instantes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <SeasonNav year={data.year} season={data.season} />
        <span className="font-data text-caption text-fg-muted">
          {SEASON_LABEL[data.season]} {data.year} · {data.items.length} títulos
          {data.inLibraryCount > 0 && ` · ${data.inLibraryCount} na sua lista`}
        </span>
      </div>

      {data.degraded && (
        <p className="text-small text-warning">
          A fonte de dados não respondeu. Isso costuma passar em alguns minutos.
        </p>
      )}

      <SeasonGrid
        key={`${data.year}-${data.season}-${scope}`}
        initialItems={data.items}
        initialHasMore={data.hasMore}
        year={data.year}
        season={data.season}
        scope={scope}
      />
    </div>
  );
}