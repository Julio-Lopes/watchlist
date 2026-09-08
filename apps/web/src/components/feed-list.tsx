'use client';

import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { EyeOff } from '@/lib/icons';
import { feedResponseSchema, type FeedItem } from '@watchlist/shared';
import Link from 'next/link';
import { useState } from 'react';

const relative = (iso: string): string => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  const days = Math.round(minutes / 1440);
  return days < 30 ? `${days}d` : `${Math.round(days / 30)}mes`;
};

function Card({ item }: { item: FeedItem }) {
  const [revealed, setRevealed] = useState(false);
  const href = `/media/${item.media.source}/${item.media.mediaType}/${item.media.externalId}`;

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <header className="flex items-center gap-2.5">
        <Link href={`/u/${item.actor.username}`} className="flex items-center gap-2.5">
          {item.actor.avatarUrl ? (
            <img src={item.actor.avatarUrl} alt="" className="size-6 rounded-full" />
          ) : (
            <span className="size-6 rounded-full bg-surface-hover" />
          )}
          <span className="text-small">{item.actor.username}</span>
        </Link>

        <span className="text-small text-fg-muted">
          {item.kind === 'watched' ? (item.episodes > 3 ? 'maratonou' : 'assistiu') : 'escreveu sobre'}
        </span>

        <span className="font-data ml-auto text-caption text-border">{relative(item.at)}</span>
      </header>

      <div className="mt-3 flex gap-3">
        <Link href={href} className="h-[78px] w-[52px] shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover">
          {item.media.coverImage && (
            <img src={item.media.coverImage} alt="" loading="lazy" className="size-full object-cover" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link href={href} className="truncate text-body hover:underline">
              {item.media.title}
            </Link>
            {item.kind === 'review' && item.rating !== null && (
              <span className="font-data shrink-0 text-body">{(item.rating / 10).toFixed(1)}</span>
            )}
          </div>

          {item.kind === 'watched' ? (
            <>
              <p className="font-data mt-1 text-small text-accent">
                {item.firstEpisode !== null && item.lastEpisode !== null && item.episodes > 1
                  ? `ep ${item.firstEpisode} a ${item.lastEpisode} · ${item.episodes} episódios`
                  : item.firstEpisode !== null
                    ? `ep ${item.firstEpisode}`
                    : `${item.episodes} ${item.episodes === 1 ? 'episódio' : 'episódios'}`}
              </p>
              {item.minutes > 0 && (
                <p className="mt-1.5 text-caption text-border">{item.minutes} min</p>
              )}
            </>
          ) : item.containsSpoilers && !revealed ? (
            /** Spoiler escondido no cliente porque o texto ja veio. A filtragem
             *  de verdade, no servidor, e da Etapa 18. */
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-2 flex items-center gap-1.5 text-small text-fg-muted hover:text-fg"
            >
              <EyeOff className="size-4" aria-hidden />
              Contém spoiler. Toque para ler.
            </button>
          ) : (
            <p className="mt-2 text-small text-fg-muted">{item.excerpt}</p>
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
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} item={item} />
      ))}

      {cursor && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => void loadMore()} disabled={busy}>
            {busy ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
}