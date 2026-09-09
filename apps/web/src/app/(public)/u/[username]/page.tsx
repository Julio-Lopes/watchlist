import { AppShell } from '@/components/app-shell';
import { ProfileHeader } from '@/components/profile-header';
import { ProfileTabs } from '@/components/profile-tabs';
import { PublicHeader } from '@/components/public-header';
import { getViewer, serverFetch } from '@/lib/api-server';
import {
  activityStatsSchema,
  collectionSummarySchema,
  publicEntriesSchema,
  publicProfileSchema,
  publicReviewsSchema
} from '@watchlist/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await serverFetch(`/users/${username}`, publicProfileSchema);

  if (!profile) return { title: 'Perfil não encontrado · Watchlist' };

  const name = profile.displayName ?? profile.username;

  return {
    title: `${name} · Watchlist`,
    description:
      `${profile.totalEntries} obras, ${profile.totalEpisodes} episódios. ${profile.bio ?? ''}`.trim()
  };
}

export default async function ProfilePage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [profile, entries, reviews, collections, viewer] = await Promise.all([
    serverFetch(`/users/${username}`, publicProfileSchema),
    serverFetch(`/users/${username}/entries`, publicEntriesSchema),
    serverFetch(`/users/${username}/reviews`, publicReviewsSchema),
    serverFetch(`/users/${username}/collections`, z.array(collectionSummarySchema)),
    getViewer()
  ]);

  if (!profile) notFound();

  const content = (
    <div className="space-y-6">
      <ProfileHeader profile={profile} />
      <ProfileTabs
        username={profile.username}
        entriesCount={profile.totalEntries}
        reviewsCount={profile.reviewsCount}
        initialEntries={entries?.items ?? []}
        initialEntriesCursor={entries?.nextCursor ?? null}
        initialReviews={reviews?.items ?? []}
        initialReviewsCursor={reviews?.nextCursor ?? null}
        collections={collections ?? []}
      />
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