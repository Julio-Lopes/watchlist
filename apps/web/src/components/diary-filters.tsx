'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TYPES = [
  { value: '', label: 'Tudo' },
  { value: 'anime', label: 'Anime' },
  { value: 'show', label: 'Séries' },
  { value: 'movie', label: 'Filmes' }
];

export function DiaryFilters() {
  const params = useSearchParams();
  const active = params.get('type') ?? '';

  return (
    <div className="flex gap-3 text-caption">
      {TYPES.map((option) => (
        <Link
          key={option.value || 'all'}
          href={option.value ? `/diario?type=${option.value}` : '/diario'}
          className={cn(
            active === option.value
              ? 'border-b border-accent pb-0.5 text-fg'
              : 'text-fg-muted hover:text-fg'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}