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

function LoadError({ title }: { title: string }) {
  return (
    <div className="mt-[clamp(26px,4vh,40px)]">
      <p className="font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">{title}</p>
      <p className="mt-3 text-[15px] leading-[1.85] font-light text-sumi-soft">
        Tente de novo em instantes.
      </p>
    </div>
  );
}

const degradedNote = 'mt-5 text-[13px] leading-[1.75] text-torii';

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
    <>
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3">
        <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
          Calendário
        </h1>
        <ScopeToggle scope={scope} />
      </div>

      <TabNav tab={tab} />
    </>
  );

  if (tab === 'schedule') {
    const data = await serverFetch(`/calendar/schedule?scope=${scope}`, scheduleResponseSchema);

    if (!data) {
      return (
        <div className="mx-auto max-w-[1180px]">
          {header}
          <LoadError title="Não foi possível carregar a agenda" />
        </div>
      );
    }

    const filtered =
      weekday === null ? data.items : data.items.filter((item) => item.weekday === weekday);

    return (
      <div className="mx-auto max-w-[1180px]">
        {header}

        <div className="mt-[clamp(20px,3vh,28px)] flex flex-wrap items-center gap-x-5 gap-y-3.5">
          <WeekdayFilter weekday={weekday} />
          {/** Declarado, senao alguem marca 23:30 na agenda e perde por doze
           *   horas de diferenca. */}
          <span className="ml-auto text-[11.5px] tracking-[0.08em] text-sumi-faint">
            horários de Tóquio
          </span>
        </div>

        {data.degraded && (
          <p className={degradedNote}>
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
      <div className="mx-auto max-w-[1180px]">
        {header}
        <LoadError title="Não foi possível carregar a temporada" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      {header}

      <div className="mt-[clamp(20px,3vh,28px)] flex flex-wrap items-start gap-x-6 gap-y-4">
        <SeasonNav year={data.year} season={data.season} />
        <span className="ml-auto text-[11.5px] tracking-[0.06em] text-sumi-faint">
          {SEASON_LABEL[data.season]} {data.year} ·{' '}
          <span className="font-mincho text-[13px] text-sumi-soft">{data.items.length} títulos</span>
          {data.inLibraryCount > 0 && ` · ${data.inLibraryCount} na sua lista`}
        </span>
      </div>

      {data.degraded && (
        <p className={degradedNote}>
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
