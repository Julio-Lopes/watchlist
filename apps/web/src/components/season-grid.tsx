'use client';

import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { seasonResponseSchema, type SeasonEntry } from '@watchlist/shared';
import Link from 'next/link';
import { useState } from 'react';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

interface Props {
  initialItems: SeasonEntry[];
  initialHasMore: boolean;
  year: number;
  season: string;
  scope: 'all' | 'mine';
}

export function SeasonGrid({ initialItems, initialHasMore, year, season, scope }: Props) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  async function loadMore() {
    setBusy(true);

    try {
      const next = page + 1;
      const result = await apiFetch(
        `/calendar/season?year=${year}&season=${season}&scope=${scope}&page=${next}`,
        { schema: seasonResponseSchema }
      );

      setItems((current) => [...current, ...result.items]);
      setHasMore(result.hasMore);
      setPage(next);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <p className="text-body">Nada nesta temporada</p>
        <p className="mt-1 text-small text-fg-muted">
          Talvez os dados ainda não tenham sido publicados, ou você não adicionou nada dela.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <Link
            key={item.externalId}
            href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
            className="group"
          >
            <div className="relative aspect-2/3 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-colors duration-150 group-hover:border-fg-muted">
              {item.coverImage && (
                <img
                  src={item.coverImage}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}

              {item.avgScore !== null && (
                <span className="font-data absolute right-1.5 top-1.5 rounded-[var(--radius-control)] bg-bg/85 px-1.5 py-0.5 text-caption">
                  {(item.avgScore / 10).toFixed(1).replace('.', ',')}
                </span>
              )}

              {/** Marca o que voce ja pegou: a temporada serve tanto para
               *   acompanhar quanto para descobrir o que faltou. */}
              {item.inLibrary && (
                <span className="absolute bottom-1.5 left-1.5 rounded-[var(--radius-control)] bg-success px-1.5 py-0.5 text-caption text-bg">
                  na lista
                </span>
              )}
            </div>

            <p className="mt-1.5 truncate text-caption">{item.title}</p>
            <p className="font-data text-caption text-fg-muted">
              {item.airingWeekday !== null
                ? WEEKDAYS[item.airingWeekday]
                : item.startDate
                  ? new Date(item.startDate).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'short'
                    })
                  : 'sem data'}
              {item.totalEpisodes ? ` · ${item.totalEpisodes} eps` : ''}
            </p>
          </Link>
        ))}
      </div>

      {hasMore && scope === 'all' && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void loadMore()} disabled={busy}>
            {busy ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
}