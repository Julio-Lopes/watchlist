import { LandingAbout } from '@/components/landing-about';
import { LandingCta } from '@/components/landing-cta';
import { LandingHero } from '@/components/landing-hero';
import { LandingNavbar } from '@/components/landing-navbar';
import { LandingServices } from '@/components/landing-services';
import { LandingTestimonial } from '@/components/landing-testimonial';
import { SiteFooter } from '@/components/site-footer';

/**
 * Landing — tema "Japanese Modern". Estática, sem chamada a API: é a porta de
 * entrada orgânica e a única página que alguém abre com o Railway dormindo,
 * então não pode depender de /auth/me antes de mostrar qualquer coisa.
 *
 * Ritmo de fundo: washi (hero) -> washi (filosofia) -> washi-2 (prática) ->
 * washi (vozes) -> sumi (CTA) -> washi (footer). A única cor da página é o
 * acento torii, usado no kicker, numa palavra do título, no kicker do CTA e
 * no hover dos links/ícones.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-washi font-jp text-sumi">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingAbout />
        <LandingServices />
        <LandingTestimonial />
        <LandingCta />
      </main>
      <SiteFooter
        nav={[
          { label: 'Filosofia', href: '#filosofia' },
          { label: 'Prática', href: '#pratica' },
          { label: 'Vozes', href: '#vozes' },
          { label: 'Entrar', href: '/entrar' }
        ]}
      />
    </div>
  );
}
