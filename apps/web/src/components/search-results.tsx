'use client';

import type { MediaSummary } from '@watchlist/shared';
import Link from 'next/link';

const TYPE_LABEL: Record<string, string> = { anime: 'Anime', show: 'Série', movie: 'Filme' };

export function SearchResults({ results }: { results: MediaSummary[] }) {
  return (
    <div className="border-t border-hairline">
      {results.map((item) => (
        <Link
          key={`${item.source}-${item.mediaType}-${item.externalId}`}
          href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
          className="flex items-center gap-[clamp(14px,2vw,22px)] border-b border-hairline px-1.5 py-3.5 transition-colors duration-400 hover:bg-washi-2"
        >
          <span className="block h-[72px] w-12 shrink-0 overflow-hidden bg-[#eae6e0]">
            {item.coverImage && (
              <img src={item.coverImage} alt="" loading="lazy" className="size-full object-cover" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-sumi">{item.title}</span>
            {/** Ano e contagem de episodios sao o que distingue uma sequencia
             *   da original quando as capas sao parecidas. */}
            <span className="mt-[5px] block text-xs tracking-[0.04em] text-sumi-faint">
              {TYPE_LABEL[item.mediaType]}
              {item.year ? ` · ${item.year}` : ''}
              {item.totalEpisodes ? ` · ${item.totalEpisodes} eps` : ''}
            </span>
          </span>

          {item.avgScore !== null && (
            <span className="shrink-0 font-mincho text-base text-sumi">
              {(item.avgScore / 10).toFixed(1).replace('.', ',')}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
