import Link from 'next/link';

/** Lucide não traz mais ícones de marca. */
function Github(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function Linkedin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM6 9H2v12h4z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export interface FooterLink {
  label: string;
  href: string;
}

/** Links que funcionam em qualquer página, logado ou não. As âncoras da landing
 *  (#filosofia etc.) só existem lá, então a landing passa as suas em `nav`. */
const DEFAULT_NAV: FooterLink[] = [
  { label: 'Buscar', href: '/buscar' },
  { label: 'Ranking', href: '/ranking' }
];

const AUTHOR_LINKS = [
  { label: 'GitHub', href: 'https://github.com/Julio-Lopes', Icon: Github },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/julio-cesar-ribeiro-lopes', Icon: Linkedin }
];

/** Atribuição exigida pelos termos da API do TMDB; AniList e MAL entram pelo
 *  mesmo critério de honestidade sobre a origem do catálogo. */
const SOURCES = [
  { label: 'AniList', href: 'https://anilist.co' },
  { label: 'MyAnimeList', href: 'https://myanimelist.net' },
  { label: 'TMDB', href: 'https://www.themoviedb.org' }
];

/** Rodapé — tema "Japanese Modern", igual em todas as páginas. */
export function SiteFooter({ nav = DEFAULT_NAV }: { nav?: FooterLink[] }) {
  return (
    <footer className="bg-washi">
      <div className="mx-auto max-w-[1180px] px-5 pt-14 pb-10 sm:px-8 md:pt-24 lg:px-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr] md:gap-16">
          <div>
            <p className="font-mincho text-[18px] text-sumi">Watchlist</p>
            <p className="mt-4 max-w-[26em] text-[13px] leading-[1.85] text-sumi-faint">
              Feito por Julio Lopes como projeto de portfólio. Sem fins lucrativos, sem anúncio, sem
              coleta além do necessário.
            </p>
            <div className="mt-5 flex gap-4">
              {AUTHOR_LINKS.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="text-sumi-soft transition-colors duration-400 hover:text-torii"
                >
                  <Icon className="size-[18px]" strokeWidth={1.2} aria-hidden />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] tracking-[0.2em] text-sumi-faint uppercase">Navegar</p>
            <div className="mt-4 flex flex-col gap-3 text-[13.5px]">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sumi-soft transition-colors duration-400 hover:text-torii"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] tracking-[0.2em] text-sumi-faint uppercase">Catálogo por</p>
            <div className="mt-4 flex flex-col gap-3 text-[13.5px]">
              {SOURCES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sumi-soft transition-colors duration-400 hover:text-torii"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="hairline my-10 md:my-16" />

        <p className="max-w-[60em] text-[11.5px] leading-[1.8] text-sumi-faint">
          Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Capas,
          sinopses e informações de elenco pertencem às respectivas fontes.
        </p>
      </div>
    </footer>
  );
}
