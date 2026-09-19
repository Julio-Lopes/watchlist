'use client';

import type { ActivityDay } from '@watchlist/shared';
import { useMemo, useState } from 'react';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

/** A data vem como YYYY-MM-DD e representa o dia local. new Date direto
 *  interpretaria como UTC e deslocaria em um dia. */
const parseLocal = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
};

/** Escala fixa em episodios por dia, nao relativa ao maximo do usuario:
 *  assim a mesma cor significa a mesma coisa entre perfis. */
const level = (episodes: number): number => {
  if (episodes === 0) return 0;
  if (episodes <= 1) return 1;
  if (episodes <= 3) return 2;
  if (episodes <= 6) return 3;
  return 4;
};

const WASHI_LEVEL_CLASS = [
  'bg-transparent border border-hairline',
  'bg-[#dcd7d0]',
  'bg-[#b4aea6]',
  'bg-[#6b6763]',
  'bg-torii'
];

const DARK_LEVEL_CLASS = [
  /** Nivel 0 com borda: heat-0 e quase igual ao fundo do card, e sem
   *  contraste a grade some. */
  'bg-transparent border border-border',
  'bg-heat-1',
  'bg-heat-2',
  'bg-heat-3',
  'bg-heat-4'
];

interface MonthRow {
  key: string;
  label: string;
  year: number;
  /** 31 posicoes; meses curtos recebem null no fim para as colunas alinharem. */
  days: (ActivityDay | null)[];
}

/** `washi` é o tema novo (usado em /estatisticas); `dark` continua nas telas
 *  ainda não migradas que reaproveitam este componente. */
export function Heatmap({ days, tone = 'dark' }: { days: ActivityDay[]; tone?: 'dark' | 'washi' }) {
  const [hovered, setHovered] = useState<ActivityDay | null>(null);
  const washi = tone === 'washi';
  const LEVEL_CLASS = washi ? WASHI_LEVEL_CLASS : DARK_LEVEL_CLASS;
  const muted = washi ? 'text-sumi-faint' : 'text-fg-muted';
  const labelFont = washi ? '' : 'font-data ';

  /** Uma linha por mes, nao colunas por semana. Semana nao respeita fronteira
   *  de mes, e o rotulo por coluna sempre fica ambiguo perto da virada. */
  const months = useMemo(() => {
    const byMonth = new Map<string, MonthRow>();

    for (const day of days) {
      const date = parseLocal(day.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      const row = byMonth.get(key) ?? {
        key,
        label: MONTHS[date.getMonth()] ?? '',
        year: date.getFullYear(),
        days: Array(31).fill(null)
      };

      row.days[date.getDate() - 1] = day;
      byMonth.set(key, row);
    }

    return [...byMonth.values()];
  }, [days]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {months.map((month, index) => {
          const showYear = index === 0 || months[index - 1]?.year !== month.year;

          return (
            <div key={month.key} className="flex items-center gap-2">
              <span className={`${labelFont}w-14 shrink-0 text-caption ${muted}`}>
                {month.label}
                {showYear && (
                  <span className={`ml-1 ${washi ? 'text-[#a8a29b]' : 'text-border'}`}>{String(month.year).slice(2)}</span>
                )}
              </span>

              <div className="flex flex-1 gap-[3px]">
                {month.days.map((day, dayIndex) =>
                  day ? (
                    <button
                      key={day.date}
                      type="button"
                      onMouseEnter={() => setHovered(day)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(day)}
                      onBlur={() => setHovered(null)}
                      aria-label={`${day.date}: ${day.episodes} episódios`}
                      className={`h-3 flex-1 ${washi ? '' : 'rounded-[2px] '}${LEVEL_CLASS[level(day.episodes)]}`}
                    />
                  ) : (
                    /** Dia fora do mes ou fora da janela de 365: espaco vazio,
                     *  sem borda, para nao parecer dia sem atividade. */
                    <span key={`${month.key}-${dayIndex}`} className="h-3 flex-1" />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pl-16">
        <p className={`text-caption ${muted}`}>
          {hovered
            ? `${parseLocal(hovered.date).getDate()} de ${MONTHS_FULL[parseLocal(hovered.date).getMonth()]} · ${hovered.episodes} ${hovered.episodes === 1 ? 'episódio' : 'episódios'}`
            : 'passe o mouse num dia para ver a atividade'}
        </p>

        <div className={`flex items-center gap-1 text-caption ${muted}`}>
          menos
          {LEVEL_CLASS.map((className) => (
            <span key={className} className={`size-3 ${washi ? '' : 'rounded-[2px] '}${className}`} />
          ))}
          mais
        </div>
      </div>
    </div>
  );
}