'use client';

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
    <div>
      <input
        autoFocus
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Busque por anime, série ou filme"
        aria-label="Buscar"
        className="w-full border-0 border-b border-[#d9d4cd] bg-transparent py-3 font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi transition-colors duration-400 outline-none placeholder:text-[#a8a29b] focus:border-torii"
      />

      {degraded.length > 0 && (
        <p className="mt-5 text-[13px] leading-[1.75] text-torii">
          Uma das fontes não respondeu. Os resultados podem estar incompletos.
        </p>
      )}

      <div className="mt-[clamp(26px,4vh,38px)]">
        {term.trim().length < 2 ? (
          <RecentSearches onPick={setTerm} />
        ) : busy && results.length === 0 ? (
          <p className="text-[14.5px] font-light text-sumi-soft">Buscando…</p>
        ) : (
          <>
            <p className="mb-4 font-mincho text-sm text-sumi-faint">{results.length} resultados</p>
            <SearchResults results={results} />
          </>
        )}
      </div>
    </div>
  );
}
