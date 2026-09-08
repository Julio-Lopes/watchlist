'use client';

import { Button } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { diaryResponseSchema, type DiaryDay, type DiaryEvent } from '@watchlist/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

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
 *  quarenta e sete numeros nao ajuda ninguem. */
function describeEpisodes(group: MediaGroup): string {
  const numbers = group.events
    .map((event) => event.episodeNumber)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  const rewatch = group.events.some((event) => event.isRewatch) ? ' · rewatch' : '';

  if (numbers.length === 0) {
    return `${group.events.length} ${group.events.length === 1 ? 'episódio' : 'episódios'}${rewatch}`;
  }

  if (numbers.length === 1) return `ep ${numbers[0]}${rewatch}`;

  const first = numbers[0]!;
  const last = numbers.at(-1)!;
  const contiguous = last - first + 1 === numbers.length;

  return contiguous
    ? `ep ${first} a ${last} · ${numbers.length} episódios${rewatch}`
    : `${numbers.length} episódios${rewatch}`;
}

function DayBlock({ day, onDelete }: { day: DiaryDay; onDelete: (id: string) => void }) {
  const date = parseLocal(day.date);
  const isToday = day.date === todayIso();

  return (
    <>
      {day.gapDays > 0 && (
        <div className="col-span-2 py-3 pl-[74px] text-caption text-border">
          — {day.gapDays} {day.gapDays === 1 ? 'dia' : 'dias'} sem registro —
        </div>
      )}

      <div className="pt-0.5 text-right">
        <p className="font-data text-h3 leading-none">{String(date.getDate()).padStart(2, '0')}</p>
        <p className="mt-1 text-caption text-fg-muted">
          {MONTHS[date.getMonth()]} · {WEEKDAYS[date.getDay()]?.slice(0, 3)}
        </p>
      </div>

      <div className="relative border-l border-border pb-6 pl-4">
        <span
          className={cn(
            'absolute -left-[3.5px] top-1.5 size-[7px] rounded-full',
            isToday ? 'bg-accent' : 'bg-border'
          )}
        />

        <div className="flex items-baseline justify-between">
          <p className="text-small">{isToday ? 'Hoje' : (WEEKDAYS[date.getDay()] ?? '')}</p>
          <p className="font-data text-caption text-accent">
            {day.totalEpisodes} {day.totalEpisodes === 1 ? 'ep' : 'eps'}
            {day.totalMinutes > 0 ? ` · ${formatMinutes(day.totalMinutes)}` : ''}
          </p>
        </div>

        <div className="mt-2">
          {groupByMedia(day.events).map((group) => (
            <div key={group.mediaId} className="group py-1.5">
              <div className="flex items-center gap-3">
                <Link
                  href={`/media/${group.media.source}/${group.media.mediaType}/${group.media.externalId}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="h-[42px] w-7 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface">
                    {group.media.coverImage && (
                      <img
                        src={group.media.coverImage}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-small">{group.media.title}</p>
                    <p className="font-data mt-0.5 text-caption text-fg-muted">
                      {describeEpisodes(group)}
                    </p>
                  </div>
                </Link>

                {group.minutes > 0 && (
                  <span className="font-data text-caption text-border">{group.minutes} min</span>
                )}
              </div>

              {/** Os episodios individuais so no hover: a leitura fica limpa e
               *   a granularidade continua la para apagar um registro errado. */}
              {group.events.length > 1 && (
                <div className="mt-1 hidden flex-wrap gap-1 pl-10 group-hover:flex">
                  {group.events.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onDelete(event.id)}
                      title="Apagar este registro"
                      className="font-data rounded-[var(--radius-control)] border border-border px-1.5 py-0.5 text-caption text-fg-muted hover:border-danger hover:text-danger"
                    >
                      {event.episodeNumber ?? '·'}
                    </button>
                  ))}
                </div>
              )}

              {group.events.length === 1 && (
                <div className="mt-1 hidden pl-10 group-hover:block">
                  <button
                    type="button"
                    onClick={() => onDelete(group.events[0]!.id)}
                    className="text-caption text-fg-muted hover:text-danger"
                  >
                    Apagar registro
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <p className="text-body">Nenhum registro ainda</p>
        <p className="mt-1 text-small text-fg-muted">
          Marque um episódio na biblioteca e ele aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-x-4">
        {days.map((day) => (
          <DayBlock key={day.date} day={day} onDelete={remove} />
        ))}
      </div>

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void loadMore()} disabled={busy}>
            {busy ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
}