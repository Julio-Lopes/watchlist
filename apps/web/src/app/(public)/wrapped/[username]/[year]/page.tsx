import { AppShell } from '@/components/app-shell';
import { PublicHeader } from '@/components/public-header';
import { WrappedView } from '@/components/wrapped-view';
import { Button } from '@/components/ui/button';
import { getViewer, serverFetch } from '@/lib/api-server';
import { activityStatsSchema, wrappedSchema } from '@watchlist/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const MIN_EPISODES = 20;

export async function generateMetadata({
  params
}: {
  params: Promise<{ username: string; year: string }>;
}): Promise<Metadata> {
  const { username, year } = await params;
  const data = await serverFetch(`/wrapped/${username}/${year}`, wrappedSchema);

  if (!data) return { title: 'Retrospecto · Watchlist' };

  const name = data.owner.displayName ?? data.owner.username;
  const hours = Math.round(data.totalMinutes / 60);

  return {
    title: `${name} em ${year} · Watchlist`,
    description: `${data.totalEpisodes} episódios e ${hours} horas em ${data.activeDays} dias.`,
    openGraph: {
      images: [{ url: `/api/og/wrapped?username=${username}&year=${year}`, width: 1080, height: 1350 }]
    }
  };
}

export default async function WrappedPage({
  params
}: {
  params: Promise<{ username: string; year: string }>;
}) {
  const { username, year } = await params;

  const [data, viewer] = await Promise.all([
    serverFetch(`/wrapped/${username}/${year}`, wrappedSchema),
    getViewer()
  ]);

  const isOwner = viewer?.username === username.toLowerCase();

  const content = !data ? (
    isOwner ? (
      /** So o dono ve este aviso. Para visitante, perfil privado responde 404,
       *  indistinguivel de username inexistente: dizer "esse perfil e privado"
       *  ja confirmaria que a conta existe. */
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <p className="text-body">Seu perfil está privado</p>
        <p className="mx-auto mt-2 max-w-md text-small text-fg-muted">
          O Wrapped foi feito para ser compartilhado, e por isso só funciona em perfis públicos.
          Você pode torná-lo público nas configurações e voltar aqui.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/config#privacidade">Abrir configurações</Link>
        </Button>
      </div>
    ) : null
  ) : data.totalEpisodes < MIN_EPISODES ? (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
      <p className="text-body">Ainda é cedo para um retrospecto</p>
      <p className="mx-auto mt-2 max-w-md text-small text-fg-muted">
        {isOwner
          ? `Marque ao menos ${MIN_EPISODES} episódios em ${year} e este espaço se preenche.`
          : 'Esta pessoa ainda não tem episódios suficientes neste ano.'}
      </p>
    </div>
  ) : (
    <WrappedView data={data} />
  );

  if (content === null) notFound();

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
      <main className="mx-auto max-w-[1280px] px-4 py-10 md:px-6 lg:px-8">{content}</main>
    </>
  );
}