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

const heading =
  'border-b border-hairline pb-3 text-[11px] tracking-[0.2em] text-sumi-faint uppercase';

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
          'flex w-full cursor-pointer items-baseline gap-2.5 border-0 bg-transparent py-[7px] text-left text-[13.5px] transition-all duration-400',
          active
            ? 'pl-2.5 text-sumi shadow-[inset_3px_0_0_-1px_var(--color-torii)]'
            : 'text-sumi-soft hover:text-sumi'
        )}
      >
        {label}
        <span className="ml-auto font-mincho text-[13px] text-sumi-faint">{total ?? 0}</span>
      </button>
    );
  };

  return (
    <aside className="sticky top-[126px] min-w-[140px] flex-[0_1_150px]">
      <p className={heading}>Status</p>
      <div className="pt-1.5">
        {STATUSES.map((item) => row('status', item.value, item.label, counts?.byStatus[item.value]))}
      </div>

      <p className={cn(heading, 'mt-[clamp(26px,4vh,36px)]')}>Tipo</p>
      <div className="pt-1.5">
        {TYPES.map((item) => row('type', item.value, item.label, counts?.byType[item.value]))}
      </div>

      {tags.length > 0 && (
        <>
          <p className={cn(heading, 'mt-[clamp(26px,4vh,36px)]')}>Tags</p>
          <div className="flex flex-wrap gap-2 pt-3.5">
            {tags.map((tag) => {
              const active = params.get('tagId') === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle('tagId', tag.id)}
                  className={cn(
                    'cursor-pointer border bg-transparent px-[11px] py-[5px] text-[11.5px] tracking-[0.04em] transition-colors duration-400',
                    active
                      ? 'border-torii text-sumi'
                      : 'border-[#d9d4cd] text-sumi-soft hover:border-sumi'
                  )}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
