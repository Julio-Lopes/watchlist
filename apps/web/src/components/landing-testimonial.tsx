import { Reveal } from '@/components/reveal';

/**
 * Testimonial — uma citação, e nada mais. Única seção centralizada do site.
 *
 * ATENÇÃO: texto provisório, como já sinalizado no README do redesign.
 * Trocar por um depoimento real (ou remover a seção) antes de publicar.
 */
export function LandingTestimonial() {
  return (
    <section id="vozes" className="mx-auto max-w-[1180px] px-5 py-ma-xl sm:px-8 lg:px-14">
      <Reveal>
        <figure className="mx-auto max-w-[860px] text-center">
          <div aria-hidden className="mx-auto mb-8 h-10 w-px bg-hairline md:mb-12 md:h-16" />
          <blockquote className="font-mincho text-quote font-normal text-sumi">
            “Voltei a assistir devagar. Marcar um episódio virou o jeito de fechar o dia.”
          </blockquote>
          <figcaption className="mt-8 text-xs tracking-[0.16em] text-sumi-faint uppercase md:mt-10">
            Depoimento provisório — substituir por citação real
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}
