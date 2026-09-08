import type { GenreStat } from '@watchlist/shared';

export function GenreChart({ genres }: { genres: GenreStat[] }) {
  if (genres.length === 0) return null;

  const max = Math.max(...genres.map((genre) => genre.count));

  const mostFrequent = genres[0];
  const bestRated = [...genres]
    .filter((genre) => genre.averageRating !== null)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))[0];

  /** A frase muda conforme o dado: se o genero que voce mais consome e o que
   *  voce melhor avalia, dizer isso; se divergem, apontar a divergencia. */
  const summary =
    mostFrequent && bestRated && mostFrequent.name !== bestRated.name
      ? `${mostFrequent.name} aparece em ${mostFrequent.count} obras, mas suas notas mais altas vão para ${bestRated.name.toLowerCase()}.`
      : mostFrequent
        ? `${mostFrequent.name} domina sua lista, com ${mostFrequent.count} obras.`
        : null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
      <h2 className="font-serif text-h3">Gêneros</h2>
      {summary && <p className="mt-1 max-w-prose text-small text-fg-muted">{summary}</p>}

      <div className="mt-4 space-y-2">
        {genres.map((genre) => (
          <div key={genre.name} className="flex items-center gap-3">
            <span className="w-20 shrink-0 truncate text-small text-fg-muted">{genre.name}</span>

            <div className="relative h-5 flex-1 overflow-hidden rounded-[var(--radius-control)] bg-border">
              <div
                className="h-full bg-accent"
                style={{ width: `${(genre.count / max) * 100}%` }}
              />
              {genre.averageRating !== null && (
                <span className="font-data absolute right-2 top-0.5 text-caption">
                  {(genre.averageRating / 10).toFixed(1).replace('.', ',')}
                </span>
              )}
            </div>

            <span className="font-data w-7 shrink-0 text-right text-caption text-fg-muted">
              {genre.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}