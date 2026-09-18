import { Heatmap } from '@/components/heatmap';
import { WrappedShare } from '@/components/wrapped-share';
import type { Wrapped } from '@watchlist/shared';
import Link from 'next/link';

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const formatDays = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days} dias` : `${hours} horas`;
};

export function WrappedView({ data }: { data: Wrapped }) {
  const name = data.owner.displayName ?? data.owner.username;
  const delta =
    data.averageRating !== null && data.publicAverage !== null
      ? (data.averageRating - data.publicAverage) / 10
      : null;

  const stats = [
    {
      value: data.averageRating !== null
        ? (data.averageRating / 10).toFixed(1).replace('.', ',')
        : '—',
      label: 'nota média'
    },
    { value: String(data.longestStreak), label: 'dias seguidos', accent: true },
    { value: String(data.completedCount), label: 'obras concluídas' },
    {
      value: data.busiestMonth ? MONTHS[data.busiestMonth - 1] ?? '—' : '—',
      label: 'mês mais cheio'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2.5">
        <Link href={`/u/${data.owner.username}`} className="flex items-center gap-2.5">
          {data.owner.avatarUrl ? (
            <img src={data.owner.avatarUrl} alt="" className="size-6 rounded-full" />
          ) : (
            <span className="size-6 rounded-full bg-surface-hover" />
          )}
          <span className="text-small text-fg-muted">{data.owner.username}</span>
        </Link>

        {/** "ate agora" quando o ano nao acabou: mostrar 2026 fechado em
         *   setembro seria mentira. */}
        <span className="font-data ml-auto text-caption text-fg-muted">
          {data.year}
          {data.partial ? ' até agora' : ''}
        </span>
      </div>

      <div>
        <h1 className="max-w-2xl font-serif text-display leading-tight">
          {name} passou{' '}
          <span className="font-data text-accent">{formatDays(data.totalMinutes)}</span> assistindo
          coisas {data.partial ? 'este ano' : `em ${data.year}`}.
        </h1>
        <p className="mt-3 text-body text-fg-muted">
          {data.totalEpisodes.toLocaleString('pt-BR')} episódios em {data.activeDays} dias
          diferentes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            <p className={`font-data text-h2 ${stat.accent ? 'text-accent' : ''}`}>{stat.value}</p>
            <p className="mt-0.5 text-caption text-fg-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {data.topGenre && (
        <p className="text-body text-fg-muted">
          <span className="text-fg">{data.topGenre}</span> apareceu em {data.topGenreCount} das
          obras concluídas
          {delta !== null && Math.abs(delta) >= 0.2 && (
            <>
              , e as notas ficaram{' '}
              <span className="text-fg">
                {delta > 0 ? 'acima' : 'abaixo'} da média do público
              </span>{' '}
              por {Math.abs(delta).toFixed(1).replace('.', ',')} ponto
            </>
          )}
          .
        </p>
      )}

      {data.mostWatched && (
        <section>
          <p className="text-caption tracking-wide text-fg-muted uppercase">Onde o tempo foi</p>
          <Link
            href={`/media/${data.mostWatched.source}/${data.mostWatched.mediaType}/${data.mostWatched.externalId}`}
            className="mt-3 flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            <div className="h-[78px] w-[52px] shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover">
              {data.mostWatched.coverImage && (
                <img src={data.mostWatched.coverImage} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-h3">{data.mostWatched.title}</p>
              <p className="font-data mt-1 text-small text-accent">
                {data.mostWatched.episodes} episódios no ano
              </p>
            </div>
          </Link>
        </section>
      )}

      {data.highlights.length > 0 && (
        <section>
          <p className="text-caption tracking-wide text-fg-muted uppercase">
            O que marcou o ano
          </p>
          <div className="mt-3 grid grid-cols-3 gap-4 sm:grid-cols-5">
            {data.highlights.map((item) => (
              <Link
                key={`${item.source}-${item.externalId}`}
                href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
              >
                <div className="aspect-2/3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
                  {item.coverImage && (
                    <img
                      src={item.coverImage}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1.5 truncate text-caption">{item.title}</p>
                {item.userRating !== null && (
                  <p className="font-data text-caption text-accent">
                    {(item.userRating / 10).toFixed(1).replace('.', ',')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
        <Heatmap days={data.activity} />
      </section>

      <WrappedShare username={data.owner.username} year={data.year} />
    </div>
  );
}