'use client';

import { cn } from '@/lib/utils';
import type { EntryCounts, EntryTag } from '@watchlist/shared';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STATUSES = [
  { value: 'watching', label: 'Assistindo' },
  { value: 'completed', label: 'Concluído' },
  { value: 'planning', label: 'Planejo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'dropped', label: 'Largado' }
] as const;

const TYPES = [
  { value: 'anime', label: 'Anime' },
  { value: 'show', label: 'Séries' },
  { value: 'movie', label: 'Filmes' }
] as const;

interface Props {
  counts: EntryCounts | null;
  tags: EntryTag[];
}

export function LibrarySidebar({ counts, tags }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(params);
    /** Clicar no filtro ativo desliga: sem isso nao ha como voltar para tudo. */
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    next.delete('cursor');
    router.push(`${pathname}?${next.toString()}`);
  }

  const row = (key: string, value: string, label: string, total?: number) => {
    const active = params.get(key) === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => toggle(key, value)}
        className={cn(
          'flex w-full items-baseline justify-between py-1 text-small transition-colors duration-150',
          active ? 'text-fg' : 'text-fg-muted hover:text-fg'
        )}
      >
        {label}
        <span className="font-data text-caption">{total ?? 0}</span>
      </button>
    );
  };

  return (
    <aside className="space-y-6">
      <div>
        <p className="text-caption tracking-wide text-fg-muted uppercase">Status</p>
        <div className="mt-2">
          {STATUSES.map((item) =>
            row('status', item.value, item.label, counts?.byStatus[item.value])
          )}
        </div>
      </div>

      <div>
        <p className="text-caption tracking-wide text-fg-muted uppercase">Tipo</p>
        <div className="mt-2">
          {TYPES.map((item) => row('type', item.value, item.label, counts?.byType[item.value]))}
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <p className="text-caption tracking-wide text-fg-muted uppercase">Tags</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const active = params.get('tagId') === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle('tagId', tag.id)}
                  className={cn(
                    'rounded-[var(--radius-control)] border px-2 py-0.5 text-caption transition-colors duration-150',
                    active ? 'border-accent text-fg' : 'border-border text-fg-muted hover:text-fg'
                  )}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}