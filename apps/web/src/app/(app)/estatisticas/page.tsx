import { Heatmap } from '@/components/heatmap';
import { StreakCards } from '@/components/streak-cards';
import { serverFetch } from '@/lib/api-server';
import { activityStatsSchema } from '@watchlist/shared';

export const dynamic = 'force-dynamic';

export default async function EstatisticasPage() {
  const stats = await serverFetch('/stats/activity', activityStatsSchema);

  if (!stats || stats.totalEpisodes === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-h2">Atividade</h1>
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
        <h1 className="font-serif text-h2">Atividade</h1>
        <p className="font-data text-caption text-fg-muted">
          {stats.totalEpisodes.toLocaleString('pt-BR')} episódios · {stats.activeDays} dias ativos
        </p>
      </div>

      <StreakCards stats={stats} />

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
        <Heatmap days={stats.days} />
      </div>
    </div>
  );
}