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
    <section className="border-t border-hairline pt-[clamp(28px,4vh,40px)]">
      <h2 className="font-mincho text-[clamp(20px,2.4vw,26px)] font-normal tracking-[-0.01em] text-sumi">
        Gêneros
      </h2>
      {summary && (
        <p className="mt-2.5 max-w-[36em] text-sm leading-[1.75] font-light text-sumi-soft">{summary}</p>
      )}

      <div className="mt-[clamp(20px,3vh,28px)]">
        {genres.map((genre) => {
          const best = genre.name === bestRated?.name;

          return (
            <div
              key={genre.name}
              className="flex items-center gap-3.5 border-b border-[#f0ece6] py-2 transition-colors duration-400 last:border-b-0 hover:bg-washi-2"
            >
              <span
                className={`w-[clamp(72px,8vw,92px)] shrink-0 truncate text-[13px] ${best ? 'text-sumi' : 'text-sumi-soft'}`}
              >
                {genre.name}
              </span>

              <span className="block h-1.5 min-w-0 flex-1 bg-[#e8e4de]">
                <span
                  className={`block h-1.5 ${best ? 'bg-torii' : 'bg-sumi'}`}
                  style={{ width: `${(genre.count / max) * 100}%` }}
                />
              </span>

              <span
                className={`w-8 shrink-0 text-right font-mincho text-[13px] ${best ? 'text-torii' : 'text-sumi'}`}
              >
                {genre.averageRating !== null
                  ? (genre.averageRating / 10).toFixed(1).replace('.', ',')
                  : ''}
              </span>

              <span className="w-5 shrink-0 text-right text-xs text-sumi-faint">{genre.count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
