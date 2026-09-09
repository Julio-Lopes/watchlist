'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api-client';
import { EyeOff } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Entry } from '@watchlist/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const LIMIT = 5000;

const STATUS_LABEL: Record<string, string> = {
  watching: 'assistindo',
  completed: 'concluído',
  paused: 'pausado',
  dropped: 'largado',
  planning: 'planejo assistir'
};

interface Props {
  entry: Entry;
  existing: { id: string; content: string; containsSpoilers: boolean } | null;
}

export function ReviewEditor({ entry, existing }: Props) {
  const router = useRouter();

  const [content, setContent] = useState(existing?.content ?? '');
  const [spoilers, setSpoilers] = useState(existing?.containsSpoilers ?? false);
  const [rating, setRating] = useState(entry.userRating ? entry.userRating / 10 : 0);
  const [busy, setBusy] = useState(false);

  const mediaHref = `/media/${entry.media.source}/${entry.media.mediaType}/${entry.media.externalId}`;

  async function publish() {
    setBusy(true);

    try {
      /** A nota vai junto porque e comum ajustar enquanto escreve: voce comeca
       *  a justificar o 9 e percebe que era 8. Duas chamadas, nao uma
       *  transacao: se a nota falhar, a review ainda vale. */
      if (rating > 0 && Math.round(rating * 10) !== entry.userRating) {
        await apiFetch(`/entries/${entry.id}`, {
          method: 'PATCH',
          body: { userRating: Math.round(rating * 10) }
        });
      }

      await apiFetch(`/entries/${entry.id}/review`, {
        method: 'POST',
        body: { content, containsSpoilers: spoilers }
      });

      toast.success(existing ? 'Review atualizada.' : 'Review publicada.');
      router.push(mediaHref);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível publicar.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);

    try {
      await apiFetch(`/reviews/${existing.id}`, { method: 'DELETE' });
      toast.success('Review apagada.');
      router.push(mediaHref);
      router.refresh();
    } catch {
      toast.error('Não foi possível apagar.');
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[150px_minmax(0,1fr)]">
      <div>
        <Link href={mediaHref}>
          <div className="aspect-2/3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
            {entry.media.coverImage && (
              <img src={entry.media.coverImage} alt="" className="size-full object-cover" />
            )}
          </div>
        </Link>

        <p className="mt-2.5 text-small">{entry.media.title}</p>
        <p className="font-data mt-1 text-caption text-fg-muted">
          {STATUS_LABEL[entry.status]}
          {entry.media.totalEpisodes ? ` · ${entry.media.totalEpisodes} eps` : ''}
        </p>

        {/** A nota fica ao lado do texto, editavel: e o motivo de a escrita
         *   nao viver dentro do EntryDialog. */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-caption text-fg-muted">Sua nota</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-data text-h2">
              {rating > 0 ? rating.toFixed(1).replace('.', ',') : '—'}
            </span>
            <span className="text-caption text-fg-muted">/ 10</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            aria-label="Nota"
            className="mt-2 w-full accent-accent"
          />
        </div>
      </div>

      <div>
        <h1 className="font-serif text-h2">{existing ? 'Editar review' : 'Sua review'}</h1>

        <Textarea
          value={content}
          maxLength={LIMIT}
          rows={10}
          autoFocus
          onChange={(event) => setContent(event.target.value)}
          placeholder="O que ficou com você depois que acabou?"
          className="mt-4 leading-relaxed"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSpoilers(!spoilers)}
            className={cn(
              'flex items-center gap-2 text-small transition-colors duration-150',
              spoilers ? 'text-warning' : 'text-fg-muted hover:text-fg'
            )}
          >
            <span
              className={cn(
                'relative h-4.5 w-8 rounded-full transition-colors duration-150',
                spoilers ? 'bg-warning' : 'bg-border'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-3.5 rounded-full bg-fg transition-[left] duration-150',
                  spoilers ? 'left-[17px]' : 'left-0.5'
                )}
              />
            </span>
            <EyeOff className="size-4" aria-hidden />
            Contém spoiler
          </button>

          <span className="font-data text-caption text-fg-muted">
            {content.length} / {LIMIT}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => void publish()} disabled={busy || content.trim().length < 10}>
            {busy ? 'Publicando...' : existing ? 'Salvar' : 'Publicar'}
          </Button>

          <Button asChild variant="outline">
            <Link href={mediaHref}>Cancelar</Link>
          </Button>

          {existing && (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="ml-auto text-small text-fg-muted transition-colors duration-150 hover:text-danger"
            >
              Apagar review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}