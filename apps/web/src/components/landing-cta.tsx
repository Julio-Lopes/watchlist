import { Reveal } from '@/components/reveal';
import Link from 'next/link';

/**
 * CTA final — único bloco escuro (sumi) da página, por isso o único que lê
 * como "agora". Sem botão preenchido de acento: no fundo escuro o torii
 * perderia contraste e ganharia ar de alerta.
 */
export function LandingCta() {
  return (
    <section id="comecar" className="relative overflow-hidden bg-sumi text-washi">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-16 w-52 -translate-y-1/2 lg:w-[340px]"
      >
        <svg viewBox="0 0 200 200" className="block w-full">
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="#F7F5F2"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="480 72"
            transform="rotate(140 100 100)"
            opacity="0.18"
          />
        </svg>
      </div>

      <div className="relative mx-auto grid max-w-[1180px] grid-cols-1 items-end gap-10 px-5 py-ma-xl sm:px-8 md:grid-cols-2 md:gap-20 lg:px-14">
        <Reveal>
          <p className="text-kicker text-torii-soft uppercase">· comece</p>
          <h2 className="mt-6 font-mincho text-jp-h1 font-normal">
            Comece pelo que
            <br />
            você já assistiu.
          </h2>
        </Reveal>

        <Reveal delay={0.09}>
          <div className="max-w-[420px]">
            <p className="text-[15.5px] leading-[1.9] text-washi/75">
              Busque uma obra, diga em que episódio parou. O histórico se monta a partir dali — e
              sai com você no dia em que quiser.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/entrar" className="btn-light">
                Criar minha conta
                <span className="block h-px w-6 bg-current" />
              </Link>
              <Link
                href="/buscar"
                className="border-b border-sumi-soft pb-0.5 text-[13px] tracking-[0.06em] text-washi/65 transition-colors duration-400 hover:border-washi hover:text-washi"
              >
                Explorar o catálogo
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
