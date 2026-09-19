'use client';

import { apiFetch } from '@/lib/api-client';
import { EyeOff } from '@/lib/icons';
import { feedResponseSchema, revealedReviewSchema, type FeedItem } from '@watchlist/shared';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const relative = (iso: string): string => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  const days = Math.round(minutes / 1440);
  return days < 30 ? `${days}d` : `${Math.round(days / 30)}mes`;
};

/** Versão washi do spoiler retido — inline em vez de @/components/spoiler-text
 *  porque aquele componente é compartilhado com telas ainda no tema escuro. */
function FeedSpoiler({ reviewId, content, hidden }: { reviewId: string; content: string; hidden: boolean }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reveal() {
    setBusy(true);

    try {
      const result = await apiFetch(`/reviews/${reviewId}/reveal`, { schema: revealedReviewSchema });
      setRevealed(result.content);
    } catch {
      toast.error('Não foi possível carregar o texto.');
    } finally {
      setBusy(false);
    }
  }

  if (hidden && revealed === null) {
    return (
      <button
        type="button"
        onClick={() => void reveal()}
        disabled={busy}
        className="mt-2.5 flex w-full cursor-pointer items-center gap-2 border-0 bg-washi-2 py-3 pr-4 pl-4 text-left text-xs tracking-[0.12em] text-sumi-faint uppercase transition-colors duration-400 hover:text-sumi"
        style={{ borderLeft: '1px solid #d9d4cd' }}
      >
        <EyeOff className="size-3.5 shrink-0" strokeWidth={1.2} aria-hidden />
        {busy ? 'Carregando…' : 'Contém spoiler — toque para ler'}
      </button>
    );
  }

  return (
    <p className="mt-2.5 max-w-[38em] border-l border-hairline pl-4 font-mincho text-[15.5px] leading-[1.75] text-sumi-soft">
      {revealed ?? content}
    </p>
  );
}

function Card({ item }: { item: FeedItem }) {
  const href = `/media/${item.media.source}/${item.media.mediaType}/${item.media.externalId}`;

  return (
    <article className="border-t border-hairline px-1 py-[clamp(20px,3vh,28px)] transition-colors duration-400 hover:bg-washi-2">
      <header className="flex items-center gap-2.5">
        <Link href={`/u/${item.actor.username}`} className="flex min-w-0 items-center gap-2.5">
          {item.actor.avatarUrl ? (
            <img src={item.actor.avatarUrl} alt="" className="size-[26px] shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[#d9d4cd] font-mincho text-[11px] text-sumi-faint">
              {item.actor.username[0]?.toUpperCase()}
            </span>
          )}
          <span className="text-[13.5px] text-sumi">{item.actor.username}</span>
        </Link>

        <span className="text-[13.5px] text-sumi-faint">
          {item.kind === 'watched' ? (item.episodes > 3 ? 'maratonou' : 'assistiu') : 'escreveu sobre'}
        </span>

        <span className="ml-auto shrink-0 text-[11.5px] tracking-[0.1em] text-sumi-faint">
          {relative(item.at)}
        </span>
      </header>

      <div className="mt-3.5 flex gap-3.5">
        <Link href={href} className="block h-[78px] w-[52px] shrink-0 overflow-hidden bg-[#eae6e0]">
          {item.media.coverImage && (
            <img src={item.media.coverImage} alt="" loading="lazy" className="size-full object-cover" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5">
            <Link href={href} className="border-b border-[#d9d4cd] pb-px text-[15.5px] text-sumi">
              {item.media.title}
            </Link>
            {item.kind === 'review' && item.rating !== null && (
              <span className="shrink-0 font-mincho text-[15.5px] text-sumi">
                {(item.rating / 10).toFixed(1)}
              </span>
            )}
          </div>

          {item.kind === 'watched' ? (
            <>
              <p className="mt-2 font-mincho text-sm tracking-[0.02em] text-torii">
                {item.firstEpisode !== null && item.lastEpisode !== null && item.episodes > 1
                  ? `ep ${item.firstEpisode} a ${item.lastEpisode} · ${item.episodes} episódios`
                  : item.firstEpisode !== null
                    ? `ep ${item.firstEpisode}`
                    : `${item.episodes} ${item.episodes === 1 ? 'episódio' : 'episódios'}`}
              </p>
              {item.minutes > 0 && (
                <p className="mt-1.5 text-xs tracking-[0.04em] text-sumi-faint">{item.minutes} min</p>
              )}
            </>
          ) : (
            <FeedSpoiler
              reviewId={item.id.replace(/^r-/, '')}
              content={item.excerpt}
              hidden={item.containsSpoilers}
            />
          )}
        </div>
      </div>
    </article>
  );
}

interface Props {
  initialItems: FeedItem[];
  initialCursor: string | null;
}

export function FeedList({ initialItems, initialCursor }: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [busy, setBusy] = useState(false);

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);

    try {
      const page = await apiFetch(`/feed?cursor=${encodeURIComponent(cursor)}`, {
        schema: feedResponseSchema
      });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-[clamp(30px,5vh,46px)]">
      {items.map((item) => (
        <Card key={item.id} item={item} />
      ))}

      {cursor && (
        <div className="border-t border-hairline pt-[clamp(26px,4vh,38px)]">
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
