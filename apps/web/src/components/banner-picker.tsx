'use client';

import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { searchResponseSchema, type MediaSummary } from '@watchlist/shared';
import { useEffect, useState } from 'react';

export interface BannerChoice {
  source: MediaSummary['source'];
  mediaType: MediaSummary['mediaType'];
  externalId: number;
}

interface Props {
  /** Banner atual, se houver. Null mostra so a busca. */
  current: { image: string; title: string | null } | null;
  onChoose: (choice: BannerChoice) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  /** Marca o item em carregamento e bloqueia os outros. A escolha pode bater
   *  na fonte externa, entao o clique precisa de estado visivel. */
  pending: string | null;
  label?: string;
  /** `washi` é o tema novo (diálogo de coleção); `dark` segue nas configurações
   *  de perfil, ainda não migradas. */
  tone?: 'dark' | 'washi';
}

export function BannerPicker({
  current,
  onChoose,
  onRemove,
  pending,
  label = 'Banner',
  tone = 'dark'
}: Props) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<MediaSummary[]>([]);
  const washi = tone === 'washi';

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }

    /** 300 ms de debounce: sem isso, cada tecla queima o rate limit da fonte externa. */
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const page = await apiFetch(`/media/search?q=${encodeURIComponent(term)}`, {
          schema: searchResponseSchema,
          signal: controller.signal
        });
        setResults(page.results.slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  return (
    <div>
      <p
        className={
          washi ? 'text-[11px] tracking-[0.2em] text-sumi-faint uppercase' : 'text-small text-fg-muted'
        }
      >
        {label}
      </p>

      {current && (
        <div className="mt-3 flex items-center gap-3.5">
          <img
            src={current.image}
            alt=""
            className={cn('object-cover', washi ? 'h-[42px] w-24' : 'h-8 w-28 rounded-[var(--radius-control)]')}
          />
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              washi ? 'text-xs text-sumi-faint' : 'text-caption text-fg-muted'
            )}
          >
            {current.title}
          </span>
          <button
            type="button"
            onClick={() => void onRemove()}
            className={
              washi
                ? 'cursor-pointer border-0 border-b border-[#d9d4cd] bg-transparent p-0 pb-px text-xs tracking-[0.06em] text-sumi-soft transition-colors duration-400 hover:border-torii hover:text-torii'
                : 'text-caption text-fg-muted transition-colors duration-150 hover:text-danger'
            }
          >
            Remover
          </button>
        </div>
      )}

      {washi ? (
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Busque uma obra para usar como banner"
          className="mt-3 w-full border-0 border-b border-[#d9d4cd] bg-transparent py-2.5 text-[14.5px] font-light text-sumi transition-colors duration-400 outline-none placeholder:text-[#a8a29b] focus:border-torii"
        />
      ) : (
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Busque uma obra para usar como banner"
          className="mt-2"
        />
      )}

      {results.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {results.map((item) => {
            const key = `${item.source}-${item.externalId}`;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  void onChoose({
                    source: item.source,
                    mediaType: item.mediaType,
                    externalId: item.externalId
                  });
                  setTerm('');
                  setResults([]);
                }}
                disabled={pending !== null}
                title={item.title}
                className={cn(
                  'aspect-2/3 overflow-hidden transition-opacity duration-150',
                  washi ? 'cursor-pointer border-0 bg-[#eae6e0] p-0' : 'rounded-[var(--radius-control)] bg-surface-hover',
                  pending === key ? 'animate-pulse' : '',
                  pending !== null && pending !== key ? 'opacity-40' : ''
                )}
              >
                {item.coverImage && (
                  <img src={item.coverImage} alt="" className="size-full object-cover" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/** Sem esse aviso, escolher uma obra sem banner e receber erro pareceria
       *   bug em vez de limitacao da fonte. */}
      <p
        className={
          washi
            ? 'mt-3 text-xs leading-[1.75] font-light text-sumi-faint'
            : 'mt-2 text-caption text-fg-muted'
        }
      >
        Nem toda obra tem banner. Se a escolhida não tiver, avisamos e você tenta outra.
      </p>
    </div>
  );
}
