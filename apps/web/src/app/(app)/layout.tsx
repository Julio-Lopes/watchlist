import { AppShell } from '@/components/app-shell';
import { getViewer, serverFetch } from '@/lib/api-server';
import { activityStatsSchema } from '@watchlist/shared';
import { redirect } from 'next/navigation';
import { SiteFooter } from '@/components/site-footer';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) redirect('/entrar');
  if (viewer.needsUsername) redirect('/onboarding');

  const stats = await serverFetch('/stats/activity', activityStatsSchema);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1">
        <AppShell viewer={viewer} streak={stats?.currentStreak ?? null}>
          {children}
        </AppShell>
      </div>
      <SiteFooter />
    </div>
  );
}