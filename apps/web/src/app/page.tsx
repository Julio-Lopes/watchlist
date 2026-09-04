import { Activity, Clapperboard, Flame, Play, Star, TrendingUp } from '@/lib/icons';

const swatches = [
  { token: 'bg', value: '#0f0f0f' },
  { token: 'surface', value: '#1a1a1a' },
  { token: 'border', value: '#2a2a2a' },
  { token: 'fg-muted', value: '#a1a1aa' },
  { token: 'accent', value: '#7c3aed' },
  { token: 'success', value: '#22c55e' },
  { token: 'warning', value: '#f59e0b' },
  { token: 'danger', value: '#ef4444' }
];

const heat = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'];

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-[1280px] space-y-12 px-4 py-12 md:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="font-data text-caption tracking-widest text-fg-muted uppercase">Etapa 0</p>
        <h1 className="font-serif text-display">Watchlist</h1>
        <p className="max-w-prose text-body text-fg-muted">
          Referencia visual dos tokens aprovados no Gate A. Esta pagina existe para conferir
          contraste, tipografia e escala antes de qualquer tela real, e sera substituida pela
          landing na Etapa 7.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-h2">Tipografia</h2>
        <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
          <p className="font-serif text-h1">Titulo de pagina em Instrument Serif</p>
          <p className="font-serif text-h2">Titulo de secao</p>
          <h3 className="text-h3 font-medium">Titulo de card em Geist Sans</h3>
          <p className="text-body">
            Corpo de texto em Geist Sans, dezesseis pixels, entrelinha generosa para leitura
            confortavel em bloco.
          </p>
          <p className="text-small text-fg-muted">Legenda e metadado secundario.</p>
          <p className="font-data text-data">8.7 em 12 obras · 1.284 episodios · 42 dias</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-h2">Cores</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {swatches.map((swatch) => (
            <div
              key={swatch.token}
              className="overflow-hidden rounded-[var(--radius-card)] border border-border"
            >
              <div className="h-16" style={{ backgroundColor: swatch.value }} />
              <div className="bg-surface p-3">
                <p className="text-small">{swatch.token}</p>
                <p className="font-data text-caption text-fg-muted">{swatch.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-h2">Escala do heatmap</h2>
        <div className="flex gap-2">
          {heat.map((level) => (
            <div
              key={level}
              className={`size-8 rounded-[var(--radius-control)] border border-border ${level}`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-h2">Componentes base</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2 text-small font-medium transition-colors duration-150 hover:bg-accent-hover"
          >
            <Play className="size-5" aria-hidden />
            Marcar episodio
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-small transition-colors duration-150 hover:bg-surface-hover"
          >
            <Star className="size-5" aria-hidden />
            Avaliar
          </button>
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border px-3 py-1 text-caption text-fg-muted">
            <Clapperboard className="size-4" aria-hidden />
            Anime
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Flame, label: 'Streak atual', value: '23 dias' },
            { icon: TrendingUp, label: 'Nota media', value: '7.8' },
            { icon: Activity, label: 'Episodios no mes', value: '96' }
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-4 transition-colors duration-150 hover:bg-surface-hover md:p-6"
            >
              <div className="flex items-center gap-2 text-fg-muted">
                <Icon className="size-4" aria-hidden />
                <span className="text-caption tracking-wide uppercase">{label}</span>
              </div>
              <p className="font-data mt-2 text-h2">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}