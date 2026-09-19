import { FeedShell } from '@/components/feed-shell';
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
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3 border-b border-hairline pb-4">
        <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
          {kind ? KIND_TITLE[kind] : 'Ranking'}
        </h1>
        {kind && (
          <Link
            href={typeLink(type ?? '')}
            className="border-b border-[#d9d4cd] pb-0.5 text-[12.5px] tracking-[0.06em] text-sumi-faint transition-colors duration-400 hover:border-torii hover:text-torii"
          >
            voltar
          </Link>
        )}

        <div className="ml-auto flex gap-[18px] text-[12.5px] tracking-[0.04em]">
          {TYPES.map((option) => (
            <Link
              key={option.value || 'all'}
              href={typeLink(option.value)}
              className={
                (type ?? '') === option.value
                  ? 'border-b border-torii pb-[3px] text-sumi'
                  : 'border-b border-transparent pb-[3px] text-sumi-faint transition-colors duration-400 hover:text-sumi'
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="mt-[clamp(26px,4vh,40px)] font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">
          Não foi possível carregar o ranking
        </p>
      ) : kind ? (
        <>
          {data.boards[0] && <RankingList board={data.boards[0]} />}
          {/** Dito uma vez, embaixo: repetir em cada linha seria ruido, mas
           *   omitir esconderia que a amostra e pequena. */}
          <p className="mt-[clamp(28px,4vh,42px)] text-[12.5px] leading-[1.85] font-light text-sumi-soft">
            Médias consideram apenas obras com ao menos {data.minSample} avaliações.
          </p>
        </>
      ) : (
        <>
          <div className="mt-[clamp(30px,5vh,48px)] grid grid-cols-1 gap-px sm:grid-cols-2 border-y border-hairline bg-hairline">
            {data.boards.map((board) => (
              <RankingCard key={board.kind} board={board} type={type} />
            ))}
          </div>

          <p className="mt-[clamp(28px,4vh,42px)] max-w-[60em] text-[12.5px] leading-[1.85] font-light text-sumi-soft">
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
      <FeedShell viewer={viewer} streak={stats?.currentStreak ?? null}>
        {content}
      </FeedShell>
    );
  }

  return (
    <>
      <PublicHeader signedIn={false} />
      <main className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,32px)] py-[clamp(30px,5vh,52px)] pb-[clamp(60px,10vh,110px)]">
        {content}
      </main>
    </>
  );
}
