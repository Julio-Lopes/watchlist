'use client';

import type { Entry } from '@watchlist/shared';
import { MediaCard } from '@/components/media-card';
import { apiFetch } from '@/lib/api-client';
import { entryListSchema } from '@watchlist/shared';
import { useState } from 'react';

interface Props {
  initialItems: Entry[];
  initialCursor: string | null;
  query: string;
}

export function LibraryGrid({ initialItems, initialCursor, query }: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [busy, setBusy] = useState(false);

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);

    try {
      const page = await apiFetch(`/entries?${query}&cursor=${encodeURIComponent(cursor)}`, {
        schema: entryListSchema
      });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-[clamp(22px,3vh,32px)] border-b border-hairline pt-[clamp(30px,5vh,44px)] pb-[clamp(30px,5vh,44px)]">
        <p className="kicker">&nbsp;·&nbsp; ainda vazio</p>
        <p className="mt-[18px] font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">
          Sua biblioteca está vazia
        </p>
        <p className="mt-3 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
          Use a busca para adicionar a primeira obra.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mt-[clamp(22px,3vh,32px)] grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-x-[clamp(14px,1.8vw,22px)] gap-y-[clamp(18px,2.4vw,30px)]">
        {items.map((entry) => (
          <MediaCard key={entry.id} entry={entry} />
        ))}
      </div>

      {cursor && (
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
