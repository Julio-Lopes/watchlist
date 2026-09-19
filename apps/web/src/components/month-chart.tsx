import type { Overview } from '@watchlist/shared';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const WINDOW = 13;

const formatHours = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  return hours > 0 ? `${hours}h` : `${minutes}min`;
};

/** Os 13 meses terminando no mês corrente, com os vazios na linha de base. A
 *  API só devolve meses com dado, e um único mês virava um bloco de largura
 *  total: sem eixo não dá para ler que é um pico. */
function buildWindow(months: Overview['months']) {
  const byKey = new Map(months.map((month) => [month.month, month]));
  const now = new Date();

  return Array.from({ length: WINDOW }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (WINDOW - 1 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const found = byKey.get(key);

    return {
      key,
      label: MONTHS[date.getMonth()] ?? '',
      minutes: found?.minutes ?? 0,
      episodes: found?.episodes ?? 0,
      current: index === WINDOW - 1
    };
  });
}

export function MonthChart({ months }: { months: Overview['months'] }) {
  if (months.length === 0) return null;

  const window = buildWindow(months);
  const max = Math.max(...window.map((month) => month.minutes), 1);
  const busiest = [...window].sort((a, b) => b.minutes - a.minutes)[0];

  return (
    <section className="mt-[clamp(44px,7vh,76px)] border-t border-hairline pt-[clamp(28px,4vh,40px)]">
      <h2 className="font-mincho text-[clamp(20px,2.4vw,26px)] font-normal tracking-[-0.01em] text-sumi">
        Tempo por mês
      </h2>
      {busiest && busiest.minutes > 0 && (
        <p className="mt-2.5 text-sm leading-[1.75] font-light text-sumi-soft">
          Seu mês mais cheio foi {busiest.label}, com {formatHours(busiest.minutes)} e{' '}
          {busiest.episodes} episódios.
        </p>
      )}

      <div className="mt-[clamp(26px,4vh,36px)]">
        <div className="flex h-[120px] items-end gap-[clamp(4px,0.8vw,10px)] border-b border-sumi">
          {window.map((month) => (
            <span
              key={month.key}
              className={`block flex-1 ${month.key === busiest?.key && month.minutes > 0 ? 'bg-torii' : 'bg-sumi'}`}
              style={{ height: `${Math.max(1, (month.minutes / max) * 120)}px` }}
              title={
                month.minutes > 0 ? `${formatHours(month.minutes)} · ${month.episodes} episódios` : undefined
              }
            />
          ))}
        </div>

        <div className="mt-2 flex gap-[clamp(4px,0.8vw,10px)]">
          {window.map((month) => (
            <span
              key={month.key}
              className={`flex-1 text-center text-[11px] ${month.current ? 'text-sumi' : 'text-sumi-faint'}`}
            >
              {month.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
