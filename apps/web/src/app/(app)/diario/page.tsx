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
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-h2">Diário</h1>
          {/** Total do mes corrente, fixo: um numero que muda conforme a
           *   rolagem nao significa nada para quem le. */}
          {diary && diary.month.episodes > 0 && (
            <span className="font-data text-caption text-fg-muted">
              este mês · {diary.month.episodes} eps · {formatMinutes(diary.month.minutes)}
            </span>
          )}
        </div>

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