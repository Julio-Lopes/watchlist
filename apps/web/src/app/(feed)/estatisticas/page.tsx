import { AffinityList } from '@/components/affinity-list';
import { GenreChart } from '@/components/genre-chart';
import { Heatmap } from '@/components/heatmap';
import { MonthChart } from '@/components/month-chart';
import { RatingChart } from '@/components/rating-chart';
import { StatsHighlights } from '@/components/stats-highlights';
import { StreakCards } from '@/components/streak-cards';
import { serverFetch } from '@/lib/api-server';
import { activityStatsSchema, overviewSchema } from '@watchlist/shared';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const DROP_LABEL: Record<string, string> = {
  pacing: 'Ritmo',
  characters: 'Personagens',
  art: 'Arte',
  plot: 'História',
  no_time: 'Sem tempo',
  other: 'Outro'
};

const PERIODS = [
  { value: 'all', label: 'Sempre' },
  { value: 'year', label: 'Último ano' }
];

const sectionTitle =
  'font-mincho text-[clamp(20px,2.4vw,26px)] font-normal tracking-[-0.01em] text-sumi';

export default async function EstatisticasPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const active = period === 'year' ? 'year' : 'all';

  const [stats, overview] = await Promise.all([
    serverFetch('/stats/activity', activityStatsSchema),
    serverFetch(`/stats/overview?period=${active}`, overviewSchema)
  ]);

  if (!stats || stats.totalEpisodes === 0) {
    return (
      <div className="mx-auto max-w-[1080px]">
        <div className="border-b border-hairline pb-4">
          <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
            Estatísticas
          </h1>
        </div>
        <div className="mt-[clamp(26px,4vh,40px)]">
          <p className="kicker">&nbsp;·&nbsp; ainda vazio</p>
          <p className="mt-[18px] font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">
            Ainda não há atividade registrada
          </p>
          <p className="mt-3 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
            Marque episódios na biblioteca e este espaço começa a se preencher.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px]">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3 border-b border-hairline pb-4">
        <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
          Estatísticas
        </h1>

        <div className="ml-auto flex gap-[18px] text-[12.5px] tracking-[0.04em]">
          {PERIODS.map((option) => (
            <Link
              key={option.value}
              href={`/estatisticas?period=${option.value}`}
              className={
                active === option.value
                  ? 'border-b border-torii pb-[3px] text-sumi'
                  : 'border-b border-transparent pb-[3px] text-sumi-faint transition-colors duration-400 hover:text-sumi'
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {overview && <StatsHighlights overview={overview} />}

      <StreakCards stats={stats} />

      <section className="mt-[clamp(44px,7vh,76px)] border-t border-hairline pt-[clamp(28px,4vh,40px)]">
        <h2 className={sectionTitle}>Atividade</h2>
        <p className="mt-2.5 text-sm leading-[1.7] font-light text-sumi-soft">
          {stats.totalEpisodes.toLocaleString('pt-BR')} episódios em {stats.activeDays} dias ativos.
        </p>
        <div className="mt-[clamp(22px,3vh,30px)]">
          <Heatmap days={stats.days} tone="washi" />
        </div>
      </section>

      {overview && (
        <>
          <div className="mt-[clamp(44px,7vh,76px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-[clamp(34px,5vw,64px)]">
            <GenreChart genres={overview.genres} />
            <RatingChart overview={overview} />
          </div>

          <MonthChart months={overview.months} />

          <div className="mt-[clamp(44px,7vh,76px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-[clamp(28px,4vw,52px)] border-t border-hairline pt-[clamp(28px,4vh,40px)]">
            <AffinityList
              title="Estúdios"
              items={overview.studios}
              emptyHint={`Precisa de ao menos ${overview.minSampleSize} obras concluídas e avaliadas do mesmo estúdio.`}
            />
            <AffinityList title="Direção" items={overview.directors} />
            <AffinityList title="Trilha sonora" items={overview.composers} />
          </div>

          {/** Dizer quantos ficaram de fora e mais honesto que fingir que o
           *   ranking cobre tudo que voce assistiu. */}
          {overview.affinitiesBelowThreshold > 0 && (
            <p className="mt-[clamp(34px,5vh,52px)] text-xs leading-[1.8] text-sumi-faint">
              {overview.affinitiesBelowThreshold} nomes ficaram de fora dos rankings por terem menos
              de {overview.minSampleSize} obras avaliadas.
            </p>
          )}

          {overview.dropReasons.length > 0 && (
            <section className="mt-[clamp(44px,7vh,76px)] border-t border-hairline pt-[clamp(28px,4vh,40px)]">
              <h2 className={sectionTitle}>Por que você larga</h2>
              <div className="mt-5 max-w-[420px]">
                {overview.dropReasons.map((item) => (
                  <div
                    key={item.reason}
                    className="flex items-baseline justify-between border-b border-[#f0ece6] py-2 text-[13px]"
                  >
                    <span className="text-sumi-soft">{DROP_LABEL[item.reason] ?? item.reason}</span>
                    <span className="font-mincho text-sumi">{item.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
