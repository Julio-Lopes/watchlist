import { MalImport } from '@/components/mal-import';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Importar · Watchlist' };

export default function ImportarPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-mincho text-[clamp(24px,3vw,34px)] leading-[1.2] font-normal tracking-[-0.015em] text-sumi">
        Importar do MyAnimeList
      </h1>
      <p className="mt-3 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
        Traga sua lista inteira de uma vez, com progresso, notas e datas.
      </p>

      <div className="mt-[clamp(28px,4vh,40px)]">
        <MalImport />
      </div>

      {/** Dito antes de importar, nao depois: quem espera ver o heatmap
       *   preencher merece saber que isso nao vai acontecer. */}
      <p className="mt-[clamp(34px,5vh,52px)] border-t border-hairline pt-5 text-xs leading-[1.85] font-light text-sumi-faint">
        A importação traz o que você já assistiu como histórico declarado, sem criar registros no
        diário. Seu heatmap e sua sequência começam a partir dos episódios que você marcar aqui.
      </p>
    </div>
  );
}
