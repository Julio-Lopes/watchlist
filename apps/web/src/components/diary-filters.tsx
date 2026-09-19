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
    <div className="ml-auto flex gap-[18px] text-[12.5px] tracking-[0.04em]">
      {TYPES.map((option) => (
        <Link
          key={option.value || 'all'}
          href={option.value ? `/diario?type=${option.value}` : '/diario'}
          className={cn(
            'border-b pb-[3px]',
            active === option.value
              ? 'border-torii text-sumi'
              : 'border-transparent text-sumi-faint transition-colors duration-400 hover:text-sumi'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
