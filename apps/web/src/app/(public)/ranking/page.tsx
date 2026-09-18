import { AppShell } from '@/components/app-shell';
import { PublicHeader } from '@/components/public-header';
import { RankingCard, RankingList } from '@/components/ranking-board';
import { getViewer, serverFetch } from '@/lib/api-server';
import { activityStatsSchema, rankingsResponseSchema } from '@watchlist/shared';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ranking · Watchlist',
  description: 'As obras mais bem avaliadas, mais assistidas e mais largadas por quem usa o Watchlist.'
};

const KIND_TITLE: Record<string, string> = {
  rating: 'Mais bem avaliadas',
  watched: 'Mais assistidas',
  dropped: 'Mais largadas',
  trending: 'Em alta'
};

const TYPES = [
  { value: '', label: 'Tudo' },
  { value: 'anime', label: 'Anime' },
  { value: 'show', label: 'Séries' },
  { value: 'movie', label: 'Filmes' }
];

export default async function RankingPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string; kind?: string }>;
}) {
  const { type, kind } = await searchParams;

  const query = new URLSearchParams();
  if (type) query.set('type', type);
  if (kind) {
    query.set('kind', kind);
    /** Lista completa mostra trinta; o painel mostra tres por criterio. */
    query.set('limit', '30');
  }

  const [data, viewer] = await Promise.all([
    serverFetch(`/rankings?${query.toString()}`, rankingsResponseSchema),
    getViewer()
  ]);

  const typeLink = (value: string) => {
    const next = new URLSearchParams();
    if (value) next.set('type', value);
    if (kind) next.set('kind', kind);
    const suffix = next.toString();
    return suffix ? `/ranking?${suffix}` : '/ranking';
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-h2">{kind ? KIND_TITLE[kind] : 'Ranking'}</h1>
          {kind && (
            <Link href={typeLink(type ?? '')} className="text-caption text-fg-muted hover:text-fg">
              voltar
            </Link>
          )}
        </div>

        <div className="flex gap-3 text-caption">
          {TYPES.map((option) => (
            <Link
              key={option.value || 'all'}
              href={typeLink(option.value)}
              className={
                (type ?? '') === option.value
                  ? 'border-b border-accent pb-0.5 text-fg'
                  : 'text-fg-muted hover:text-fg'
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <p className="text-body">Não foi possível carregar o ranking</p>
        </div>
      ) : kind ? (
        <>
          {data.boards[0] && <RankingList board={data.boards[0]} />}
          {/** Dito uma vez, embaixo: repetir em cada linha seria ruido, mas
           *   omitir esconderia que a amostra e pequena. */}
          <p className="text-caption text-fg-muted">
            Médias consideram apenas obras com ao menos {data.minSample} avaliações.
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {data.boards.map((board) => (
              <RankingCard key={board.kind} board={board} type={type} />
            ))}
          </div>

          <p className="text-caption text-fg-muted">
            Os números vêm de quem usa o Watchlist, não das fontes externas. Médias consideram
            apenas obras com ao menos {data.minSample} avaliações, de perfis públicos.
          </p>
        </>
      )}
    </div>
  );

  if (viewer) {
    const stats = await serverFetch('/stats/activity', activityStatsSchema);
    return (
      <AppShell viewer={viewer} streak={stats?.currentStreak ?? null}>
        {content}
      </AppShell>
    );
  }

  return (
    <>
      <PublicHeader signedIn={false} />
      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 lg:px-8">{content}</main>
    </>
  );
}