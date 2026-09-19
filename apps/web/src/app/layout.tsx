import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif, Shippori_Mincho, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { WakingBanner } from '@/components/waking-banner';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans'
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono'
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-instrument-serif'
});

/**
 * Tema "Japanese Modern": usadas hoje só pela landing e por /entrar, migradas
 * para o novo visual. Carregar aqui (em vez de por página) evita reflow de
 * fonte ao navegar entre as telas que já usam o tema novo.
 */
const shipporiMincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mincho-src'
});

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-jp-src'
});

export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'Rastreie animes, series e filmes com estatisticas que valem a pena olhar.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${shipporiMincho.variable} ${notoSansJp.variable}`}
    >
      <body className="min-h-dvh bg-bg text-fg antialiased">
        {children}
        <WakingBanner />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}