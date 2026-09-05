import { Button } from '@/components/ui/button';
import { Activity, ChartColumn, Flame, Library } from '@/lib/icons';
import Link from 'next/link';

/**
 * Sem nenhuma chamada a API, de proposito. Esta e a porta de entrada organica
 * e a unica pagina que alguem abre com o servico dormindo. Depender de
 * /auth/me aqui faria todo visitante novo pagar o cold start antes de ver
 * qualquer coisa.
 */
const FEATURES = [
  { icon: Library, title: 'Uma lista só', text: 'Animes, séries e filmes no mesmo lugar, com progresso por episódio.' },
  { icon: Activity, title: 'Heatmap e streaks', text: 'Um ano inteiro de atividade em um grid, com sequência atual e recorde.' },
  { icon: ChartColumn, title: 'Estatísticas de verdade', text: 'Gêneros, notas, tempo assistido e afinidade por estúdio e diretor.' },
  { icon: Flame, title: 'Sem spoiler', text: 'A filtragem acontece no servidor. O dado nem sai de lá.' }
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-20 md:px-6 lg:px-8">
      <section className="max-w-2xl space-y-6">
        <h1 className="font-serif text-display">Sua watchlist, levada a sério.</h1>
        <p className="text-body text-fg-muted">
          Rastreie o que você assiste e veja padrões que nenhuma lista simples mostra.
          Sem anúncio, sem algoritmo decidindo o que você viu.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/entrar">Começar agora</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/ranking">Ver o ranking público</Link>
          </Button>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
            <Icon className="size-5 text-accent" aria-hidden />
            <h2 className="mt-3 text-h3 font-medium">{title}</h2>
            <p className="mt-1 text-small text-fg-muted">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}