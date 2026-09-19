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

/** Contorno hairline; o ativo é o único preenchido, em sumi. */
const chip = (active: boolean, narrow = false) =>
  cn(
    'border py-[7px] text-xs tracking-[0.06em] transition-colors duration-400',
    narrow ? 'px-[13px]' : 'px-[15px]',
    active
      ? 'border-sumi bg-sumi text-washi'
      : 'border-[#d9d4cd] bg-transparent text-sumi-soft hover:border-sumi'
  );

export function TabNav({ tab }: { tab: 'schedule' | 'season' }) {
  const href = useHref();

  return (
    <div className="mt-[clamp(22px,3vh,30px)] flex gap-[26px] border-b border-hairline text-[13.5px]">
      {(
        [
          { value: 'schedule', label: 'Esta semana' },
          { value: 'season', label: 'Temporada' }
        ] as const
      ).map((option) => {
        const active = tab === option.value;
        return (
          <Link
            key={option.value}
            href={href({ tab: option.value, page: undefined })}
            className={cn(
              'group relative pb-[11px] transition-colors duration-400',
              active ? 'text-sumi' : 'text-sumi-faint hover:text-sumi'
            )}
          >
            {option.label}
            <span
              className={cn(
                'absolute -bottom-px left-0 h-px w-full origin-left transition-transform duration-450 ease-out',
                active ? 'scale-x-100 bg-sumi' : 'scale-x-0 bg-torii group-hover:scale-x-100'
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}

export function ScopeToggle({ scope }: { scope: 'all' | 'mine' }) {
  const href = useHref();

  return (
    <div className="ml-auto flex">
      {(
        [
          { value: 'all', label: 'Geral' },
          { value: 'mine', label: 'Meus' }
        ] as const
      ).map((option, index) => (
        <Link
          key={option.value}
          href={href({ scope: option.value, page: undefined })}
          className={cn(
            'border px-[18px] py-2 text-xs tracking-[0.08em] transition-colors duration-400',
            index > 0 && 'border-l-0',
            scope === option.value
              ? 'border-sumi bg-sumi text-washi'
              : 'border-[#d9d4cd] text-sumi-soft hover:border-sumi hover:text-sumi'
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
    <div>
      <div className="flex flex-wrap gap-2">
        <Link href={href({ year: year - 5, page: undefined })} className={chip(false, true)} aria-label="Cinco anos antes">
          ‹
        </Link>

        {years.map((value) => (
          <Link key={value} href={href({ year: value, page: undefined })} className={chip(value === year)}>
            {value}
          </Link>
        ))}

        <Link href={href({ year: year + 5, page: undefined })} className={chip(false, true)} aria-label="Cinco anos depois">
          ›
        </Link>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
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
    <div className="flex flex-wrap gap-2">
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
