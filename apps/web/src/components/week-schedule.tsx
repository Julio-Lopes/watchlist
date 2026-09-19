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
      <div className="mt-[clamp(26px,4vh,40px)]">
        <p className="kicker">&nbsp;·&nbsp; ainda vazio</p>
        <p className="mt-[18px] font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">Nada na agenda</p>
        <p className="mt-3 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
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
    <div>
      {order.map((weekday) => {
        const entries = (byWeekday.get(weekday) ?? []).sort((a, b) =>
          (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
        );

        return (
          <section key={weekday} className="mt-[clamp(30px,4vh,44px)]">
            <div className="flex flex-wrap items-baseline gap-3 border-b border-hairline pb-3">
              <h2 className="font-mincho text-[clamp(19px,2.2vw,24px)] font-normal text-sumi">
                {WEEKDAY_NAMES[weekday]}
              </h2>
              {weekday === today && (
                <span className="text-[11px] tracking-[0.2em] text-torii uppercase">hoje</span>
              )}
              <span className="font-mincho text-[13px] text-sumi-faint">
                {entries.length} {entries.length === 1 ? 'obra' : 'obras'}
              </span>
            </div>

            {/** O horário é a espinha da agenda: primeira coluna, como a data
             *  no Diário, colado ao título que ele governa. */}
            <div className="mt-1.5">
              {entries.map((entry) => (
                <Link
                  key={entry.media.externalId}
                  href={`/media/${entry.media.source}/${entry.media.mediaType}/${entry.media.externalId}`}
                  className="flex items-center gap-[clamp(12px,1.8vw,20px)] border-b border-[#f0ece6] px-1.5 py-[11px] transition-colors duration-400 hover:bg-washi-2"
                >
                  <span className="w-[clamp(44px,5vw,58px)] shrink-0 font-mincho text-[15px] tracking-[0.02em] text-sumi">
                    {entry.time ?? '—'}
                  </span>

                  <span className="block h-[54px] w-9 shrink-0 overflow-hidden bg-[#eae6e0]">
                    {entry.media.coverImage && (
                      <img
                        src={entry.media.coverImage}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-sumi">{entry.media.title}</span>
                    <span className="mt-[5px] block text-xs tracking-[0.04em] text-sumi-faint">
                      {entry.media.totalEpisodes ? `${entry.media.totalEpisodes} eps` : 'em exibição'}
                      {entry.media.avgScore && (
                        <>
                          {' · '}
                          <span className="font-mincho text-[13px] text-sumi-soft">
                            {(entry.media.avgScore / 10).toFixed(1).replace('.', ',')}
                          </span>
                        </>
                      )}
                    </span>
                  </span>

                  {entry.inLibrary && (
                    <span className="shrink-0 text-[11px] tracking-[0.14em] text-torii uppercase">
                      na lista
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
