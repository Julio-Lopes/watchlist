import type { Overview } from '@watchlist/shared';

const CHART_HEIGHT = 110;

/** Posição horizontal de uma nota (escala 3–10) no eixo de 8 faixas. */
const position = (score: number): number => Math.min(100, Math.max(0, ((score - 3) / 8) * 100));

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

  const fmt = (value: number) => value.toFixed(1).replace('.', ',');

  const summary =
    mine !== null && theirs !== null
      ? `Sua média é ${fmt(mine)} contra ${fmt(theirs)} do público nas mesmas obras.`
      : mine !== null
        ? `Sua média é ${fmt(mine)} em ${overview.ratedEntries} obras avaliadas.`
        : null;

  return (
    <section className="border-t border-hairline pt-[clamp(28px,4vh,40px)]">
      <h2 className="font-mincho text-[clamp(20px,2.4vw,26px)] font-normal tracking-[-0.01em] text-sumi">
        Suas notas
      </h2>
      {summary && (
        <p className="mt-2.5 max-w-[36em] text-sm leading-[1.75] font-light text-sumi-soft">{summary}</p>
      )}

      <div className="relative mt-[clamp(26px,4vh,36px)]">
        <div
          className="flex items-end gap-1.5 border-b border-sumi"
          style={{ height: CHART_HEIGHT }}
        >
          {buckets.map((bucket) => (
            <span key={bucket.score} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-mincho text-[13px] text-sumi-soft">
                {bucket.count > 0 ? bucket.count : ''}
              </span>
              <span
                className="block w-full bg-sumi"
                style={{ height: `${Math.max(1, (bucket.count / max) * 84)}px` }}
                title={`${bucket.score} a ${bucket.score},9: ${bucket.count} obras`}
              />
            </span>
          ))}
        </div>

        <div className="mt-2 flex gap-1.5">
          {buckets.map((bucket) => (
            <span
              key={bucket.score}
              className="flex-1 text-center font-mincho text-[12.5px] text-sumi-faint"
            >
              {bucket.score}
            </span>
          ))}
        </div>

        {/** A distância entre as duas médias é o dado; a frase só a narra. */}
        <div className="mt-[22px] flex flex-wrap gap-x-[22px] gap-y-2 text-[11.5px] tracking-[0.06em] text-sumi-faint">
          {mine !== null && (
            <span className="flex items-center gap-2">
              <span className="block h-px w-4 bg-torii" />
              sua média {fmt(mine)}
            </span>
          )}
          {theirs !== null && (
            <span className="flex items-center gap-2">
              <span className="block h-px w-4 bg-sumi-faint" />
              público {fmt(theirs)}
            </span>
          )}
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: CHART_HEIGHT }}
        >
          {mine !== null && (
            <span
              className="absolute inset-y-0 w-px bg-torii"
              style={{ left: `${position(mine)}%` }}
            />
          )}
          {theirs !== null && (
            <span
              className="absolute inset-y-0 w-px bg-sumi-faint"
              style={{ left: `${position(theirs)}%` }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
