'use client';

import { ApiError, apiFetch } from '@/lib/api-client';
import { diaryResponseSchema, type DiaryDay, type DiaryEvent } from '@watchlist/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const DATE_COL = 'w-[clamp(48px,6vw,62px)] flex-none';
const GUTTER = 'gap-[clamp(14px,2.4vw,26px)]';

/** A data vem como YYYY-MM-DD e representa o dia local do usuario. Passar por
 *  new Date direto interpretaria como UTC e deslocaria um dia. */
const parseLocal = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
};

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
};

const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface MediaGroup {
  mediaId: string;
  media: DiaryEvent['media'];
  events: DiaryEvent[];
  minutes: number;
}

function groupByMedia(events: DiaryEvent[]): MediaGroup[] {
  const groups = new Map<string, MediaGroup>();

  for (const event of events) {
    const group = groups.get(event.media.id) ?? {
      mediaId: event.media.id,
      media: event.media,
      events: [],
      minutes: 0
    };

    group.events.push(event);
    group.minutes += event.minutes ?? 0;
    groups.set(event.media.id, group);
  }

  return [...groups.values()];
}

/** Sequencia contigua vira intervalo; salto grande vira contagem. Listar
 *  quarenta e sete numeros nao ajuda ninguem. Devolve [principal, resto]. */
function describeEpisodes(group: MediaGroup): [string, string] {
  const numbers = group.events
    .map((event) => event.episodeNumber)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  const rewatch = group.events.some((event) => event.isRewatch) ? ' · rewatch' : '';

  if (numbers.length === 0) {
    return [`${group.events.length} ${group.events.length === 1 ? 'episódio' : 'episódios'}${rewatch}`, ''];
  }

  if (numbers.length === 1) return [`ep ${numbers[0]}${rewatch}`, ''];

  const first = numbers[0]!;
  const last = numbers.at(-1)!;
  const contiguous = last - first + 1 === numbers.length;

  return contiguous
    ? [`ep ${first} a ${last}`, ` · ${numbers.length} episódios${rewatch}`]
    : [`${numbers.length} episódios${rewatch}`, ''];
}

