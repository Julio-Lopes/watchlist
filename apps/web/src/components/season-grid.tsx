'use client';

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
      <div className="mt-[clamp(28px,4vh,42px)] border-t border-hairline pt-[clamp(24px,3vh,34px)]">
        <p className="kicker">&nbsp;·&nbsp; ainda vazio</p>
        <p className="mt-[18px] font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">
          Nada nesta temporada
        </p>
        <p className="mt-3 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
          Talvez os dados ainda não tenham sido publicados, ou você não adicionou nada dela.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[clamp(28px,4vh,42px)] border-t border-hairline pt-[clamp(24px,3vh,34px)]">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-x-[clamp(14px,1.8vw,22px)] gap-y-[clamp(18px,2.4vw,30px)]">
        {items.map((item) => (
          <Link
            key={item.externalId}
            href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
            className="block"
          >
            <span className="block aspect-2/3 overflow-hidden bg-[#eae6e0]">
              {item.coverImage && (
                <img
                  src={item.coverImage}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}
            </span>

            <span className="mt-2.5 flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[13px] leading-[1.45] text-sumi">
                {item.title}
              </span>
              {item.avgScore !== null && (
                <span className="shrink-0 font-mincho text-[13px] text-sumi-soft">
                  {(item.avgScore / 10).toFixed(1).replace('.', ',')}
                </span>
              )}
            </span>

            <span className="mt-[5px] flex items-baseline gap-2 text-xs tracking-[0.04em] text-sumi-faint">
              <span className="min-w-0 truncate">
                {item.airingWeekday !== null
                  ? WEEKDAYS[item.airingWeekday]
                  : item.startDate
                    ? new Date(item.startDate).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short'
                      })
                    : 'sem data'}
                {item.totalEpisodes ? ` · ${item.totalEpisodes} eps` : ''}
              </span>
              {/** Marca o que voce ja pegou: a temporada serve tanto para
               *   acompanhar quanto para descobrir o que faltou. */}
              {item.inLibrary && (
                <span className="ml-auto shrink-0 text-[11px] tracking-[0.14em] text-torii uppercase">
                  na lista
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>

      {hasMore && scope === 'all' && (
        <div className="mt-[clamp(34px,5vh,50px)] border-t border-hairline pt-[clamp(26px,4vh,36px)]">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={busy}
            className="cursor-pointer border border-[#d9d4cd] bg-transparent px-6.5 py-3.5 text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-sumi"
          >
            {busy ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  );
}
