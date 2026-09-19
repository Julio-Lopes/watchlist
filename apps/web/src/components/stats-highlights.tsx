import type { Overview } from '@watchlist/shared';

/**
 * Tres frases antes dos graficos. O produto interpreta o numero em vez de
 * deixar o usuario decifrar barra por barra, e e isso que separa esta tela
 * de um painel de BI qualquer.
 */
export function StatsHighlights({ overview }: { overview: Overview }) {
  const topGenre = [...overview.genres]
    .filter((genre) => genre.averageRating !== null)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))[0];

  const topStudio = overview.studios[0];

  const delta =
    overview.averageRating !== null && overview.publicAverage !== null
      ? (overview.averageRating - overview.publicAverage) / 10
      : null;

  const cards: { label: string; value: string; detail: string; accent: string }[] = [];

  if (topGenre) {
    cards.push({
      label: 'Seu gênero',
      value: topGenre.name,
      detail: 'nota média ',
      accent: ((topGenre.averageRating ?? 0) / 10).toFixed(1).replace('.', ',')
    });
  }

  if (topStudio) {
    cards.push({
      label: 'Seu estúdio',
      value: topStudio.name,
      detail: `${topStudio.count} obras · `,
      accent: (topStudio.averageRating / 10).toFixed(1).replace('.', ',')
    });
  }

  if (delta !== null) {
    cards.push({
      label: 'Você avalia',
      /** O sinal do desvio dito em palavra, nao so em numero: "acima" e mais
       *  legivel que "+0.7" para quem passa os olhos. */
      value: Math.abs(delta) < 0.2 ? 'na média' : delta > 0 ? 'acima' : 'abaixo',
      detail: ' vs público',
      accent: `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(1).replace('.', ',')}`
    });
  }

  if (cards.length === 0) return null;

  return (
    <section className="mt-[clamp(30px,5vh,48px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-px border-y border-hairline bg-hairline">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-washi px-[clamp(18px,2.4vw,26px)] pt-[clamp(20px,3vw,28px)] pb-[clamp(24px,3.4vw,32px)]"
        >
          <p className="text-[11px] tracking-[0.2em] text-sumi-faint uppercase">{card.label}</p>
          <p className="mt-3.5 truncate font-mincho text-[clamp(24px,3vw,32px)] leading-[1.2] tracking-[-0.01em] text-sumi">
            {card.value}
          </p>
          <p className="mt-2.5 text-[12.5px] tracking-[0.04em] text-sumi-soft">
            {card.label === 'Você avalia' ? (
              <>
                <span className="font-mincho text-sm text-torii">{card.accent}</span>
                {card.detail}
              </>
            ) : (
              <>
                {card.detail}
                <span className="font-mincho text-sm text-torii">{card.accent}</span>
              </>
            )}
          </p>
        </div>
      ))}
    </section>
  );
}
