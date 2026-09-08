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

  const cards: { label: string; value: string; detail: string }[] = [];

  if (topGenre) {
    cards.push({
      label: 'Seu gênero',
      value: topGenre.name,
      detail: `nota média ${((topGenre.averageRating ?? 0) / 10).toFixed(1).replace('.', ',')}`
    });
  }

  if (topStudio) {
    cards.push({
      label: 'Seu estúdio',
      value: topStudio.name,
      detail: `${topStudio.count} obras · ${(topStudio.averageRating / 10).toFixed(1).replace('.', ',')}`
    });
  }

  if (delta !== null) {
    cards.push({
      label: 'Você avalia',
      /** O sinal do desvio dito em palavra, nao so em numero: "acima" e mais
       *  legivel que "+0.7" para quem passa os olhos. */
      value: Math.abs(delta) < 0.2 ? 'na média' : delta > 0 ? 'acima' : 'abaixo',
      detail: `${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} vs público`
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
        >
          <p className="text-caption text-fg-muted">{card.label}</p>
          <p className="mt-1 truncate font-serif text-h3">{card.value}</p>
          <p className="font-data mt-1 text-caption text-accent">{card.detail}</p>
        </div>
      ))}
    </div>
  );
}