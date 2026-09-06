'use client';

import type { MediaSummary } from '@watchlist/shared';
import Link from 'next/link';

const TYPE_LABEL: Record<string, string> = { anime: 'Anime', show: 'Série', movie: 'Filme' };

export function SearchResults({ results }: { results: MediaSummary[] }) {
  return (
    <div className="space-y-1">
      {results.map((item) => (
        <Link
          key={`${item.source}-${item.mediaType}-${item.externalId}`}
          href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
          className="flex gap-4 rounded-[var(--radius-card)] p-3 transition-colors duration-150 hover:bg-surface"
        >
          <div className="h-[72px] w-12 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover">
            {item.coverImage && (
              <img src={item.coverImage} alt="" loading="lazy" className="size-full object-cover" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-body">{item.title}</p>
            {/** Ano e contagem de episodios sao o que distingue uma sequencia
             *   da original quando as capas sao parecidas. */}
            <p className="mt-1 text-small text-fg-muted">
              {TYPE_LABEL[item.mediaType]}
              {item.year ? ` · ${item.year}` : ''}
              {item.totalEpisodes ? ` · ${item.totalEpisodes} eps` : ''}
            </p>
          </div>

          {item.avgScore !== null && (
            <span className="font-data self-center text-h3">{(item.avgScore / 10).toFixed(1)}</span>
          )}
        </Link>
      ))}
    </div>
  );
}