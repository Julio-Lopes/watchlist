'use client';

import { apiFetch } from '@/lib/api-client';
import { EyeOff, Heart } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { reviewListSchema, type Review } from '@watchlist/shared';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { SpoilerText } from './spoiler-text';

const likeSchema = z.object({ likesCount: z.number() });

const relative = (iso: string): string => {
  const days = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days < 1) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.round(days / 7)} semanas`;
  return `há ${Math.round(days / 30)} meses`;
};

const outlineButton =
  'cursor-pointer border border-[#d9d4cd] bg-transparent px-6 py-3 text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-sumi';

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
    <article className="border-t border-hairline px-1.5 py-[clamp(18px,2.4vh,24px)] transition-colors duration-400 last:border-b hover:bg-washi-2">
      <header className="flex items-center gap-2.5">
        <Link href={`/u/${review.author.username}`} className="flex min-w-0 items-center gap-2.5">
          {review.author.avatarUrl ? (
            <img
              src={review.author.avatarUrl}
              alt=""
              className="size-[26px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[#d9d4cd] font-mincho text-[11px] text-sumi-faint">
              {review.author.username[0]?.toUpperCase()}
            </span>
          )}
          <span className="text-[13.5px] text-sumi">{review.author.username}</span>
        </Link>

        {review.rating !== null && (
          <span className="shrink-0 font-mincho text-[15px] text-sumi">
            {(review.rating / 10).toFixed(1).replace('.', ',')}
          </span>
        )}

        <span className="ml-auto shrink-0 text-[11.5px] tracking-[0.08em] text-sumi-faint">
          {relative(review.createdAt)}
        </span>
      </header>

      {review.containsSpoilers && !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-3.5 flex w-full cursor-pointer items-center gap-2.5 border-0 border-l border-[#d9d4cd] bg-washi-2 px-4 py-3 text-left text-xs tracking-[0.12em] text-sumi-faint uppercase transition-colors duration-400 hover:text-sumi"
        >
          <EyeOff className="size-[15px] shrink-0" strokeWidth={1.2} aria-hidden />
          Contém spoiler. Toque para ler.
        </button>
      ) : (
        <SpoilerText
          reviewId={review.id}
          content={review.content}
          hidden={review.hidden}
          tone="washi"
          className="mt-3.5 max-w-[44em] border-l border-hairline pl-4 font-mincho text-[15.5px] leading-[1.8] whitespace-pre-line text-sumi-soft"
        />
      )}

      <div className="mt-3.5 flex items-center gap-[18px]">
        {review.likedByViewer === null ? (
          <span className="flex items-center gap-[7px] text-xs tracking-[0.06em] text-sumi-faint">
            <Heart className="size-[15px]" strokeWidth={1.2} aria-hidden />
            {likes}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void toggleLike()}
            disabled={busy || review.isOwner}
            title={review.isOwner ? 'Você não pode curtir a própria review' : undefined}
            className={cn(
              'flex cursor-pointer items-center gap-[7px] border-0 bg-transparent p-0 text-xs tracking-[0.06em] transition-colors duration-400 disabled:cursor-default',
              liked ? 'text-torii' : 'text-sumi-faint hover:text-sumi',
              review.isOwner ? 'opacity-60' : ''
            )}
          >
            <Heart
              className={cn('size-[15px]', liked ? 'fill-current' : '')}
              strokeWidth={1.2}
              aria-hidden
            />
            {likes}
          </button>
        )}

        {review.isOwner && (
          <Link
            href={mediaHref}
            className="border-b border-[#d9d4cd] pb-px text-xs tracking-[0.06em] text-sumi-soft transition-colors duration-400 hover:border-torii hover:text-torii"
          >
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
    <section className="mt-[clamp(48px,8vh,88px)] border-t border-hairline pt-[clamp(26px,4vh,38px)]">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3">
        <h2 className="font-mincho text-[clamp(20px,2.4vw,28px)] font-normal tracking-[-0.01em] text-sumi">
          Reviews
        </h2>
        <span className="font-mincho text-sm text-sumi-faint">{initial.total}</span>

        <div className="ml-auto flex gap-[18px] text-[12.5px] tracking-[0.04em]">
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
              className={cn(
                'cursor-pointer border-0 border-b bg-transparent pb-[3px] transition-colors duration-400',
                sort === option.value
                  ? 'border-torii text-sumi'
                  : 'border-transparent text-sumi-faint hover:text-sumi'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {editHref && (
        <div className="mt-[clamp(20px,3vh,28px)]">
          <Link href={editHref} className={cn(outlineButton, 'inline-block')}>
            {items.some((review) => review.isOwner) ? 'Editar minha review' : 'Escrever uma review'}
          </Link>
        </div>
      )}

      <div className="mt-[clamp(24px,3vh,34px)]">
        {items.length === 0 ? (
          <p className="text-[14.5px] font-light text-sumi-soft">
            Ninguém escreveu sobre esta obra ainda.
          </p>
        ) : (
          items.map((review) => (
            <ReviewCard key={review.id} review={review} mediaHref={editHref ?? '#'} />
          ))
        )}
      </div>

      {cursor && (
        <div className="mt-[clamp(26px,4vh,36px)]">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={busy}
            className={outlineButton}
          >
            {busy ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </section>
  );
}
