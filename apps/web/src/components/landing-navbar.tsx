'use client';

import { useEffect, useState } from 'react';

const LINKS = [
  { label: 'Filosofia', href: '#filosofia' },
  { label: 'Prática', href: '#pratica' },
  { label: 'Vozes', href: '#vozes' },
  { label: 'Entrar', href: '/entrar' }
];

/**
 * Navbar da landing — transparente sobre o hero, papel sólido depois de 40px
 * de scroll. Vive só nesta página: a navbar do app logado (@/components/navbar)
 * não muda.
 */
export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-hairline bg-washi/90 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-5 py-5 sm:gap-6 sm:px-8 lg:px-14">
        <a href="/" className="font-mincho text-[19px] font-medium tracking-[0.02em] text-sumi">
          Watchlist
        </a>

        <nav className="ml-auto flex items-center gap-3.5 text-[12.5px] tracking-[0.04em] sm:gap-8 sm:text-[13px] sm:tracking-[0.06em] lg:gap-10">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative pb-1 text-sumi-soft transition-colors duration-400 hover:text-sumi"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-torii transition-transform duration-500 ease-out group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
