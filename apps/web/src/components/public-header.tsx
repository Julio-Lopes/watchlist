import Link from 'next/link';

const LINK =
  'text-[13px] tracking-[0.05em] text-sumi-faint transition-colors duration-400 hover:text-sumi';

/**
 * Cabecalho minimo para paginas publicas com conteudo. Nao e a navbar do app:
 * esta pagina e indexavel e alguem sem sessao precisa abri-la sem topar com
 * links que exigem login. So a marca, que leva ao lugar certo conforme quem
 * esta olhando.
 */
export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-washi/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center gap-5 px-[clamp(16px,4vw,32px)] py-4">
        <Link
          href={signedIn ? '/biblioteca' : '/'}
          className="font-mincho text-[18px] font-medium tracking-[0.02em] text-sumi"
        >
          Watchlist
        </Link>

        <div className="ml-auto flex items-center gap-[clamp(14px,2vw,22px)]">
          <Link href="/buscar" className={LINK}>
            Buscar
          </Link>

          <Link href="/ranking" className={LINK}>
            Ranking
          </Link>

          {signedIn ? (
            <Link href="/biblioteca" className={LINK}>
              Minha biblioteca
            </Link>
          ) : (
            <Link href="/entrar" className={LINK}>
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
