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
    <div className="space-y-8">
      <ContinueRow items={resume?.items ?? []} />

      <div className="grid gap-8 lg:grid-cols-[150px_minmax(0,1fr)]">
        <LibrarySidebar counts={counts} tags={tags ?? []} />

        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h1 className="font-serif text-h2">{title}</h1>
              <span className="font-data text-caption text-fg-muted">
                {page?.items.length ?? 0} de {counts?.total ?? 0}
              </span>
            </div>

            {/** Ordenacao como texto, nao select: tres opcoes nao justificam
             *   esconder atras de um clique. */}
            <div className="flex gap-3 text-caption">
              {SORTS.map((option) => (
                <Link
                  key={option.value}
                  href={sortHref(option.value)}
                  className={
                    activeSort === option.value
                      ? 'border-b border-accent pb-0.5 text-fg'
                      : 'text-fg-muted hover:text-fg'
                  }
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          <LibraryGrid
            initialItems={page?.items ?? []}
            initialCursor={page?.nextCursor ?? null}
            query={query.toString()}
          />
        </div>
      </div>
    </div>
  );
}