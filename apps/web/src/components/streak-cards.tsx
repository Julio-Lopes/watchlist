import { Clock, Flame, Trophy } from '@/lib/icons';
import type { ActivityStats } from '@watchlist/shared';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const monthYear = (date: string): string => {
  const [year, month] = date.split('-').map(Number);
  return `${MONTHS[month! - 1]} de ${year}`;
};

const formatDuration = (minutes: number): { big: string; small: string } => {
  const hours = Math.round(minutes / 60);
  const days = Math.floor(hours / 24);

  return days > 0
    ? { big: `${days}d`, small: `${hours.toLocaleString('pt-BR')} horas` }
    : { big: `${hours}h`, small: `${minutes.toLocaleString('pt-BR')} minutos` };
};

export function StreakCards({ stats }: { stats: ActivityStats }) {
  const last7 = stats.days.slice(-7);
  const duration = formatDuration(stats.totalMinutes);
  const average = stats.activeDays > 0 ? stats.totalEpisodes / stats.activeDays : 0;

  const range =
    stats.longestStreakStart && stats.longestStreakEnd
      ? monthYear(stats.longestStreakStart) === monthYear(stats.longestStreakEnd)
        ? monthYear(stats.longestStreakStart)
        : `${monthYear(stats.longestStreakStart)} a ${monthYear(stats.longestStreakEnd)}`
      : null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-fg-muted">
          <Flame className="size-4" aria-hidden />
          <span className="text-caption tracking-wide uppercase">Sequência atual</span>
        </div>
        <p className="font-data mt-1.5 text-[34px] leading-tight text-accent">
          {stats.currentStreak}
        </p>
        <p className="text-caption text-fg-muted">
          {stats.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}
        </p>

        <div className="mt-3 flex gap-1">
          {last7.map((day, index) => {
            const isToday = index === last7.length - 1;
            return (
              <div
                key={day.date}
                title={`${day.date} · ${day.episodes} ep`}
                className={
                  day.episodes > 0
                    ? 'h-4 flex-1 rounded-[2px] bg-accent'
                    : isToday
                      ? 'h-4 flex-1 rounded-[2px] border border-dashed border-fg-muted'
                      : 'h-4 flex-1 rounded-[2px] bg-border'
                }
              />
            );
          })}
        </div>
        {/** O ultimo dia tracejado quando vazio: o streak conta ate o fim de
         *   hoje, entao hoje nao esta zerado, esta em aberto. */}
        <p className="mt-1.5 text-caption text-fg-muted">últimos 7 dias</p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-fg-muted">
          <Trophy className="size-4" aria-hidden />
          <span className="text-caption tracking-wide uppercase">Recorde</span>
        </div>
        <p className="font-data mt-1.5 text-[34px] leading-tight">{stats.longestStreak}</p>
        <p className="text-caption text-fg-muted">
          {stats.longestStreak === 1 ? 'dia seguido' : 'dias seguidos'}
        </p>
        {range && <p className="mt-6 text-caption text-fg-muted">{range}</p>}
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-fg-muted">
          <Clock className="size-4" aria-hidden />
          <span className="text-caption tracking-wide uppercase">Tempo total</span>
        </div>
        <p className="font-data mt-1.5 text-[34px] leading-tight">{duration.big}</p>
        <p className="text-caption text-fg-muted">{duration.small}</p>
        {average > 0 && (
          /** Media por dia ativo, nao por dia corrido: dividir por 365 daria
           *  um numero que nao diz nada sobre voce. */
          <p className="mt-6 text-caption text-fg-muted">
            {average.toFixed(1).replace('.', ',')} eps por dia ativo
          </p>
        )}
      </div>
    </div>
  );
}