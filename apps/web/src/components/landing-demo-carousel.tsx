'use client';

import { useEffect, useState } from 'react';

/**
 * Substitui a foto do bloco de filosofia: um carrossel vertical com o mesmo
 * conteúdo ilustrativo do antigo LandingDemo (diário, sequência, heatmap,
 * estatísticas), redesenhado na linguagem washi/sumi em vez do roxo do tema
 * escuro. Dado de ilustração do formato, não de um usuário real.
 */
const SLIDES = [
  { kicker: 'diário' },
  { kicker: 'sequência' },
  { kicker: 'heatmap' },
  { kicker: 'estatísticas' }
] as const;

const HEAT = [0, 1, 0, 1, 2, 0, 0, 1, 3, 1, 0, 0, 2, 1, 0, 1, 0, 1, 2, 0, 0, 1, 3, 1, 0, 0, 2, 1, 1];

const SLIDE_MS = 3400;

export function LandingDemoCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused) return;
    /** setTimeout recursivo em vez de setInterval: mesmo padrão do antigo
     *  LandingDemo, sem depender de polling de verdade. */
    const timer = setTimeout(() => setIndex((current) => (current + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [paused, index]);

  return (
    <div>
      <div className="aspect-4/5 w-full border border-hairline bg-washi-2 p-7 sm:p-9">
        <p className="kicker">{SLIDES[index]?.kicker}</p>

        <div className="mt-8 flex h-[calc(100%-4.5rem)] flex-col justify-center">
          {index === 0 && (
            <div className="flex items-center gap-4">
              <span className="font-mincho text-[34px] leading-none text-sumi">05</span>
              <div className="min-w-0">
                <p className="font-mincho text-[17px] text-sumi">Frieren</p>
                <p className="mt-1 text-xs tracking-[0.04em] text-sumi-faint">ep 17 · 24 min</p>
              </div>
            </div>
          )}

          {index === 1 && (
            <div className="flex items-baseline gap-3">
              <span className="font-mincho text-[48px] leading-none text-torii">24</span>
              <span className="text-xs tracking-[0.1em] text-sumi-faint uppercase">dias seguidos</span>
            </div>
          )}

          {index === 2 && (
            <div className="flex flex-wrap gap-[3px]">
              {HEAT.map((level, i) => (
                <span
                  key={i}
                  className="h-3.5 w-3.5"
                  style={{
                    backgroundColor: level === 0 ? 'transparent' : '#1a1a1a',
                    opacity: level === 0 ? 1 : level * 0.28 + 0.2,
                    border: level === 0 ? '1px solid #e2ded8' : 'none'
                  }}
                />
              ))}
            </div>
          )}

          {index === 3 && (
            <div className="space-y-3">
              {[
                ['Fantasia', 74],
                ['Drama', 52],
                ['Comédia', 31]
              ].map(([label, pct]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-sumi-faint">{label}</span>
                  <span className="h-px flex-1 bg-hairline">
                    <span
                      className="block h-px bg-torii transition-[width] duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.kicker}
            type="button"
            aria-label={`Ver ${slide.kicker}`}
            onClick={() => {
              setIndex(i);
              setPaused(true);
            }}
            className={`h-1.5 w-1.5 cursor-pointer rounded-full transition-colors duration-400 ${
              i === index ? 'bg-torii' : 'bg-hairline'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
