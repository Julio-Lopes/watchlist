'use client';

import { useEffect, useState } from 'react';

const KEY = 'wl:recent-searches';
const MAX = 6;

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(term: string): void {
  const clean = term.trim().toLowerCase();
  if (clean.length < 2) return;

  try {
    const next = [clean, ...readRecent().filter((item) => item !== clean)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /** Navegador com storage bloqueado: a busca funciona sem historico. */
  }
}

export function RecentSearches({ onPick }: { onPick: (term: string) => void }) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => setItems(readRecent()), []);

  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-caption tracking-wide text-fg-muted uppercase">Buscas recentes</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onPick(term)}
            className="rounded-[var(--radius-control)] border border-border px-3 py-1 text-small text-fg-muted transition-colors duration-150 hover:text-fg"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}