'use client';

import { apiFetch } from '@/lib/api-client';
import { CircleCheck, Play } from '@/lib/icons';
import type { Entry } from '@watchlist/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

function ContinueCard({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [watched, setWatched] = useState(entry.episodesWatched);
  const [busy, setBusy] = useState(false);

  const total = entry.media.totalEpisodes;
  const percent = total ? Math.min(100, Math.round((watched / total) * 100)) : 0;
  const isMovie = entry.media.mediaType === 'movie';

  async function mark(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);

    try {
      if (isMovie) {
        /** Filme nao tem progresso, tem visto ou nao visto. Um gesto so. */
        await apiFetch(`/entries/${entry.id}`, {
          method: 'PATCH',
          body: { status: 'completed' }
        });
        toast.success(`${entry.media.title} concluído.`);
      } else {
        const result = await apiFetch<never>(`/entries/${entry.id}/progress`, {
          method: 'POST',
          body: { delta: 1 }
        });
        setWatched((result as { episodesWatched: number }).episodesWatched);
      }

      router.refresh();
    } catch {
      toast.error('Não foi possível registrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link
      href={`/media/${entry.media.source}/${entry.media.mediaType}/${entry.media.externalId}`}
      className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 transition-colors duration-150 hover:border-fg-muted"
    >
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover">
        {entry.media.coverImage && (
          <img src={entry.media.coverImage} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-small">{entry.media.title}</p>
        <p className="font-data mt-1 text-caption text-fg-muted">
          {isMovie ? <CircleCheck className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
        </p>
        <div className="mt-2 h-0.5 bg-border">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <button
        type="button"
        onClick={mark}
        disabled={busy}
        aria-label="Marcar episódio"
        className="self-center text-accent transition-opacity duration-150 hover:opacity-70 disabled:opacity-40"
      >
        <Play className="size-5" aria-hidden />
      </button>
    </Link>
  );
}

export function ContinueRow({ items }: { items: Entry[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-caption tracking-wide text-fg-muted uppercase">Continuar</h2>
      {/** Vem antes do acervo de proposito: o uso diario e marcar episodio do
       *   que ja esta no meio, nao navegar pela colecao inteira. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((entry) => (
          <ContinueCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}