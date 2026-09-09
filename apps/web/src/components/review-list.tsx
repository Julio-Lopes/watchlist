'use client';

import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { EyeOff, Heart } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { reviewListSchema, type Review } from '@watchlist/shared';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

const likeSchema = z.object({ likesCount: z.number() });

const relative = (iso: string): string => {
  const days = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days < 1) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.round(days / 7)} semanas`;
  return `há ${Math.round(days / 30)} meses`;
};

function ReviewCard({ review, mediaHref }: { review: Review; mediaHref: string }) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(review.likedByViewer ?? false);
  const [likes, setLikes] = useState(review.likesCount);
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    const next = !liked;
    /** Otimista: curtir e barato e reversivel, e esperar a resposta faria o
     *  coracao parecer travado. */
    setLiked(next);
    setLikes((current) => current + (next ? 1 : -1));
    setBusy(true);

    try {
      const result = await apiFetch(`/reviews/${review.id}/like`, {
        method: next ? 'POST' : 'DELETE',
        schema: likeSchema
      });
      setLikes(result.likesCount);
    } catch {
      setLiked(!next);
      setLikes(review.likesCount);
      toast.error('Não foi possível curtir.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <header className="flex items-center gap-2.5">
        <Link href={`/u/${review.author.username}`} className="flex items-center gap-2.5">
          {review.author.avatarUrl ? (
            <img src={review.author.avatarUrl} alt="" className="size-6 rounded-full" />
          ) : (
            <span className="size-6 rounded-full bg-surface-hover" />
          )}
          <span className="text-small">{review.author.username}</span>
        </Link>

        {review.rating !== null && (
          <span className="font-data text-body">
            {(review.rating / 10).toFixed(1).replace('.', ',')}
          </span>
        )}

        <span className="font-data ml-auto text-caption text-fg-muted">
          {relative(review.createdAt)}
        </span>
      </header>

      {review.containsSpoilers && !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-3 flex w-full items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border px-3 py-2.5 text-small text-fg-muted transition-colors duration-150 hover:text-fg"
        >
          <EyeOff className="size-4" aria-hidden />
          Contém spoiler. Toque para ler.
        </button>
      ) : (
        <p className="mt-3 whitespace-pre-line text-small leading-relaxed text-fg-muted">
          {review.content}
        </p>
      )}

      <div className="mt-3 flex items-center gap-4">
        {review.likedByViewer === null ? (
          <span className="flex items-center gap-1.5 text-caption text-fg-muted">
            <Heart className="size-4" aria-hidden />
            {likes}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void toggleLike()}
            disabled={busy || review.isOwner}
            title={review.isOwner ? 'Você não pode curtir a própria review' : undefined}
            className={cn(
              'flex items-center gap-1.5 text-caption transition-colors duration-150 disabled:cursor-default',
              liked ? 'text-accent' : 'text-fg-muted hover:text-fg',
              review.isOwner ? 'opacity-60' : ''
            )}
          >
            <Heart className={cn('size-4', liked ? 'fill-current' : '')} aria-hidden />
            {likes}
          </button>
        )}

        {review.isOwner && (
          <Link href={mediaHref} className="text-caption text-fg-muted hover:text-fg">
            editar
          </Link>
        )}
      </div>
    </article>
  );
}

interface Props {
  source: string;
  mediaType: string;
  externalId: number;
  initial: { items: Review[]; nextCursor: string | null; total: number };
  editHref: string | null;
}

export function ReviewList({ source, mediaType, externalId, initial, editHref }: Props) {
  const [sort, setSort] = useState<'likes' | 'recent'>('likes');
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [busy, setBusy] = useState(false);

  const base = `/media/${source}/${mediaType}/${externalId}/reviews`;

  async function changeSort(next: 'likes' | 'recent') {
    if (next === sort) return;
    setSort(next);
    setBusy(true);

    try {
      const page = await apiFetch(`${base}?sort=${next}`, { schema: reviewListSchema });
      setItems(page.items);
      setCursor(page.nextCursor);
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);

    try {
      const page = await apiFetch(`${base}?sort=${sort}&cursor=${encodeURIComponent(cursor)}`, {
        schema: reviewListSchema
      });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-serif text-h2">Reviews</h2>
          <span className="font-data text-caption text-fg-muted">{initial.total}</span>
        </div>

        <div className="flex gap-3 text-caption">
          {(
            [
              { value: 'likes', label: 'Curtidas' },
              { value: 'recent', label: 'Recentes' }
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => void changeSort(option.value)}
              className={
                sort === option.value
                  ? 'border-b border-accent pb-0.5 text-fg'
                  : 'text-fg-muted hover:text-fg'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {editHref && (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href={editHref}>
            {items.some((review) => review.isOwner) ? 'Editar minha review' : 'Escrever uma review'}
          </Link>
        </Button>
      )}

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-small text-fg-muted">Ninguém escreveu sobre esta obra ainda.</p>
        ) : (
          items.map((review) => (
            <ReviewCard key={review.id} review={review} mediaHref={editHref ?? '#'} />
          ))
        )}
      </div>

      {cursor && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => void loadMore()} disabled={busy}>
            {busy ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </section>
  );
}