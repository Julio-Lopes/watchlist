import { MalImport } from '@/components/mal-import';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Importar · Watchlist' };

export default function ImportarPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-h2">Importar do MyAnimeList</h1>
        <p className="mt-1 text-small text-fg-muted">
          Traga sua lista inteira de uma vez, com progresso, notas e datas.
        </p>
      </div>

      <MalImport />

      {/** Dito antes de importar, nao depois: quem espera ver o heatmap
       *   preencher merece saber que isso nao vai acontecer. */}
      <p className="text-caption text-fg-muted">
        A importação traz o que você já assistiu como histórico declarado, sem criar registros no
        diário. Seu heatmap e sua sequência começam a partir dos episódios que você marcar aqui.
      </p>
    </div>
  );
}