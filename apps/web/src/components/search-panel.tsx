'use client';

import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { searchResponseSchema, type MediaSummary } from '@watchlist/shared';
import { useEffect, useState } from 'react';
import { RecentSearches, pushRecent } from '@/components/recent-searches';
import { SearchResults } from '@/components/search-results';

export function useMediaSearch(term: string) {
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [degraded, setDegraded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }

    /** 300 ms: sem isso, cada tecla dispara uma chamada e queima o rate limit. */
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const page = await apiFetch(`/media/search?q=${encodeURIComponent(term)}`, {
          schema: searchResponseSchema,
          signal: controller.signal
        });
        setResults(page.results);
        setDegraded(page.degraded);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  return { results, degraded, busy };
}

export function SearchPanel({ initialTerm }: { initialTerm: string }) {
  const [term, setTerm] = useState(initialTerm);
  const { results, degraded, busy } = useMediaSearch(term);

  useEffect(() => {
    if (results.length > 0) pushRecent(term);
  }, [results.length, term]);

  return (
    <div className="space-y-8">
      <Input
        autoFocus
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Busque por anime, série ou filme"
        className="h-11"
      />

      {degraded.length > 0 && (
        <p className="text-small text-warning">
          Uma das fontes não respondeu. Os resultados podem estar incompletos.
        </p>
      )}

      {term.trim().length < 2 ? (
        <RecentSearches onPick={setTerm} />
      ) : busy && results.length === 0 ? (
        <p className="text-small text-fg-muted">Buscando...</p>
      ) : (
        <>
          <p className="font-data text-caption text-fg-muted">{results.length} resultados</p>
          <SearchResults results={results} />
        </>
      )}
    </div>
  );
}