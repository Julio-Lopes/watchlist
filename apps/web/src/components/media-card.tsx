'use client';

import { apiFetch } from '@/lib/api-client';
import { Plus } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Entry } from '@watchlist/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const TYPE_LABEL: Record<string, string> = { anime: 'Anime', show: 'Série', movie: 'Filme' };

const STATUS_COLOR: Record<string, string> = {
  watching: 'bg-success',
  completed: 'bg-accent',
  paused: 'bg-warning',
  dropped: 'bg-danger',
  planning: 'bg-fg-muted'
};

export function MediaCard({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [watched, setWatched] = useState(entry.episodesWatched);
  const [busy, setBusy] = useState(false);

  const total = entry.media.totalEpisodes;
  const percent = total ? Math.min(100, Math.round((watched / total) * 100)) : 0;
  const href = `/media/${entry.media.source}/${entry.media.mediaType}/${entry.media.externalId}`;

  async function markEpisode(event: React.MouseEvent) {
    /** O botao vive dentro do Link. Sem parar a propagacao, o clique borbulha
     *  e o Next navega para o detalhe antes de a requisicao terminar. */
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);

    try {
      const result = await apiFetch<never>(`/entries/${entry.id}/progress`, {
        method: 'POST',
        body: { delta: 1 }
      });

      const next = (result as { episodesWatched: number; status: string }).episodesWatched;
      setWatched(next);

      if (total && next >= total) toast.success(`${entry.media.title} concluído.`);

      router.refresh();
    } catch {
      toast.error('Não foi possível marcar o episódio.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link href={href} className="group block">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-colors duration-150 hover:border-fg-muted">
        <div className="relative aspect-2/3 bg-surface-hover">
          {entry.media.coverImage && (
            // Sem next/image: a capa vem de domínio externo e a otimização
            // da Vercel tem cota. Ver decisão na Etapa 7.
            <img
              src={entry.media.coverImage}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          )}

          <span className="absolute left-2 top-2 rounded-[var(--radius-control)] bg-bg/80 px-2 py-0.5 text-caption">
            {TYPE_LABEL[entry.media.mediaType]}
          </span>

          {entry.userRating !== null && (
            <span className="font-data absolute right-2 top-2 rounded-[var(--radius-control)] bg-bg/80 px-2 py-0.5 text-caption">
              {(entry.userRating / 10).toFixed(1)}
            </span>
          )}

          {/** O alvo só aparece no hover: o card fica limpo por padrão e o
           *   botão deixa de competir com o clique que leva ao detalhe. */}
          {entry.status !== 'completed' && entry.status !== 'planning' && (
            <button
              type="button"
              onClick={markEpisode}
              disabled={busy}
              aria-label="Marcar episódio"
              className="absolute bottom-3 right-2 z-10 flex items-center gap-1 rounded-[var(--radius-control)] bg-accent px-2.5 py-1.5 text-caption opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
            >
              <Plus className="size-3.5" aria-hidden />1 ep
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 h-1 bg-border">
            <div
              className={cn('h-full transition-[width] duration-300', STATUS_COLOR[entry.status])}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="p-3">
          <p className="truncate text-small">{entry.media.title}</p>
          <p className="font-data mt-1 text-caption text-fg-muted">
            {total ? `${watched} / ${total}` : `${watched} ep`}
          </p>
        </div>
      </div>
    </Link>
  );
}