import { BadgeToast } from '@/components/badge-toast';
import { FeedShell } from '@/components/feed-shell';
import { SiteFooter } from '@/components/site-footer';
import { getViewer, serverFetch } from '@/lib/api-server';
import { activityStatsSchema, badgeListSchema } from '@watchlist/shared';
import { redirect } from 'next/navigation';

/**
 * Equivalente ao (app)/layout.tsx, na paleta washi/sumi — vive num grupo de
 * rotas separado (não muda a URL) para /inicio poder usar o tema novo sem
 * arrastar o resto do app logado (ainda escuro) junto. O rodapé é o mesmo
 * @/components/site-footer usado em todas as páginas.
 */
export default async function FeedLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) redirect('/entrar');
  if (viewer.needsUsername) redirect('/onboarding');

  const [stats, badges] = await Promise.all([
    serverFetch('/stats/activity', activityStatsSchema),
    serverFetch('/me/badges', badgeListSchema)
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-washi font-jp text-sumi">
      <div className="flex-1">
        <FeedShell viewer={viewer} streak={stats?.currentStreak ?? null}>
          <BadgeToast unseen={badges?.unseen ?? []} />
          {children}
        </FeedShell>
      </div>
      <SiteFooter />
    </div>
  );
}
