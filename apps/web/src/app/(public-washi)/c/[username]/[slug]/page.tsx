import { CollectionCover } from '@/components/collection-card';
import { CollectionDialog } from '@/components/collection-dialog';
import { CollectionItems } from '@/components/collection-items';
import { FeedShell } from '@/components/feed-shell';
import { PublicHeader } from '@/components/public-header';
import { getViewer, serverFetch } from '@/lib/api-server';
import { activityStatsSchema, collectionDetailSchema } from '@watchlist/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const formatHours = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  return hours > 0 ? `${hours}h` : `${minutes}min`;
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const collection = await serverFetch(`/collections/${username}/${slug}`, collectionDetailSchema);

  if (!collection) return { title: 'Coleção não encontrada · Watchlist' };

  return {
    title: `${collection.name} · Watchlist`,
    description:
      collection.description ?? `Uma coleção de ${collection.itemCount} obras por ${username}.`
  };
}

export default async function CollectionPage({
  params
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;

  const [collection, viewer] = await Promise.all([
    serverFetch(`/collections/${username}/${slug}`, collectionDetailSchema),
    getViewer()
  ]);

  if (!collection) notFound();

  const stat = 'font-mincho text-sm text-washi';

  const content = (
    <div className="mx-auto max-w-[1180px]">
      <div className="relative h-[210px] overflow-hidden sm:h-[240px] lg:h-[260px]">
        <div className="absolute inset-0">
          <CollectionCover covers={collection.covers} coverImage={collection.coverImage} tone="washi" />
        </div>
        {/** Véu sumi de verdade: o título branco precisa passar 4,5:1 sobre
         *  qualquer imagem que a pessoa escolher. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,26,26,0.92)_0%,rgba(26,26,26,0.78)_34%,rgba(26,26,26,0.1)_72%,rgba(26,26,26,0)_100%)]" />

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 p-[clamp(20px,4vw,40px)]">
          <div className="min-w-0">
            {collection.isRanked && (
              <p className="mb-2 text-[11px] tracking-[0.2em] text-torii-soft uppercase">ranqueada</p>
            )}
            <h1 className="font-mincho text-[clamp(26px,3.4vw,40px)] font-normal tracking-[-0.015em] text-washi">
              {collection.name}
            </h1>

            <p className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 text-[12.5px] tracking-[0.04em] text-[#c9c4bd]">
              <Link
                href={`/u/${collection.owner.username}`}
                className="border-b border-washi/40 pb-px text-washi"
              >
                {collection.owner.username}
              </Link>
              <span>·</span>
              <span className={stat}>
                {collection.itemCount} {collection.itemCount === 1 ? 'obra' : 'obras'}
              </span>
              {collection.totalEpisodes > 0 && (
                <>
                  <span>·</span>
                  <span className={stat}>{collection.totalEpisodes} eps</span>
                </>
              )}
              {collection.totalMinutes > 0 && (
                <>
                  <span>·</span>
                  <span className={stat}>{formatHours(collection.totalMinutes)}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {collection.isOwner && (
        <div className="mt-4 flex justify-end">
          <CollectionDialog
            username={collection.owner.username}
            collection={collection}
            trigger={
              <button
                type="button"
                className="cursor-pointer border border-[#d9d4cd] bg-transparent px-5 py-2.5 text-[11.5px] tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi"
              >
                Editar
              </button>
            }
          />
        </div>
      )}

      <div className="pt-[clamp(20px,3vh,32px)]">
        {collection.description && (
          <p className="mb-[clamp(26px,4vh,38px)] max-w-[40em] text-[15px] leading-[1.85] font-light text-sumi-soft">
            {collection.description}
          </p>
        )}

        <CollectionItems key={collection.itemCount} collection={collection} />
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
