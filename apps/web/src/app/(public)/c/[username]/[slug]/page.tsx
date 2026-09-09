import { AppShell } from '@/components/app-shell';
import { CollectionCover } from '@/components/collection-card';
import { CollectionDialog } from '@/components/collection-dialog';
import { CollectionItems } from '@/components/collection-items';
import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
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

  const content = (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <div className="relative h-32">
          <CollectionCover covers={collection.covers} />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-surface/20" />

          <div className="absolute inset-x-4 bottom-3 md:inset-x-6">
            {collection.isRanked && (
              <span className="font-data mb-1.5 inline-block rounded-[var(--radius-control)] border border-accent/60 bg-bg/60 px-2 py-0.5 text-caption text-heat-4">
                ranqueada
              </span>
            )}

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-serif text-h2">{collection.name}</h1>

                <div className="mt-2 flex items-center gap-2">
                  <Link
                    href={`/u/${collection.owner.username}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    {collection.owner.avatarUrl ? (
                      <img src={collection.owner.avatarUrl} alt="" className="size-5 rounded-full" />
                    ) : (
                      <span className="size-5 rounded-full bg-surface-hover" />
                    )}
                    <span className="text-small text-fg-muted">{collection.owner.username}</span>
                  </Link>

                  <span className="font-data text-caption text-fg-muted">
                    · {collection.itemCount} {collection.itemCount === 1 ? 'obra' : 'obras'}
                    {collection.totalEpisodes > 0 && ` · ${collection.totalEpisodes} eps`}
                    {collection.totalMinutes > 0 && ` · ${formatHours(collection.totalMinutes)}`}
                  </span>
                </div>
              </div>

              {collection.isOwner && (
                <CollectionDialog
                  username={collection.owner.username}
                  collection={collection}
                  trigger={
                    <Button variant="outline" size="sm" className="shrink-0">
                      Editar
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </div>

        {collection.description && (
          <p className="max-w-prose px-4 pt-4 text-small text-fg-muted md:px-6">
            {collection.description}
          </p>
        )}

        <div className="p-4 md:p-6">
          <CollectionItems key={collection.itemCount} collection={collection} />
        </div>
      </div>
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