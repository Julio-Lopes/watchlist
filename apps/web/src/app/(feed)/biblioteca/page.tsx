import { ContinueRow } from '@/components/continue-row';
import { LibraryGrid } from '@/components/library-grid';
import { LibrarySidebar } from '@/components/library-sidebar';
import { serverFetch } from '@/lib/api-server';
import { entryCountsSchema, entryListSchema, entrySchema, tagSchema } from '@watchlist/shared';
import Link from 'next/link';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const STATUS_TITLE: Record<string, string> = {
  watching: 'Assistindo',
  completed: 'Concluído',
  planning: 'Planejo assistir',
  paused: 'Pausado',
  dropped: 'Largado'
};

const TYPE_TITLE: Record<string, string> = {
  anime: 'Anime',
  show: 'Séries',
  movie: 'Filmes'
};

const SORTS = [
  { value: 'recent', label: 'Recentes' },
  { value: 'title', label: 'Título' },
  { value: 'rating', label: 'Nota' }
];

const continueSchema = z.object({ items: z.array(entrySchema) });

export default async function BibliotecaPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resolved = await searchParams;
  const query = new URLSearchParams();

  for (const key of ['status', 'type', 'tagId', 'sort'] as const) {
    const value = resolved[key];
    if (value) query.set(key, value);
  }

  /** Quatro chamadas em paralelo: sequencial somaria quatro esperas quando o
   *  Railway estiver acordando. */
  const [page, counts, resume, tags] = await Promise.all([
    serverFetch(`/entries?${query.toString()}`, entryListSchema),
    serverFetch('/entries/counts', entryCountsSchema),
    serverFetch('/entries/continue?limit=3', continueSchema),
    serverFetch('/tags', z.array(tagSchema))
  ]);

  const activeSort = resolved.sort ?? 'recent';

  const title = resolved.status
    ? (STATUS_TITLE[resolved.status] ?? 'Tudo')
    : resolved.type
      ? (TYPE_TITLE[resolved.type] ?? 'Tudo')
      : 'Tudo';

  const sortHref = (value: string) => {
    const next = new URLSearchParams(query);
    next.set('sort', value);
    return `/biblioteca?${next.toString()}`;
  };

  return (
    <div>
      <ContinueRow items={resume?.items ?? []} />

      <div className="mt-[clamp(34px,5vh,52px)] flex flex-wrap items-start gap-[clamp(28px,4vw,56px)]">
        <LibrarySidebar counts={counts} tags={tags ?? []} />

        <section className="min-w-0 flex-[1_1_min(100%,520px)]">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3 border-b border-hairline pb-4">
            <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
              {title}
            </h1>
            <span className="font-mincho text-sm text-sumi-faint">
              {page?.items.length ?? 0} de {counts?.total ?? 0}
            </span>

            {/** Ordenacao como texto, nao select: tres opcoes nao justificam
             *   esconder atras de um clique. */}
            <div className="ml-auto flex gap-[18px] text-[12.5px] tracking-[0.04em]">
              {SORTS.map((option) => (
                <Link
                  key={option.value}
                  href={sortHref(option.value)}
                  className={
                    activeSort === option.value
                      ? 'border-b border-torii pb-[3px] text-sumi'
                      : 'border-b border-transparent pb-[3px] text-sumi-faint transition-colors duration-400 hover:text-sumi'
                  }
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          <LibraryGrid
            key={`${query.toString()}-${page?.items[0]?.updatedAt ?? ''}`}
            initialItems={page?.items ?? []}
            initialCursor={page?.nextCursor ?? null}
            query={query.toString()}
          />
        </section>
      </div>
    </div>
  );
}
