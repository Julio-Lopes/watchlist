'use client';

import { CollectionCard } from '@/components/collection-card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { EyeOff } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  publicEntriesSchema,
  publicReviewsSchema,
  type CollectionSummary,
  type PublicEntry,
  type PublicReview
} from '@watchlist/shared';
import Link from 'next/link';
import { useState } from 'react';

const STATUS_COLOR: Record<string, string> = {
  watching: 'bg-success',
  completed: 'bg-accent',
  paused: 'bg-warning',
  dropped: 'bg-danger',
  planning: 'bg-fg-muted'
};

function EntryCard({ entry }: { entry: PublicEntry }) {
  const percent = entry.totalEpisodes
    ? Math.min(100, Math.round((entry.episodesWatched / entry.totalEpisodes) * 100))
    : 0;

  return (
    <Link
      href={`/media/${entry.source}/${entry.mediaType}/${entry.externalId}`}
      className="block overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-colors duration-150 hover:border-fg-muted"
    >
      <div className="relative aspect-2/3 bg-surface-hover">
        {entry.coverImage && (
          <img src={entry.coverImage} alt="" loading="lazy" className="size-full object-cover" />
        )}
        {entry.userRating !== null && (
          <span className="font-data absolute right-2 top-2 rounded-[var(--radius-control)] bg-bg/80 px-2 py-0.5 text-caption">
            {(entry.userRating / 10).toFixed(1).replace('.', ',')}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-border">
          <div
            className={`h-full ${STATUS_COLOR[entry.status] ?? 'bg-fg-muted'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-small">{entry.title}</p>
      </div>
    </Link>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex gap-3">
        <Link
          href={`/media/${review.media.source}/${review.media.mediaType}/${review.media.externalId}`}
          className="h-[78px] w-[52px] shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover"
        >
          {review.media.coverImage && (
            <img
              src={review.media.coverImage}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/media/${review.media.source}/${review.media.mediaType}/${review.media.externalId}`}
              className="truncate text-body hover:underline"
            >
              {review.media.title}
            </Link>
            {review.rating !== null && (
              <span className="font-data shrink-0 text-body">
                {(review.rating / 10).toFixed(1).replace('.', ',')}
              </span>
            )}
          </div>

          {/** Spoiler escondido no cliente porque o texto ja veio junto.
           *   A filtragem no servidor e da Etapa 18. */}
          {review.containsSpoilers && !revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-2 flex items-center gap-1.5 text-small text-fg-muted hover:text-fg"
            >
              <EyeOff className="size-4" aria-hidden />
              Contém spoiler. Toque para ler.
            </button>
          ) : (
            <p className="mt-2 whitespace-pre-line text-small text-fg-muted">{review.content}</p>
          )}
        </div>
      </div>
    </article>
  );
}

interface Props {
  username: string;
  entriesCount: number;
  reviewsCount: number;
  initialEntries: PublicEntry[];
  initialEntriesCursor: string | null;
  initialReviews: PublicReview[];
  initialReviewsCursor: string | null;
  collections: CollectionSummary[];
}

export function ProfileTabs({
  username,
  entriesCount,
  reviewsCount,
  initialEntries,
  initialEntriesCursor,
  initialReviews,
  initialReviewsCursor,
  collections
}: Props) {
  const [tab, setTab] = useState<'entries' | 'reviews' | 'collections'>('entries');
  const [entries, setEntries] = useState(initialEntries);
  const [entriesCursor, setEntriesCursor] = useState(initialEntriesCursor);
  const [reviews, setReviews] = useState(initialReviews);
  const [reviewsCursor, setReviewsCursor] = useState(initialReviewsCursor);
  const [busy, setBusy] = useState(false);

  async function loadMore() {
    setBusy(true);

    try {
      if (tab === 'entries' && entriesCursor) {
        const page = await apiFetch(
          `/users/${username}/entries?cursor=${encodeURIComponent(entriesCursor)}`,
          { schema: publicEntriesSchema }
        );
        setEntries((current) => [...current, ...page.items]);
        setEntriesCursor(page.nextCursor);
      }

      if (tab === 'reviews' && reviewsCursor) {
        const page = await apiFetch(
          `/users/${username}/reviews?cursor=${encodeURIComponent(reviewsCursor)}`,
          { schema: publicReviewsSchema }
        );
        setReviews((current) => [...current, ...page.items]);
        setReviewsCursor(page.nextCursor);
      }
    } finally {
      setBusy(false);
    }
  }

  /** Colecoes vem inteiras do servidor: sao poucas por usuario e paginar
   *  acrescentaria estado sem ganho. */
  const cursor = tab === 'entries' ? entriesCursor : tab === 'reviews' ? reviewsCursor : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-5 border-b border-border">
        {(
          [
            { value: 'entries', label: 'Biblioteca', count: entriesCount },
            { value: 'reviews', label: 'Reviews', count: reviewsCount },
            { value: 'collections', label: 'Coleções', count: collections.length }
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={cn(
              'border-b-2 pb-2.5 text-small transition-colors duration-150',
              tab === option.value
                ? 'border-accent text-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            )}
          >
            {option.label} <span className="font-data text-caption">{option.count}</span>
          </button>
        ))}
      </div>

      {tab === 'collections' ? (
        collections.length === 0 ? (
          <p className="text-small text-fg-muted">Nenhuma coleção pública ainda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} username={username} />
            ))}
          </div>
        )
      ) : tab === 'entries' ? (
        entries.length === 0 ? (
          <p className="text-small text-fg-muted">Nenhuma obra na biblioteca ainda.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )
      ) : reviews.length === 0 ? (
        <p className="text-small text-fg-muted">Nenhuma review escrita ainda.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

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