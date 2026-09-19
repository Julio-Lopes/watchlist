import { DiaryFilters } from '@/components/diary-filters';
import { DiaryTimeline } from '@/components/diary-timeline';
import { serverFetch } from '@/lib/api-server';
import { diaryResponseSchema } from '@watchlist/shared';

export const dynamic = 'force-dynamic';

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest} min` : `${hours}h${String(rest).padStart(2, '0')}`;
};

export default async function DiarioPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const query = type ? `?type=${type}` : '';

  const diary = await serverFetch(`/diary${query}`, diaryResponseSchema);

  return (
    <div className="mx-auto max-w-[920px]">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3 border-b border-hairline pb-4">
        <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
          Diário
        </h1>
        {/** Total do mes corrente, fixo: um numero que muda conforme a
         *   rolagem nao significa nada para quem le. */}
        {diary && diary.month.episodes > 0 && (
          <span className="text-[12.5px] tracking-[0.04em] text-sumi-faint">
            este mês ·{' '}
            <span className="font-mincho text-sm text-sumi-soft">{diary.month.episodes}</span> eps
            · <span className="font-mincho text-sm text-sumi-soft">{formatMinutes(diary.month.minutes)}</span>
          </span>
        )}

        <DiaryFilters />
      </div>

      <DiaryTimeline
        key={type ?? 'all'}
        initialDays={diary?.days ?? []}
        initialCursor={diary?.nextCursor ?? null}
        type={type}
      />
    </div>
  );
}