function DayBlock({ day, onDelete }: { day: DiaryDay; onDelete: (id: string) => void }) {
  const date = parseLocal(day.date);
  const isToday = day.date === todayIso();

  return (
    <>
      {/** A ausência tem tamanho: a lacuna vira espaço vertical proporcional
       *  ao intervalo, e a legenda só confirma o que o olho já mediu. */}
      {day.gapDays > 0 && (
        <div className={`flex ${GUTTER}`}>
          <div className={DATE_COL} />
          <div
            className="min-w-0 flex-1 border-l border-hairline pl-[clamp(16px,2vw,24px)]"
            style={{ paddingBlock: `${Math.min(16 + day.gapDays * 8, 72)}px` }}
          >
            <p className="text-[11.5px] tracking-[0.14em] text-sumi-faint">
              — {day.gapDays} {day.gapDays === 1 ? 'dia' : 'dias'} sem registro —
            </p>
          </div>
        </div>
      )}

      <section className={`flex ${GUTTER}`}>
        <div className={`${DATE_COL} pt-0.5 text-right`}>
          <p className="font-mincho text-[clamp(26px,3vw,32px)] leading-none text-sumi">
            {String(date.getDate()).padStart(2, '0')}
          </p>
          <p className="mt-1.5 text-[11px] tracking-[0.08em] text-sumi-faint">
            {MONTHS[date.getMonth()]} · {WEEKDAYS[date.getDay()]?.slice(0, 3)}
          </p>
        </div>

        <div className="relative min-w-0 flex-1 border-l border-hairline pl-[clamp(16px,2vw,24px)]">
          <span
            className={`absolute top-[7px] -left-[3px] size-[5px] rounded-full ${isToday ? 'bg-torii' : 'bg-[#d9d4cd]'}`}
          />

          <div className="flex items-baseline gap-3.5">
            <p className="text-sm text-sumi">{isToday ? 'Hoje' : (WEEKDAYS[date.getDay()] ?? '')}</p>
            <p className="ml-auto font-mincho text-sm text-sumi-soft">
              {day.totalEpisodes} {day.totalEpisodes === 1 ? 'ep' : 'eps'}
              {day.totalMinutes > 0 ? ` · ${formatMinutes(day.totalMinutes)}` : ''}
            </p>
          </div>

          <div className="mt-3.5 pb-1">
            {groupByMedia(day.events).map((group) => {
              const [main, rest] = describeEpisodes(group);

              return (
                <div key={group.mediaId} className="group transition-colors duration-400 hover:bg-washi-2">
                  <div className="flex items-center gap-3.5 py-[9px] pr-1.5">
                    <Link
                      href={`/media/${group.media.source}/${group.media.mediaType}/${group.media.externalId}`}
                      className="flex min-w-0 flex-1 items-center gap-3.5"
                    >
                      <span className="block h-[42px] w-7 shrink-0 overflow-hidden bg-[#eae6e0]">
                        {group.media.coverImage && (
                          <img
                            src={group.media.coverImage}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        )}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm text-sumi">{group.media.title}</span>
                        <span className="mt-1 block font-mincho text-[13px] text-sumi-soft">
                          {main}
                          {rest && <span className="text-sumi-faint">{rest}</span>}
                        </span>
                      </span>
                    </Link>

                    {group.minutes > 0 && (
                      <span className="shrink-0 font-mincho text-[13px] text-sumi-faint">
                        {group.minutes} min
                      </span>
                    )}
                  </div>

                  {/** Os episodios individuais so no hover: a leitura fica limpa e
                   *   a granularidade continua la para apagar um registro errado. */}
                  {group.events.length > 1 && (
                    <div className="hidden flex-wrap gap-1 pb-2 pl-[42px] group-hover:flex">
                      {group.events.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onDelete(event.id)}
                          title="Apagar este registro"
                          className="cursor-pointer border border-[#d9d4cd] bg-transparent px-1.5 py-0.5 font-mincho text-xs text-sumi-faint transition-colors duration-400 hover:border-torii hover:text-torii"
                        >
                          {event.episodeNumber ?? '·'}
                        </button>
                      ))}
                    </div>
                  )}

                  {group.events.length === 1 && (
                    <div className="hidden pb-2 pl-[42px] group-hover:block">
                      <button
                        type="button"
                        onClick={() => onDelete(group.events[0]!.id)}
                        className="cursor-pointer border-0 bg-transparent p-0 text-xs text-sumi-faint transition-colors duration-400 hover:text-torii"
                      >
                        Apagar registro
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

interface Props {
  initialDays: DiaryDay[];
  initialCursor: string | null;
  type?: string;
}

export function DiaryTimeline({ initialDays, initialCursor, type }: Props) {
  const router = useRouter();
  const [days, setDays] = useState(initialDays);
  const [cursor, setCursor] = useState(initialCursor);
  const [busy, setBusy] = useState(false);

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);

    try {
      const query = new URLSearchParams({ cursor });
      if (type) query.set('type', type);

      const page = await apiFetch(`/diary?${query.toString()}`, { schema: diaryResponseSchema });
      setDays((current) => [...current, ...page.days]);
      setCursor(page.nextCursor);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    /** Atualiza a tela antes da resposta: apagar registro errado e frustrante
     *  o suficiente sem precisar esperar meio segundo para ver o efeito. */
    const previous = days;
    setDays((current) =>
      current
        .map((day) => {
          const target = day.events.find((event) => event.id === id);
          if (!target) return day;

          return {
            ...day,
            events: day.events.filter((event) => event.id !== id),
            totalEpisodes: day.totalEpisodes - 1,
            totalMinutes: day.totalMinutes - (target.minutes ?? 0)
          };
        })
        .filter((day) => day.events.length > 0)
    );

    try {
      await apiFetch(`/diary/${id}`, { method: 'DELETE' });
      router.refresh();
    } catch (cause) {
      setDays(previous);
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível apagar.');
    }
  }

  if (days.length === 0) {
    return (
      <div className="mt-[clamp(26px,4vh,40px)]">
        <p className="kicker">&nbsp;·&nbsp; ainda vazio</p>
        <p className="mt-[18px] font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">
          Nenhum registro ainda
        </p>
        <p className="mt-3 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
          Marque um episódio na biblioteca e ele aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[clamp(26px,4vh,40px)]">
      {days.map((day) => (
        <DayBlock key={day.date} day={day} onDelete={remove} />
      ))}

      {cursor && (
        <div className="mt-[clamp(34px,5vh,50px)] border-t border-hairline pt-[clamp(26px,4vh,36px)]">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={busy}
            className="cursor-pointer border border-[#d9d4cd] bg-transparent px-6.5 py-3.5 text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-sumi"
          >
            {busy ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  );
}
