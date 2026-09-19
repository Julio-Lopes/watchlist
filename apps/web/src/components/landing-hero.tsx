import { LandingHeroArt } from '@/components/landing-hero-art';
import { Reveal } from '@/components/reveal';
import Link from 'next/link';

/**
 * Título à esquerda com muito espaço em
 * volta; à direita, uma única imagem em círculo dentro do ensō. Nenhum card,
 * nenhuma screenshot de produto, nenhuma prova social empilhada.
 */
export function LandingHero() {
  return (
    <section
      id="top"
      className="relative mx-auto max-w-[1180px] px-5 pt-16 pb-24 sm:px-8 md:pt-28 md:pb-36 lg:px-14"
    >
      <div className="grid items-center gap-16 md:grid-cols-[minmax(0,1fr)_auto] md:gap-[clamp(32px,6vw,88px)]">
        <div className="relative max-w-[640px]">
          <Reveal>
            <p className="kicker mb-8 md:mb-12">&nbsp;·&nbsp; um registro, não uma lista</p>
          </Reveal>

          <Reveal delay={0.09}>
            <h1 className="font-mincho text-[clamp(2.25rem,4.6vw,4rem)] leading-[1.14] font-normal tracking-[-0.015em] text-sumi">
              O que você assistiu
              <br />
              merece um lugar
              <br />
              <span className="text-torii">silencioso.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.18}>
            <p className="mt-8 max-w-[440px] text-jp-body text-sumi-soft md:mt-11">
              Watchlist guarda animes, séries e filmes com o cuidado de um caderno: um episódio por
              vez, sem ruído, sem algoritmo decidindo o que importa.
            </p>
          </Reveal>

          <Reveal delay={0.27}>
            <div className="mt-10 flex flex-wrap items-center gap-7 md:mt-14">
              <Link href="/entrar" className="btn-ink">
                Começar o registro
                <span className="block h-px w-6 bg-current" />
              </Link>
              <span className="text-xs tracking-[0.05em] text-sumi-faint">
                grátis · sem anúncio · exportável
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <LandingHeroArt />
        </Reveal>
      </div>
    </section>
  );
}
