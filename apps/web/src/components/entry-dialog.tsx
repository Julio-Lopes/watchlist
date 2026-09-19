'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { Entry, MediaDetail } from '@watchlist/shared';
import { X } from 'lucide-react';
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

const label = 'block text-[11px] tracking-[0.2em] text-sumi-faint uppercase';
const field =
  'w-full border-0 border-b border-[#d9d4cd] bg-transparent py-2.5 text-[15.5px] font-light text-sumi transition-colors duration-400 outline-none placeholder:text-[#a8a29b] focus:border-torii disabled:opacity-50';

/** O segmentado é a única coisa preenchida em sumi: é o estado, não uma ação. */
const chip = (active: boolean) =>
  cn(
    'cursor-pointer border px-[15px] py-[7px] text-xs tracking-[0.06em] transition-colors duration-400',
    active
      ? 'border-sumi bg-sumi text-washi'
      : 'border-[#d9d4cd] bg-transparent text-sumi-soft hover:border-sumi'
  );

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
        <button
          type="button"
          className="w-full cursor-pointer border border-sumi bg-sumi px-5 py-3.5 text-xs tracking-[0.12em] text-washi uppercase transition-colors duration-400 hover:border-torii hover:bg-torii"
        >
          {entry ? 'Editar' : 'Adicionar'}
        </button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-none border-hairline bg-washi p-[clamp(24px,3vw,34px)] font-jp text-sumi shadow-none sm:max-w-[520px]"
      >
        <DialogHeader className="flex-row items-baseline gap-4 border-b border-hairline pb-[18px] text-left">
          <DialogTitle className="font-mincho text-[22px] leading-[1.3] font-normal tracking-[-0.01em]">
            {media.title}
          </DialogTitle>
          <DialogClose
            aria-label="Fechar"
            className="ml-auto flex shrink-0 cursor-pointer border-0 bg-transparent p-1 text-sumi-soft transition-colors duration-400 hover:text-sumi"
          >
            <X className="size-4" strokeWidth={1.2} aria-hidden />
          </DialogClose>
        </DialogHeader>

        <div className="mt-6 flex flex-col gap-[26px]">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectStatus(option.value)}
                className={chip(status === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/** Modelo de contagem, como AniList e MAL: voce informa em que
           *   episodio esta, nao marca cada um. Filme nao tem progresso. */}
          {status !== 'planning' && media.mediaType !== 'movie' && (
            <div>
              <label htmlFor="watched" className={label}>
                Episódios assistidos
              </label>
              <div className="mt-2.5 flex items-baseline gap-3">
                <input
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
                  className={cn(field, 'w-24')}
                />
                <span className="font-mincho text-sm text-sumi-faint">de {total ?? '?'}</span>
              </div>
              {status === 'completed' && (
                <p className="mt-2.5 text-xs leading-[1.75] font-light text-sumi-faint">
                  Concluído fica no total. Mude para assistindo para editar.
                </p>
              )}
            </div>
          )}

          {entry && (
            <div>
              <div className="flex items-baseline justify-between">
                <span className={label}>Nota</span>
                <span className="font-mincho text-base text-sumi">
                  {rating > 0 ? rating.toFixed(1).replace('.', ',') : 'sem nota'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                aria-label="Nota"
                className="mt-3 w-full accent-torii"
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
                  className={chip(reason === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {entry && (
            <label className="block">
              <span className={label}>Notas privadas</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className={cn(field, 'mt-2.5 resize-y leading-[1.7]')}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="cursor-pointer border border-sumi bg-sumi px-6 py-[15px] text-[12.5px] tracking-[0.12em] text-washi uppercase transition-colors duration-400 hover:border-torii hover:bg-torii disabled:cursor-default disabled:opacity-50 disabled:hover:border-sumi disabled:hover:bg-sumi"
          >
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
