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

const label =
  'border-b border-hairline pb-3 text-[11px] tracking-[0.2em] text-sumi-faint uppercase';
const big = 'font-mincho text-[clamp(36px,4.6vw,52px)] leading-none';
const unit = 'text-[13px] tracking-[0.04em] text-sumi-soft';
const foot = 'text-[11.5px] tracking-[0.06em] text-sumi-faint';

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
    <section className="mt-[clamp(34px,5vh,52px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-[clamp(24px,4vw,48px)]">
      <div>
        <p className={label}>Sequência atual</p>
        <p className="mt-[18px] flex items-baseline gap-2.5">
          <span className={`${big} text-torii`}>{stats.currentStreak}</span>
          <span className={unit}>{stats.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
        </p>

        <div className="mt-5 flex gap-[5px]">
          {last7.map((day, index) => {
            const isToday = index === last7.length - 1;
            return (
              <span
                key={day.date}
                title={`${day.date} · ${day.episodes} ep`}
                className={
                  day.episodes > 0
                    ? 'h-1 flex-1 bg-torii'
                    : isToday
                      ? 'h-1 flex-1 border-t border-dashed border-sumi-faint'
                      : 'h-1 flex-1 bg-hairline'
                }
              />
            );
          })}
        </div>
        {/** O ultimo dia tracejado quando vazio: o streak conta ate o fim de
         *   hoje, entao hoje nao esta zerado, esta em aberto. */}
        <p className={`mt-2.5 ${foot}`}>últimos 7 dias</p>
      </div>

      <div>
        <p className={label}>Recorde</p>
        <p className="mt-[18px] flex items-baseline gap-2.5">
          <span className={`${big} text-sumi`}>{stats.longestStreak}</span>
          <span className={unit}>{stats.longestStreak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
        </p>
        {range && <p className={`mt-5 ${foot}`}>{range}</p>}
      </div>

      <div>
        <p className={label}>Tempo total</p>
        <p className="mt-[18px] flex items-baseline gap-2.5">
          <span className={`${big} text-sumi`}>{duration.big}</span>
          <span className={unit}>{duration.small}</span>
        </p>
        {average > 0 && (
          /** Media por dia ativo, nao por dia corrido: dividir por 365 daria
           *  um numero que nao diz nada sobre voce. */
          <p className={`mt-5 ${foot}`}>{average.toFixed(1).replace('.', ',')} eps por dia ativo</p>
        )}
      </div>
    </section>
  );
}
