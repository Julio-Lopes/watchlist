import type { Overview } from '@watchlist/shared';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const formatHours = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  return hours > 0 ? `${hours}h` : `${minutes}min`;
};

export function MonthChart({ months }: { months: Overview['months'] }) {
  if (months.length === 0) return null;

  const max = Math.max(...months.map((month) => month.minutes), 1);
  const busiest = [...months].sort((a, b) => b.minutes - a.minutes)[0];

  const label = (month: string): string => {
    const [, index] = month.split('-');
    return MONTHS[Number(index) - 1] ?? '';
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
      <h2 className="font-serif text-h3">Tempo por mês</h2>
      {busiest && (
        <p className="mt-1 text-small text-fg-muted">
          Seu mês mais cheio foi {label(busiest.month)}, com {formatHours(busiest.minutes)} e{' '}
          {busiest.episodes} episódios.
        </p>
      )}

      <div className="mt-5 flex h-24 items-end gap-1.5">
        {months.map((month) => (
          <div key={month.month} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-[2px] ${month.month === busiest?.month ? 'bg-heat-4' : 'bg-accent'}`}
              style={{ height: `${Math.max(2, (month.minutes / max) * 80)}px` }}
              title={`${formatHours(month.minutes)} · ${month.episodes} episódios`}
            />
            <span className="font-data text-caption text-fg-muted">{label(month.month)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}