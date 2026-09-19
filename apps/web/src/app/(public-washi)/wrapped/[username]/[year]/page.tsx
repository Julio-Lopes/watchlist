import { FeedShell } from '@/components/feed-shell';
import { PublicHeader } from '@/components/public-header';
import { WrappedView } from '@/components/wrapped-view';
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

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1080px]">
      <p className="kicker">ainda vazio</p>
      <h1 className="mt-[18px] font-mincho text-[clamp(22px,2.6vw,30px)] leading-[1.3] font-normal text-sumi">
        {title}
      </h1>
      {children}
    </div>
  );
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
      <Notice title="Seu perfil está privado">
        <p className="mt-4 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
          O Wrapped foi feito para ser compartilhado, e por isso só funciona em perfis públicos.
          Você pode torná-lo público nas configurações e voltar aqui.
        </p>
        <Link
          href="/config#privacidade"
          className="mt-6 inline-block border border-[#d9d4cd] px-[22px] py-[11px] text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi"
        >
          Abrir configurações
        </Link>
      </Notice>
    ) : null
  ) : data.totalEpisodes < MIN_EPISODES ? (
    <Notice title="Ainda é cedo para um retrospecto">
      <p className="mt-4 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
        {isOwner
          ? `Marque ao menos ${MIN_EPISODES} episódios em ${year} e este espaço se preenche.`
          : 'Esta pessoa ainda não tem episódios suficientes neste ano.'}
      </p>
    </Notice>
  ) : (
    <WrappedView data={data} />
  );

  if (content === null) notFound();

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
