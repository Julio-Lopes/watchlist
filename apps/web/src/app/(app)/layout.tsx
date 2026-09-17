import { AppShell } from '@/components/app-shell';
import { getViewer, serverFetch } from '@/lib/api-server';
import { activityStatsSchema, badgeListSchema } from '@watchlist/shared';
import { redirect } from 'next/navigation';
import { SiteFooter } from '@/components/site-footer';
import { BadgeToast } from '@/components/badge-toast';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) redirect('/entrar');
  if (viewer.needsUsername) redirect('/onboarding');

  const [stats, badges] = await Promise.all([
    serverFetch('/stats/activity', activityStatsSchema),
    serverFetch('/me/badges', badgeListSchema)
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1">
        <AppShell viewer={viewer} streak={stats?.currentStreak ?? null}>
          <BadgeToast unseen={badges?.unseen ?? []} />
          {children}
        </AppShell>
      </div>
      <SiteFooter />
    </div>
  );
}