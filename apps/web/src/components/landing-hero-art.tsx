'use client';

import { featuredMediaSchema, type FeaturedMedia } from '@watchlist/shared';
import { useEffect, useState } from 'react';

/**
 * Foto em círculo com o ensō em volta e o seigaiha atrás. A imagem é a mesma
 * obra em destaque do painel de login.
 *
 * Carrega no navegador, depois do primeiro render, e com fetch simples em vez
 * de apiFetch: a landing é a única página aberta com a API dormindo e não pode
 * esperar por ela nem acionar o aviso de "acordando o servidor". Sem resposta,
 * o círculo fica como está: um papel liso dentro do anel.
 */
export function LandingHeroArt() {
  const [featured, setFeatured] = useState<FeaturedMedia | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/media/featured', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const parsed = featuredMediaSchema.nullable().safeParse(payload);
        if (parsed.success) setFeatured(parsed.data);
      })
      .catch(() => {
        // Sem imagem, a landing segue inteira.
      });

    return () => controller.abort();
  }, []);

  return (
    <figure className="relative m-0 mx-auto w-[min(78vw,300px)] md:w-[clamp(280px,32vw,420px)]">
      <div className="relative aspect-square w-full">
        {/* seigaiha, atrás e deslocado para o canto */}
        <div aria-hidden className="pointer-events-none absolute -top-[10%] -right-[26%] w-[86%]">
          <svg viewBox="0 0 400 400" className="block w-full">
            <defs>
              <pattern id="seigaihaArt" width="40" height="20" patternUnits="userSpaceOnUse">
                <g fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.28" className="text-sumi">
                  <circle cx="20" cy="20" r="19" />
                  <circle cx="20" cy="20" r="13" />
                  <circle cx="20" cy="20" r="7" />
                  <circle cx="0" cy="20" r="19" />
                  <circle cx="40" cy="20" r="19" />
                </g>
              </pattern>
              <radialGradient id="seigaihaArtFade">
                <stop offset="0.35" stopColor="#fff" stopOpacity="1" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <mask id="seigaihaArtMask">
                <rect width="400" height="400" fill="url(#seigaihaArtFade)" />
              </mask>
            </defs>
            <rect width="400" height="400" fill="url(#seigaihaArt)" mask="url(#seigaihaArtMask)" />
          </svg>
        </div>

        {/* foto */}
        <div className="absolute inset-[5.5%] overflow-hidden rounded-full bg-[#eae6e0]">
          {featured?.bannerImage && (
            <img
              src={featured.bannerImage}
              alt=""
              onLoad={() => setLoaded(true)}
              className={`size-full object-cover transition-opacity duration-700 ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>

        {/* ensō, o traço que não fecha */}
        <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 block size-full">
          <circle
            cx="100"
            cy="100"
            r="97.5"
            fill="none"
            stroke="#B33A3A"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="560 53"
            transform="rotate(-24 100 100)"
            opacity="0.5"
          />
        </svg>
      </div>

      {featured && (
        <figcaption className="mt-4 text-center text-[11px] tracking-[0.18em] text-sumi-faint uppercase">
          {featured.title}
          {featured.year ? ` · ${featured.year}` : ''}
        </figcaption>
      )}
    </figure>
  );
}
