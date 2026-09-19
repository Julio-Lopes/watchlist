import { LandingDemoCarousel } from '@/components/landing-demo-carousel';
import { Reveal } from '@/components/reveal';

/**
 * About / Filosofia — grid assimétrico de revista. 12 colunas, nenhum bloco
 * ocupa metade exata. No lugar da foto (ainda sem asset real), o carrossel
 * ilustrativo do produto — mesma ideia do antigo LandingDemo, mas na
 * linguagem visual nova.
 */
export function LandingAbout() {
  return (
    <>
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-14">
        <div className="hairline" />
      </div>

      <section id="filosofia" className="mx-auto max-w-[1180px] px-5 py-ma-xl sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-7 md:col-start-1">
            <Reveal>
              <p className="kicker">&nbsp;·&nbsp; Ma</p>
              <h2 className="mt-5 max-w-[16em] font-mincho text-jp-h2 font-normal text-sumi">
                O intervalo entre dois episódios também é parte da história.
              </h2>
            </Reveal>

            <Reveal delay={0.09}>
              <div className="mt-10 max-w-[34em] md:mt-14 md:ml-[8.33%]">
                <p className="text-jp-body text-sumi-soft">
                  A maioria das ferramentas quer que você consuma mais. Esta quer que você lembre
                  melhor. O que registramos aqui é simples: a data, o episódio, a nota que você deu
                  quando o crédito subiu e ainda estava sentindo algo.
                </p>
                <p className="mt-6 text-jp-body text-sumi-soft">
                  Com o tempo, esses fragmentos formam um desenho — as fases, as pausas longas, o
                  ano em que você só viu comédia. Nada disso precisa ser produtivo. Precisa apenas
                  ser seu.
                </p>
                <p className="mt-8 font-mincho text-[15px] text-sumi">
                  Julio Lopes — <span className="text-sumi-faint">autor do projeto</span>
                </p>
              </div>
            </Reveal>
          </div>

          {/* Deslocamento vertical: entra depois do título, não ao lado dele. */}
          <Reveal delay={0.18} className="md:col-span-5 md:col-start-8 md:mt-40">
            <figure className="m-0">
              <LandingDemoCarousel />
              <figcaption className="mt-4 max-w-[340px] text-xs leading-relaxed tracking-[0.05em] text-sumi-faint">
                Uma página por noite. O registro não pede pressa.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>
    </>
  );
}
