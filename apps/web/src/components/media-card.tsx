'use client';

import { apiFetch } from '@/lib/api-client';
import { Plus } from '@/lib/icons';
import type { Entry } from '@watchlist/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const TYPE_LABEL: Record<string, string> = { anime: 'Anime', show: 'Série', movie: 'Filme' };

/** Cinco status do modelo reduzidos a três tons: torii = assistindo, sumi =
 *  concluído, cinza = pausado/largado. Planejo não tem progresso a mostrar. */
const STATUS_COLOR: Record<string, string> = {
  watching: 'bg-torii',
  completed: 'bg-sumi',
  paused: 'bg-[#b0aaa3]',
  dropped: 'bg-[#b0aaa3]',
  planning: 'bg-[#b0aaa3]'
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
      <span className="relative block aspect-2/3 bg-[#eae6e0]">
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

        {/** O alvo só aparece no hover: o card fica limpo por padrão e o
         *   botão deixa de competir com o clique que leva ao detalhe. */}
        {entry.status !== 'completed' && entry.status !== 'planning' && (
          <button
            type="button"
            onClick={markEpisode}
            disabled={busy}
            aria-label="Marcar episódio"
            className="absolute right-2 bottom-3 z-10 flex cursor-pointer items-center gap-1 border-0 bg-sumi px-2.5 py-1.5 text-xs text-washi opacity-0 transition-opacity duration-400 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
          >
            <Plus className="size-3.5" strokeWidth={1.2} aria-hidden />1 ep
          </button>
        )}

        <span className="absolute inset-x-0 bottom-0 block h-px bg-sumi/20">
          <span
            className={`block h-px transition-[width] duration-300 ${STATUS_COLOR[entry.status] ?? 'bg-sumi'}`}
            style={{ width: `${percent}%` }}
          />
        </span>
      </span>

      <span className="mt-2.5 flex items-baseline gap-2">
        <span className="block min-w-0 flex-1 truncate text-[13.5px] leading-[1.45] text-sumi">
          {entry.media.title}
        </span>
        {entry.userRating !== null && (
          <span className="shrink-0 font-mincho text-sm text-sumi">
            {(entry.userRating / 10).toFixed(1)}
          </span>
        )}
      </span>

      <span className="mt-[5px] flex items-baseline gap-2 text-xs text-sumi-faint">
        <span className="font-mincho text-sumi-soft">
          {total ? `${watched} / ${total}` : `${watched} ep`}
        </span>
        <span className="ml-auto tracking-[0.08em]">{TYPE_LABEL[entry.media.mediaType]}</span>
      </span>
    </Link>
  );
}
