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
      <p className="text-[11px] tracking-[0.2em] text-sumi-faint uppercase">Buscas recentes</p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {items.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onPick(term)}
            className="cursor-pointer border border-[#d9d4cd] bg-transparent px-[15px] py-[7px] text-xs tracking-[0.06em] text-sumi-soft transition-colors duration-400 hover:border-sumi hover:text-sumi"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}