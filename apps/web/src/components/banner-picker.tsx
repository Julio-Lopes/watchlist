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
}

export function BannerPicker({ current, onChoose, onRemove, pending, label = 'Banner' }: Props) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<MediaSummary[]>([]);

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
      <p className="text-small text-fg-muted">{label}</p>

      {current && (
        <div className="mt-2 flex items-center gap-3">
          <img
            src={current.image}
            alt=""
            className="h-8 w-28 rounded-[var(--radius-control)] object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">
            {current.title}
          </span>
          <button
            type="button"
            onClick={() => void onRemove()}
            className="text-caption text-fg-muted transition-colors duration-150 hover:text-danger"
          >
            Remover
          </button>
        </div>
      )}

      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Busque uma obra para usar como banner"
        className="mt-2"
      />

      {results.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
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
                  'aspect-2/3 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover transition-opacity duration-150',
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
      <p className="mt-2 text-caption text-fg-muted">
        Nem toda obra tem banner. Se a escolhida não tiver, avisamos e você tenta outra.
      </p>
    </div>
  );
}