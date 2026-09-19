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

const label = 'text-[11px] tracking-[0.2em] text-sumi-faint uppercase';

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
    <div className="mx-auto max-w-[1080px]">
      <div className="flex items-center gap-3 border-b border-hairline pb-4">
        <Link href={`/u/${data.owner.username}`} className="flex min-w-0 items-center gap-3">
          {data.owner.avatarUrl ? (
            <img
              src={data.owner.avatarUrl}
              alt=""
              className="size-[26px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[#d9d4cd] font-mincho text-[11px] text-sumi-faint">
              {data.owner.username[0]?.toUpperCase()}
            </span>
          )}
          <span className="truncate text-[13.5px] text-sumi">{data.owner.username}</span>
        </Link>

        {/** "ate agora" quando o ano nao acabou: mostrar 2026 fechado em
         *   setembro seria mentira. */}
        <span className="ml-auto shrink-0 font-mincho text-sm text-sumi-faint">
          {data.year}
          {data.partial ? ' até agora' : ''}
        </span>
      </div>

      <div className="mt-[clamp(34px,6vh,64px)]">
        <p className="kicker">retrospecto</p>
        <h1 className="mt-5 max-w-[15em] font-mincho text-[clamp(30px,5vw,58px)] leading-[1.2] font-normal tracking-[-0.02em] text-balance text-sumi">
          {name} passou{' '}
          <span className="text-torii">{formatDays(data.totalMinutes)}</span> assistindo coisas{' '}
          {data.partial ? 'este ano' : `em ${data.year}`}.
        </h1>
        <p className="mt-5 text-[15.5px] leading-[1.9] font-light text-sumi-soft">
          {data.totalEpisodes.toLocaleString('pt-BR')} episódios em {data.activeDays} dias
          diferentes.
        </p>
      </div>

      <dl className="mt-[clamp(34px,5vh,52px)] grid grid-cols-[repeat(auto-fit,minmax(min(50%,180px),1fr))] gap-y-6 border-y border-hairline py-[clamp(22px,3vh,30px)]">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-l border-hairline px-[clamp(14px,2vw,26px)] first:border-l-0 first:pl-0"
          >
            <dd
              className={`font-mincho text-[clamp(24px,3vw,36px)] leading-none ${stat.accent ? 'text-torii' : 'text-sumi'}`}
            >
              {stat.value}
            </dd>
            <dt className="mt-3 text-xs tracking-[0.08em] text-sumi-faint">{stat.label}</dt>
          </div>
        ))}
      </dl>

      {data.topGenre && (
        <p className="mt-[clamp(28px,4vh,40px)] max-w-[40em] text-[15.5px] leading-[1.9] font-light text-sumi-soft">
          <span className="text-sumi">{data.topGenre}</span> apareceu em {data.topGenreCount} das
          obras concluídas
          {delta !== null && Math.abs(delta) >= 0.2 && (
            <>
              , e as notas ficaram{' '}
              <span className="text-sumi">
                {delta > 0 ? 'acima' : 'abaixo'} da média do público
              </span>{' '}
              por {Math.abs(delta).toFixed(1).replace('.', ',')} ponto
            </>
          )}
          .
        </p>
      )}

      {data.mostWatched && (
        <section className="mt-[clamp(44px,7vh,76px)] border-t border-hairline pt-[clamp(26px,4vh,38px)]">
          <p className={label}>Onde o tempo foi</p>
          <Link
            href={`/media/${data.mostWatched.source}/${data.mostWatched.mediaType}/${data.mostWatched.externalId}`}
            className="mt-5 flex items-center gap-[clamp(16px,2.4vw,28px)]"
          >
            <span className="block h-[156px] w-[104px] shrink-0 overflow-hidden bg-[#eae6e0]">
              {data.mostWatched.coverImage && (
                <img src={data.mostWatched.coverImage} alt="" className="size-full object-cover" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block font-mincho text-[clamp(22px,2.8vw,32px)] leading-[1.25] tracking-[-0.01em] text-sumi">
                {data.mostWatched.title}
              </span>
              <span className="mt-2.5 block font-mincho text-base text-torii">
                {data.mostWatched.episodes} episódios no ano
              </span>
            </span>
          </Link>
        </section>
      )}

      {data.highlights.length > 0 && (
        <section className="mt-[clamp(44px,7vh,76px)] border-t border-hairline pt-[clamp(26px,4vh,38px)]">
          <p className={label}>O que marcou o ano</p>
          <div className="mt-5 grid grid-cols-3 gap-x-[clamp(14px,1.8vw,20px)] gap-y-6 sm:grid-cols-5">
            {data.highlights.map((item) => (
              <Link
                key={`${item.source}-${item.externalId}`}
                href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
                className="block"
              >
                <span className="block aspect-2/3 overflow-hidden bg-[#eae6e0]">
                  {item.coverImage && (
                    <img
                      src={item.coverImage}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </span>
                <span className="mt-2.5 flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-sumi">{item.title}</span>
                  {item.userRating !== null && (
                    <span className="shrink-0 font-mincho text-[13.5px] text-sumi">
                      {(item.userRating / 10).toFixed(1).replace('.', ',')}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-[clamp(44px,7vh,76px)] border-t border-hairline pt-[clamp(26px,4vh,38px)]">
        <p className={label}>Atividade</p>
        <div className="mt-5">
          <Heatmap days={data.activity} tone="washi" />
        </div>
      </section>

      <WrappedShare username={data.owner.username} year={data.year} />
    </div>
  );
}
