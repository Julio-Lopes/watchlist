import type { ScheduleEntry } from '@watchlist/shared';
import Link from 'next/link';

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Dia da semana em Toquio, nao no fuso do usuario: o calendario segue o
 *  Japao, que e onde o episodio estreia e o que a comunidade discute. */
const todayInTokyo = (): number => {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short'
  }).format(new Date());

  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
};

export function WeekSchedule({ items }: { items: ScheduleEntry[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <p className="text-body">Nada na agenda</p>
        <p className="mt-1 text-small text-fg-muted">
          Se você está vendo "meus", adicione algo em exibição à sua biblioteca.
        </p>
      </div>
    );
  }

  const byWeekday = new Map<number, ScheduleEntry[]>();

  for (const item of items) {
    const list = byWeekday.get(item.weekday) ?? [];
    list.push(item);
    byWeekday.set(item.weekday, list);
  }

  const today = todayInTokyo();

  /** Comeca no dia de hoje e da a volta na semana: o que sai amanha importa
   *  mais que o que saiu na segunda passada. */
  const order = Array.from({ length: 7 }, (_, offset) => (today + offset) % 7).filter((weekday) =>
    byWeekday.has(weekday)
  );

  return (
    <div className="space-y-6">
      {order.map((weekday) => {
        const entries = (byWeekday.get(weekday) ?? []).sort((a, b) =>
          (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
        );

        return (
          <section key={weekday}>
            <div className="flex items-baseline gap-3 border-b border-border pb-2">
              <h2 className="font-serif text-h3">{WEEKDAY_NAMES[weekday]}</h2>
              {weekday === today && <span className="text-caption text-accent">hoje</span>}
              <span className="font-data text-caption text-fg-muted">
                {entries.length} {entries.length === 1 ? 'obra' : 'obras'}
              </span>
            </div>

            <div className="mt-2">
              {entries.map((entry) => (
                <Link
                  key={entry.media.externalId}
                  href={`/media/${entry.media.source}/${entry.media.mediaType}/${entry.media.externalId}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] p-2 transition-colors duration-150 hover:bg-surface"
                >
                  <div className="h-[54px] w-9 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover">
                    {entry.media.coverImage && (
                      <img
                        src={entry.media.coverImage}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small">{entry.media.title}</p>
                    <p className="font-data mt-0.5 text-caption text-fg-muted">
                      {entry.media.totalEpisodes ? `${entry.media.totalEpisodes} eps` : 'em exibição'}
                      {entry.media.avgScore
                        ? ` · ${(entry.media.avgScore / 10).toFixed(1).replace('.', ',')}`
                        : ''}
                    </p>
                  </div>

                  {entry.inLibrary && (
                    <span className="shrink-0 rounded-[var(--radius-control)] bg-success px-2 py-0.5 text-caption text-bg">
                      na lista
                    </span>
                  )}

                  <span className="font-data w-12 shrink-0 text-right text-caption text-fg-muted">
                    {entry.time ?? '—'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}