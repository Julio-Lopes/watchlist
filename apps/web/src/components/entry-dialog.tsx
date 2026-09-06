'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { Entry, MediaDetail } from '@watchlist/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const STATUSES = [
  { value: 'watching', label: 'Assistindo' },
  { value: 'completed', label: 'Concluído' },
  { value: 'planning', label: 'Planejo assistir' },
  { value: 'paused', label: 'Pausado' },
  { value: 'dropped', label: 'Abandonado' }
] as const;

const REASONS = [
  { value: 'pacing', label: 'Ritmo' },
  { value: 'characters', label: 'Personagens' },
  { value: 'art', label: 'Arte' },
  { value: 'plot', label: 'História' },
  { value: 'no_time', label: 'Sem tempo' },
  { value: 'other', label: 'Outro' }
] as const;

export function EntryDialog({ media, entry }: { media: MediaDetail; entry: Entry | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(entry?.status ?? 'watching');
  const [watched, setWatched] = useState(entry?.episodesWatched ?? 0);
  const [rating, setRating] = useState(entry?.userRating ? entry.userRating / 10 : 0);
  const [reason, setReason] = useState<string>(entry?.dropReason ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const total = media.totalEpisodes;

  function selectStatus(value: string) {
    setStatus(value);
    /** Concluir preenche, planejar zera. Deixar o numero antigo ao trocar de
     *  status e o que produziu "concluido com 0 de 220" no primeiro teste. */
    if (value === 'completed' && total) setWatched(total);
    if (value === 'planning') setWatched(0);
  }

  async function save() {
    setBusy(true);

    try {
      if (entry) {
        await apiFetch(`/entries/${entry.id}`, {
          method: 'PATCH',
          body: {
            status,
            episodesWatched: watched,
            userRating: rating > 0 ? Math.round(rating * 10) : null,
            dropReason: status === 'dropped' && reason ? reason : null,
            notes: notes || null
          }
        });
      } else {
        await apiFetch('/entries', {
          method: 'POST',
          body: {
            source: media.source,
            mediaType: media.mediaType,
            externalId: media.externalId,
            status,
            episodesWatched: watched
          }
        });
      }

      setOpen(false);
      router.refresh();
      toast.success(entry ? 'Entrada atualizada.' : 'Adicionado à sua biblioteca.');
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">{entry ? 'Editar' : 'Adicionar'}</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-h3">{media.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectStatus(option.value)}
                className={cn(
                  'rounded-[var(--radius-control)] border px-3 py-1 text-small transition-colors duration-150',
                  status === option.value
                    ? 'border-accent bg-accent'
                    : 'border-border text-fg-muted hover:bg-surface-hover'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/** Modelo de contagem, como AniList e MAL: voce informa em que
           *   episodio esta, nao marca cada um. Filme nao tem progresso. */}
          {status !== 'planning' && media.mediaType !== 'movie' && (
            <div className="space-y-2">
              <label htmlFor="watched" className="text-small text-fg-muted">
                Episódios assistidos
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="watched"
                  type="number"
                  min={0}
                  max={total ?? undefined}
                  value={watched}
                  disabled={status === 'completed'}
                  onChange={(event) => {
                    const raw = Number(event.target.value);
                    const max = total ?? Number.MAX_SAFE_INTEGER;
                    /** Trava nos dois extremos: negativo e valor acima do total
                     *  sao erro de digitacao, nao intencao. */
                    setWatched(Math.min(max, Math.max(0, Number.isNaN(raw) ? 0 : raw)));
                  }}
                  className="w-24"
                />
                <span className="font-data text-small text-fg-muted">de {total ?? '?'}</span>
              </div>
              {status === 'completed' && (
                <p className="text-caption text-fg-muted">
                  Concluído fica no total. Mude para assistindo para editar.
                </p>
              )}
            </div>
          )}

          {entry && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-small">
                <span className="text-fg-muted">Nota</span>
                <span className="font-data">{rating > 0 ? rating.toFixed(1) : 'sem nota'}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                className="w-full accent-accent"
              />
            </div>
          )}

          {status === 'dropped' && (
            <div className="flex flex-wrap gap-2">
              {REASONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option.value)}
                  className={cn(
                    'rounded-[var(--radius-control)] border px-3 py-1 text-caption',
                    reason === option.value ? 'border-accent' : 'border-border text-fg-muted'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {entry && (
            <Textarea
              placeholder="Notas privadas"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          )}

          <Button onClick={() => void save()} disabled={busy} className="w-full">
            {busy ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}