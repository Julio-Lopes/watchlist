import type { Overview } from '@watchlist/shared';

const HEAT = ['bg-heat-1', 'bg-heat-1', 'bg-heat-2', 'bg-heat-2', 'bg-heat-3', 'bg-heat-3', 'bg-heat-4', 'bg-heat-4'];

export function RatingChart({ overview }: { overview: Overview }) {
  if (overview.ratedEntries === 0) return null;

  /** Faixas de 3 a 10. Nao existe 0 nem 1 e 2 sao raros; comecar em 3 evita
   *  metade do grafico vazio. Ver decisao de escala na Etapa 1. */
  const buckets = Array.from({ length: 8 }, (_, index) => {
    const score = index + 3;
    return {
      score,
      count: overview.ratings.find((bucket) => bucket.score === score)?.count ?? 0
    };
  });

  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  const mine = overview.averageRating !== null ? overview.averageRating / 10 : null;
  const theirs = overview.publicAverage !== null ? overview.publicAverage / 10 : null;

  const summary =
    mine !== null && theirs !== null
      ? `Sua média é ${mine.toFixed(1).replace('.', ',')} contra ${theirs.toFixed(1).replace('.', ',')} do público nas mesmas obras.`
      : mine !== null
        ? `Sua média é ${mine.toFixed(1).replace('.', ',')} em ${overview.ratedEntries} obras avaliadas.`
        : null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
      <h2 className="font-serif text-h3">Suas notas</h2>
      {summary && <p className="mt-1 max-w-prose text-small text-fg-muted">{summary}</p>}

      <div className="mt-5 flex h-24 items-end gap-1.5">
        {buckets.map((bucket, index) => (
          <div key={bucket.score} className="flex flex-1 flex-col items-center gap-1">
            <span className="font-data text-caption text-fg-muted">
              {bucket.count > 0 ? bucket.count : ''}
            </span>
            <div
              className={`w-full rounded-t-[2px] ${HEAT[index]}`}
              style={{ height: `${Math.max(2, (bucket.count / max) * 72)}px` }}
              title={`${bucket.score} a ${bucket.score},9: ${bucket.count} obras`}
            />
          </div>
        ))}
      </div>

      <div className="mt-1 flex gap-1.5">
        {buckets.map((bucket) => (
          <span
            key={bucket.score}
            className="font-data flex-1 text-center text-caption text-fg-muted"
          >
            {bucket.score}
          </span>
        ))}
      </div>
    </section>
  );
}