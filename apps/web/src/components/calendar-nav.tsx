'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const SEASONS = [
  { value: 'winter', label: 'Inverno' },
  { value: 'spring', label: 'Primavera' },
  { value: 'summer', label: 'Verão' },
  { value: 'fall', label: 'Outono' }
];

/** Constroi o href preservando o que ja esta na URL. Trocar de ano nao pode
 *  perder a temporada nem a aba em que voce estava. */
function useHref() {
  const pathname = usePathname();
  const params = useSearchParams();

  return (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) next.delete(key);
      else next.set(key, String(value));
    }

    return `${pathname}?${next.toString()}`;
  };
}

const chip = (active: boolean) =>
  cn(
    'rounded-[var(--radius-control)] border px-3 py-1 text-small transition-colors duration-150',
    active ? 'border-accent bg-accent text-fg' : 'border-border text-fg-muted hover:text-fg'
  );

export function TabNav({ tab }: { tab: 'schedule' | 'season' }) {
  const href = useHref();

  return (
    <div className="flex gap-5 border-b border-border">
      {(
        [
          { value: 'schedule', label: 'Esta semana' },
          { value: 'season', label: 'Temporada' }
        ] as const
      ).map((option) => (
        <Link
          key={option.value}
          href={href({ tab: option.value, page: undefined })}
          className={cn(
            'border-b-2 pb-2.5 text-small transition-colors duration-150',
            tab === option.value
              ? 'border-accent text-fg'
              : 'border-transparent text-fg-muted hover:text-fg'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export function ScopeToggle({ scope }: { scope: 'all' | 'mine' }) {
  const href = useHref();

  return (
    <div className="flex gap-0.5 rounded-[var(--radius-control)] border border-border bg-surface p-0.5">
      {(
        [
          { value: 'all', label: 'Geral' },
          { value: 'mine', label: 'Meus' }
        ] as const
      ).map((option) => (
        <Link
          key={option.value}
          href={href({ scope: option.value, page: undefined })}
          className={cn(
            'rounded-[var(--radius-control)] px-3 py-1 text-caption transition-colors duration-150',
            scope === option.value ? 'bg-accent text-fg' : 'text-fg-muted hover:text-fg'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export function SeasonNav({ year, season }: { year: number; season: string }) {
  const href = useHref();
  /** Cinco anos visiveis com o atual no centro: pular decadas e raro, e um
   *  seletor com 40 opcoes atrapalharia o caso comum. */
  const years = [year - 2, year - 1, year, year + 1, year + 2];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Link href={href({ year: year - 5, page: undefined })} className={chip(false)} aria-label="Cinco anos antes">
          ‹
        </Link>

        {years.map((value) => (
          <Link key={value} href={href({ year: value, page: undefined })} className={chip(value === year)}>
            {value}
          </Link>
        ))}

        <Link href={href({ year: year + 5, page: undefined })} className={chip(false)} aria-label="Cinco anos depois">
          ›
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {SEASONS.map((option) => (
          <Link
            key={option.value}
            href={href({ season: option.value, page: undefined })}
            className={chip(season === option.value)}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function WeekdayFilter({ weekday }: { weekday: number | null }) {
  const href = useHref();
  const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  return (
    <div className="flex flex-wrap gap-1.5">
      <Link href={href({ weekday: undefined })} className={chip(weekday === null)}>
        Todos
      </Link>

      {days.map((label, index) => (
        <Link key={label} href={href({ weekday: index })} className={chip(weekday === index)}>
          {label}
        </Link>
      ))}
    </div>
  );
}