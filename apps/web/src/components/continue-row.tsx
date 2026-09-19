'use client';

import { apiFetch } from '@/lib/api-client';
import { Play } from '@/lib/icons';
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
      className="flex items-center gap-3.5 bg-washi p-4 transition-colors duration-400 hover:bg-washi-2"
    >
      <span className="block h-[57px] w-[38px] shrink-0 overflow-hidden bg-[#eae6e0]">
        {entry.media.coverImage && (
          <img src={entry.media.coverImage} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-sumi">{entry.media.title}</span>
        <span className="mt-1.5 block font-mincho text-[13px] text-sumi-soft">
          {isMovie ? (
            'marcar como visto'
          ) : (
            <>
              ep {watched}
              {total ? <span className="text-sumi-faint"> / {total}</span> : null}
            </>
          )}
        </span>
        <span className="mt-2 block h-px bg-hairline">
          <span
            className="block h-px bg-torii transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </span>
      </span>

      <button
        type="button"
        onClick={mark}
        disabled={busy}
        aria-label="Marcar episódio"
        className="flex shrink-0 cursor-pointer border-0 bg-transparent p-1.5 text-sumi-faint transition-colors duration-400 hover:text-sumi disabled:opacity-40"
      >
        <Play className="size-4" strokeWidth={1.2} aria-hidden />
      </button>
    </Link>
  );
}

export function ContinueRow({ items }: { items: Entry[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-[18px] text-[11px] tracking-[0.2em] text-sumi-faint uppercase">Continuar</h2>
      {/** Vem antes do acervo de proposito: o uso diario e marcar episodio do
       *   que ja esta no meio, nao navegar pela colecao inteira. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-px border-y border-hairline bg-hairline">
        {items.map((entry) => (
          <ContinueCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
