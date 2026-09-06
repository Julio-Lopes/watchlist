'use client';

import type { Entry } from '@watchlist/shared';
import { Button } from '@/components/ui/button';
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
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <p className="text-body">Sua biblioteca está vazia</p>
        <p className="mt-1 text-small text-fg-muted">
          Use ⌘K ou a busca para adicionar a primeira obra.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((entry) => (
          <MediaCard key={entry.id} entry={entry} />
        ))}
      </div>

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void loadMore()} disabled={busy}>
            {busy ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
}