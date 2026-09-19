'use client';

import { CollectionCard } from '@/components/collection-card';
import { apiFetch } from '@/lib/api-client';
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
import { SpoilerText } from './spoiler-text';

/** Mesmas três leituras da biblioteca: torii = assistindo, sumi = concluído,
 *  cinza = o resto. */
const STATUS_COLOR: Record<string, string> = {
  watching: 'bg-torii',
  completed: 'bg-sumi',
  paused: 'bg-[#b0aaa3]',
  dropped: 'bg-[#b0aaa3]',
  planning: 'bg-[#b0aaa3]'
};

function EntryCard({ entry }: { entry: PublicEntry }) {
  const percent = entry.totalEpisodes
    ? Math.min(100, Math.round((entry.episodesWatched / entry.totalEpisodes) * 100))
    : 0;

  return (
    <Link href={`/media/${entry.source}/${entry.mediaType}/${entry.externalId}`} className="block">
      <span className="relative block aspect-2/3 bg-[#eae6e0]">
        {entry.coverImage && (
          <img src={entry.coverImage} alt="" loading="lazy" className="size-full object-cover" />
        )}
        <span className="absolute inset-x-0 bottom-0 block h-px bg-sumi/20">
          <span
            className={`block h-px ${STATUS_COLOR[entry.status] ?? 'bg-[#b0aaa3]'}`}
            style={{ width: `${percent}%` }}
          />
        </span>
      </span>
      <span className="mt-2.5 flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-sumi">{entry.title}</span>
        {entry.userRating !== null && (
          <span className="shrink-0 font-mincho text-[13.5px] text-sumi">
            {(entry.userRating / 10).toFixed(1).replace('.', ',')}
          </span>
        )}
      </span>
    </Link>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const href = `/media/${review.media.source}/${review.media.mediaType}/${review.media.externalId}`;

  return (
    <article className="flex gap-[clamp(14px,2vw,22px)] border-b border-hairline px-1.5 py-[clamp(18px,2.4vh,26px)] transition-colors duration-400 hover:bg-washi-2">
      <Link href={href} className="block h-[78px] w-[52px] shrink-0 overflow-hidden bg-[#eae6e0]">
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
        <div className="flex items-baseline gap-3">
          <Link
            href={href}
            className="min-w-0 truncate border-b border-[#d9d4cd] pb-px text-[15.5px] text-sumi"
          >
            {review.media.title}
          </Link>
          {review.rating !== null && (
            <span className="shrink-0 font-mincho text-base text-sumi">
              {(review.rating / 10).toFixed(1).replace('.', ',')}
            </span>
          )}
        </div>

        <SpoilerText
          reviewId={review.id}
          content={review.content}
          hidden={review.containsSpoilers}
          tone="washi"
        />
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

const emptyText = 'text-[15px] leading-[1.85] font-light text-sumi-soft';

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
    <div>
      <div className="mt-[clamp(34px,5vh,50px)] flex gap-[26px] border-b border-hairline">
        {(
          [
            { value: 'entries', label: 'Biblioteca', count: entriesCount },
            { value: 'reviews', label: 'Reviews', count: reviewsCount },
            { value: 'collections', label: 'Coleções', count: collections.length }
          ] as const
        ).map((option) => {
          const active = tab === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              className={cn(
                'group relative cursor-pointer border-0 bg-transparent pb-[11px] text-[13.5px] transition-colors duration-400',
                active ? 'text-sumi' : 'text-sumi-faint hover:text-sumi'
              )}
            >
              {option.label}{' '}
              <span className="font-mincho text-[13px] text-sumi-faint">{option.count}</span>
              <span
                className={cn(
                  'absolute -bottom-px left-0 h-px w-full origin-left transition-transform duration-450 ease-out',
                  active ? 'scale-x-100 bg-sumi' : 'scale-x-0 bg-torii group-hover:scale-x-100'
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-[clamp(24px,3vh,34px)]">
        {tab === 'collections' ? (
          collections.length === 0 ? (
            <p className={emptyText}>Nenhuma coleção pública ainda.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-[clamp(24px,3vw,40px)]">
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  username={username}
                  tone="washi"
                />
              ))}
            </div>
          )
        ) : tab === 'entries' ? (
          entries.length === 0 ? (
            <p className={emptyText}>Nenhuma obra na biblioteca ainda.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] gap-x-[clamp(14px,1.8vw,20px)] gap-y-[clamp(18px,2.4vw,28px)]">
              {entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )
        ) : reviews.length === 0 ? (
          <p className={emptyText}>Nenhuma review escrita ainda.</p>
        ) : (
          <div className="border-t border-hairline">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>

      {cursor && (
        <div className="mt-[clamp(30px,4vh,44px)] border-t border-hairline pt-[clamp(24px,3vh,32px)]">
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
