import { LandingDemo } from '@/components/landing-demo';
import { LandingSections } from '@/components/landing-sections';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Estatica, sem nenhuma chamada a API. Esta e a porta de entrada organica e a
 * unica pagina que alguem abre com o Railway dormindo: depender de /auth/me
 * aqui faria todo visitante novo pagar o cold start antes de ver qualquer
 * coisa. A demonstracao usa dado ilustrativo, nao o de um usuario real.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-display">Não é uma lista. É um registro.</h1>
        <p className="mt-4 text-body text-fg-muted">
          Marque um episódio e veja o que acontece.
        </p>
      </div>

      <div className="mt-12">
        <LandingDemo />
      </div>

      <div className="mt-12 text-center">
        <Button asChild size="lg">
          <Link href="/entrar">Entre ou Registre-se</Link>
        </Button>
        <p className="mt-3 text-caption text-fg-muted">
          grátis, sem anúncio, exportável a qualquer momento
        </p>
      </div>

      <LandingSections />

      <section className="mt-20 rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center md:p-10">
        <h2 className="font-serif text-h1">Comece pelo que você já assistiu</h2>
        <p className="mx-auto mt-3 max-w-md text-body text-fg-muted">
          Busque uma obra, diga em que episódio você parou, e o histórico começa a se montar a
          partir dali.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/entrar">Criar minha conta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/buscar">Explorar o catálogo</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}