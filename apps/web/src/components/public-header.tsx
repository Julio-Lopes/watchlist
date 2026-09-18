import Link from 'next/link';

/**
 * Cabecalho minimo para paginas publicas com conteudo. Nao e a navbar do app:
 * esta pagina e indexavel e alguem sem sessao precisa abri-la sem topar com
 * links que exigem login. So a marca, que leva ao lugar certo conforme quem
 * esta olhando.
 */
export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-12 max-w-[1280px] items-center gap-4 px-4 md:px-6 lg:px-8">
        <Link href={signedIn ? '/biblioteca' : '/'} className="font-serif text-h3">
          Watchlist
        </Link>

        <div className="ml-auto flex items-center gap-4 text-small">
          <Link href="/buscar" className="text-fg-muted transition-colors duration-150 hover:text-fg">
            Buscar
          </Link>

          <Link href="/ranking" className="text-fg-muted transition-colors duration-150 hover:text-fg">
            Ranking
          </Link>

          {signedIn ? (
            <Link
              href="/biblioteca"
              className="text-fg-muted transition-colors duration-150 hover:text-fg"
            >
              Minha biblioteca
            </Link>
          ) : (
            <Link href="/entrar" className="text-fg-muted transition-colors duration-150 hover:text-fg">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}