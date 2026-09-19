import { FeedShell } from '@/components/feed-shell';
import { PublicHeader } from '@/components/public-header';
import { SearchPanel } from '@/components/search-panel';
import { getViewer, serverFetch } from '@/lib/api-server';
import { activityStatsSchema } from '@watchlist/shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Buscar · Watchlist' };

export default async function BuscarPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const viewer = await getViewer();

  const content = (
    <div className="mx-auto max-w-[820px]">
      <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
        Buscar
      </h1>
      <div className="mt-[clamp(20px,3vh,28px)]">
        <SearchPanel initialTerm={q ?? ''} />
      </div>
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
