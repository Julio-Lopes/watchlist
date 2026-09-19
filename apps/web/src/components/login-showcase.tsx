import { serverFetch } from '@/lib/api-server';
import { featuredMediaSchema } from '@watchlist/shared';

/**
 * Painel sumi à direita do formulário — mesmo vocabulário do CTA da landing
 * (ensō + seigaiha, citação em mincho), para a passagem da home ao login não
 * parecer outro produto. Não aparece no mobile: o formulário sozinho já
 * carrega a tela.
 */
export async function LoginShowcase() {
  const featured = await serverFetch('/media/featured', featuredMediaSchema.nullable());

  return (
    <aside className="relative hidden min-w-0 flex-[1_1_min(100%,400px)] flex-col justify-end overflow-hidden bg-sumi p-10 text-washi lg:flex lg:p-16">
      {featured?.bannerImage && (
        <img
          src={featured.bannerImage}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-25 grayscale"
        />
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute -top-[8%] -right-[14%] w-[260px] lg:w-[460px]"
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
            opacity="0.16"
          />
        </svg>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 w-[200px] opacity-35 lg:w-[340px]"
      >
        <svg viewBox="0 0 400 200" className="block w-full">
          <defs>
            <pattern id="authSeigaiha" width="40" height="20" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="#F7F5F2" strokeWidth="0.6" opacity="0.3">
                <circle cx="20" cy="20" r="19" />
                <circle cx="20" cy="20" r="13" />
                <circle cx="20" cy="20" r="7" />
                <circle cx="0" cy="20" r="19" />
                <circle cx="40" cy="20" r="19" />
              </g>
            </pattern>
            <linearGradient id="authFade" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="authMask">
              <rect width="400" height="200" fill="url(#authFade)" />
            </mask>
          </defs>
          <rect width="400" height="200" fill="url(#authSeigaiha)" mask="url(#authMask)" />
        </svg>
      </div>

      <div className="relative z-10 mb-6 h-7 w-px bg-sumi-soft md:mb-9 md:h-12" />
      <blockquote className="relative z-10 font-mincho text-[clamp(1.3125rem,2.3vw,1.875rem)] leading-[1.5] font-normal tracking-[-0.01em]">
        “Um episódio por noite, anotado. O ano inteiro caberia numa página.”
      </blockquote>

      {featured && (
        <p className="relative z-10 mt-10 text-[11px] tracking-[0.18em] text-sumi-faint uppercase md:mt-8">
          {featured.title}
          {featured.year ? ` · ${featured.year}` : ''}
        </p>
      )}
    </aside>
  );
}
