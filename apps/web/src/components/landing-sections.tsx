import { Activity, ChartColumn, Download, EyeOff, Library, Users } from '@/lib/icons';

const FEATURES = [
  {
    icon: Library,
    title: 'Anime, série e filme na mesma lista',
    text: 'Catálogo da AniList e do TMDB, com progresso por episódio e tags suas.'
  },
  {
    icon: Activity,
    title: 'Um ano de atividade num grid',
    text: 'Heatmap, sequência atual e recorde. Os buracos contam tanto quanto os dias cheios.'
  },
  {
    icon: ChartColumn,
    title: 'Estatísticas que dizem algo',
    text: 'Gêneros, distribuição de notas, afinidade por estúdio e direção, tempo por mês.'
  },
  {
    icon: Users,
    title: 'Feed de quem você segue',
    text: 'Sem algoritmo. A ordem é cronológica e o que aparece é o que as pessoas assistiram.'
  },
  {
    icon: EyeOff,
    title: 'Modo sem spoiler',
    text: 'A filtragem acontece no servidor. O dado que estragaria a surpresa não sai de lá.'
  },
  {
    icon: Download,
    title: 'Seus dados são seus',
    text: 'Importe do MyAnimeList e exporte quando quiser. Nada fica preso aqui.'
  }
];

export function LandingSections() {
  return (
    <section className="mt-20">
      <h2 className="font-serif text-h1">O que dá para fazer</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-5"
          >
            <Icon className="size-5 text-accent" aria-hidden />
            <h3 className="mt-3 text-h3 font-medium">{title}</h3>
            <p className="mt-1.5 text-small text-fg-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}