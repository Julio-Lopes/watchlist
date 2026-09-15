import Link from 'next/link';

const AUTHOR_LINKS = [
  { label: 'GitHub', href: 'https://github.com/Julio-Lopes' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/julio-cesar-ribeiro-lopes' }
];

const SOURCES = [
  { label: 'AniList', href: 'https://anilist.co' },
  { label: 'MyAnimeList', href: 'https://myanimelist.net' },
  { label: 'TMDB', href: 'https://www.themoviedb.org' }
];

/**
 * A atribuicao ao TMDB nao e cortesia: os termos de uso da API exigem declarar
 * que o produto usa os dados deles e nao e endossado por eles. O AniList entra
 * pelo mesmo criterio de honestidade sobre a origem do catalogo.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 overflow-hidden border-t border-border">
      <div className="mx-auto max-w-[1280px] px-4 pt-8 md:px-6 lg:px-8">
        <div className="flex flex-wrap justify-between gap-8">
          <div className="max-w-sm">
            <p className="text-small leading-relaxed text-fg-muted">
              Feito por <span className="text-fg">Julio Lopes</span> como projeto de portfólio. Sem
              fins lucrativos, sem anúncio, sem coleta além do necessário.
            </p>

            <div className="mt-4 flex gap-4">
              {AUTHOR_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-small text-fg-muted transition-colors duration-150 hover:text-fg"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-right">
            <p className="text-caption tracking-wide text-fg-muted uppercase">Catálogo por</p>
            <div className="mt-2 flex flex-col items-end gap-2">
              {SOURCES.map((source) => (
                <Link
                  key={source.label}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-[var(--radius-control)] border border-border px-3 py-1 text-small text-fg-muted transition-colors duration-150 hover:text-fg"
                >
                  {source.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-2xl text-caption leading-relaxed text-fg-muted">
          Os dados de animes vêm do MyAnimeList e da AniList, agregados por uma API própria, e os de
          filmes e séries vêm do TMDB. As capas, sinopses e informações de elenco pertencem às
          respectivas fontes.
        </p>

        <p className="mt-2 max-w-2xl text-caption leading-relaxed text-fg-muted">
          Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
        </p>
      </div>

      {/** Marca grande em cor de superficie: fecha a pagina sem competir com o
       *   conteudo. aria-hidden porque e ornamento, nao texto para leitor. */}
      <p
        aria-hidden
        className="pointer-events-none -mb-3 select-none text-center font-serif text-[clamp(3.5rem,14vw,9rem)] leading-[0.75] tracking-tight text-surface"
      >
        Watchlist
      </p>
    </footer>
  );
}