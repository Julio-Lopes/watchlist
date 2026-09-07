'use client';

import { Button } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/api-client';
import { Trash2 } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { diaryResponseSchema, type DiaryDay } from '@watchlist/shared';
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
          {day.events.map((event) => (
            <div key={event.id} className="group flex items-center gap-3 py-1.5">
              <Link
                href={`/media/${event.media.source}/${event.media.mediaType}/${event.media.externalId}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="h-[42px] w-7 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface">
                  {event.media.coverImage && (
                    <img
                      src={event.media.coverImage}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-small">{event.media.title}</p>
                  <p className="font-data mt-0.5 text-caption text-fg-muted">
                    {event.episodeNumber !== null ? `ep ${event.episodeNumber}` : '1 episódio'}
                    {event.isRewatch ? ' · rewatch' : ''}
                  </p>
                </div>
              </Link>

              {event.minutes !== null && (
                <span className="font-data text-caption text-border">{event.minutes} min</span>
              )}

              <button
                type="button"
                onClick={() => onDelete(event.id)}
                aria-label="Apagar registro"
                className="text-fg-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
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
        .map((day) => ({
          ...day,
          events: day.events.filter((event) => event.id !== id),
          totalEpisodes: day.events.some((event) => event.id === id)
            ? day.totalEpisodes - 1
            : day.totalEpisodes
        }))
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