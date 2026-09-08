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
      <div className="space-y-6">
        <h1 className="font-serif text-h2">Estatísticas</h1>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <p className="text-body">Ainda não há atividade registrada</p>
          <p className="mt-1 text-small text-fg-muted">
            Marque episódios na biblioteca e este espaço começa a se preencher.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-h2">Estatísticas</h1>

        <div className="flex gap-3 text-caption">
          {PERIODS.map((option) => (
            <Link
              key={option.value}
              href={`/estatisticas?period=${option.value}`}
              className={
                active === option.value
                  ? 'border-b border-accent pb-0.5 text-fg'
                  : 'text-fg-muted hover:text-fg'
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {overview && <StatsHighlights overview={overview} />}

      <StreakCards stats={stats} />

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
        <h2 className="font-serif text-h3">Atividade</h2>
        <p className="mt-1 text-small text-fg-muted">
          {stats.totalEpisodes.toLocaleString('pt-BR')} episódios em {stats.activeDays} dias ativos.
        </p>
        <div className="mt-4">
          <Heatmap days={stats.days} />
        </div>
      </div>

      {overview && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <GenreChart genres={overview.genres} />
            <RatingChart overview={overview} />
          </div>

          <MonthChart months={overview.months} />

          <div className="grid gap-4 lg:grid-cols-3">
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
            <p className="text-caption text-fg-muted">
              {overview.affinitiesBelowThreshold} nomes ficaram de fora dos rankings por terem menos
              de {overview.minSampleSize} obras avaliadas.
            </p>
          )}

          {overview.dropReasons.length > 0 && (
            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
              <h2 className="font-serif text-h3">Por que você larga</h2>
              <div className="mt-4 space-y-2">
                {overview.dropReasons.map((item) => (
                  <div key={item.reason} className="flex justify-between text-small">
                    <span className="text-fg-muted">{DROP_LABEL[item.reason] ?? item.reason}</span>
                    <span className="font-data">{item.count}</span>
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