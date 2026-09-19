import { Reveal } from '@/components/reveal';

/**
 * Ícones lineares próprios (stroke 1px, sem cantos arredondados) — a lucide
 * usada no resto do app tem traço 2px com linecap round, "amigável" demais
 * para esta gramática visual.
 */
const ICONS = {
  lista: <path d="M3 7h24M3 15h24M3 23h15" />,
  grid: <path d="M2 3h6v6H2zM12 3h6v6h-6zM22 3h6v6h-6zM2 13h6v6H2zM12 13h6v6h-6zM22 13h6v6h-6zM2 23h6v6H2z" />,
  enso: <circle cx="15" cy="15" r="12" strokeDasharray="58 14" transform="rotate(-30 15 15)" />
} as const;

const ITEMS = [
  {
    icon: 'lista',
    title: 'Uma lista, três mídias',
    text: 'Anime, série e filme convivem no mesmo lugar, com progresso por episódio e as suas próprias tags.'
  },
  {
    icon: 'grid',
    title: 'Um ano em um grid',
    text: 'Os dias cheios e os vazios, lado a lado. A ausência é informação: mostra quando a vida pediu outra coisa.'
  },
  {
    icon: 'enso',
    title: 'Nada de spoiler',
    text: 'O que estragaria a surpresa fica retido no servidor. Você chega ao episódio antes da informação.'
  }
] as const;

/**
 * Services / A prática — três células divididas por gap-px sobre hairline,
 * sem cards com borda e raio.
 */
export function LandingServices() {
  return (
    <section id="pratica" className="bg-washi-2">
      <div className="mx-auto max-w-[1180px] px-5 py-ma-xl sm:px-8 lg:px-14">
        <Reveal>
          <div className="flex flex-wrap items-baseline gap-x-10 gap-y-5">
            <h2 className="font-mincho text-[clamp(1.5rem,3vw,2.25rem)] font-normal tracking-[-0.01em] text-sumi">
              A prática
            </h2>
            <p className="max-w-[30em] text-[14.5px] leading-[1.8] text-sumi-soft">
              Três gestos, repetidos. É disso que o resto é feito.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-px bg-hairline sm:grid-cols-2 md:mt-20 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={Math.min(i, 3) * 0.09}>
              <article className="group h-full bg-washi-2 px-6 pt-8 pb-12 transition-colors duration-500 hover:bg-washi sm:px-10 sm:pt-11 sm:pb-15">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 30 30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="block text-sumi transition-colors duration-500 group-hover:text-torii"
                >
                  {ICONS[item.icon]}
                </svg>
                <h3 className="mt-6 font-mincho text-[21px] leading-snug font-normal text-sumi">
                  {item.title}
                </h3>
                <p className="mt-3.5 text-[14.5px] leading-[1.85] text-sumi-soft">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
