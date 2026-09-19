import type { RankingBoard, RankingItem } from '@watchlist/shared';
import Link from 'next/link';

const KIND_LABEL: Record<string, string> = {
  rating: 'Mais bem avaliadas',
  watched: 'Mais assistidas',
  dropped: 'Mais largadas',
  trending: 'Em alta'
};

/** A unidade dita embaixo de cada bloco. Um numero sem unidade obriga quem
 *  le a adivinhar o que ele significa. */
const KIND_FOOTER: Record<string, string> = {
  rating: 'obras com notas suficientes',
  watched: 'pessoas que adicionaram',
  dropped: 'quem começou e desistiu',
  trending: 'adicionadas nos últimos 30 dias'
};

function formatValue(kind: string, value: number): string {
  if (kind === 'rating') return value.toFixed(1).replace('.', ',');
  if (kind === 'dropped') return `${value}%`;
  if (kind === 'trending') return `+${value}`;
  return String(value);
}

const hrefOf = (item: RankingItem): string =>
  `/media/${item.source}/${item.mediaType}/${item.externalId}`;

/** O torii marca só a primeira posição; o valor é sempre sumi, porque a
 *  unidade já está dita embaixo e a cor não precisa julgar o dado. */
function CompactRow({ item, kind }: { item: RankingItem; kind: string }) {
  return (
    <Link
      href={hrefOf(item)}
      className="flex items-center gap-3 px-1 py-2 transition-colors duration-400 hover:bg-washi-2"
    >
      <span
        className={`w-3.5 shrink-0 font-mincho text-[13px] ${item.position === 1 ? 'text-torii' : 'text-sumi-faint'}`}
      >
        {item.position}
      </span>

      <span className="block h-[30px] w-5 shrink-0 overflow-hidden bg-[#eae6e0]">
        {item.coverImage && (
          <img src={item.coverImage} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </span>

      <span className="min-w-0 flex-1 truncate text-[13px] text-sumi">{item.title}</span>
      <span className="shrink-0 font-mincho text-[13px] text-sumi-soft">
        {formatValue(kind, item.value)}
      </span>
    </Link>
  );
}

function FullRow({ item, kind }: { item: RankingItem; kind: string }) {
  return (
    <Link
      href={hrefOf(item)}
      className="flex items-center gap-[clamp(14px,2vw,24px)] border-t border-hairline px-1.5 py-[clamp(12px,1.6vh,16px)] transition-colors duration-400 last:border-b hover:bg-washi-2"
    >
      <span
        className={`w-[clamp(30px,3.4vw,42px)] shrink-0 text-right font-mincho text-[clamp(22px,2.4vw,28px)] leading-none ${
          item.position === 1 ? 'text-torii' : 'text-sumi-faint'
        }`}
      >
        {item.position}
      </span>

      <span className="block h-[51px] w-[34px] shrink-0 overflow-hidden bg-[#eae6e0]">
        {item.coverImage && (
          <img src={item.coverImage} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] text-sumi">{item.title}</span>
        <span className="mt-[5px] block text-xs tracking-[0.04em] text-sumi-faint">
          {item.mediaType === 'anime' ? 'anime' : item.mediaType === 'movie' ? 'filme' : 'série'}
          {item.year ? ` · ${item.year}` : ''}
          {item.totalEpisodes ? ` · ${item.totalEpisodes} eps` : ''}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-mincho text-base text-sumi">{formatValue(kind, item.value)}</span>
        <span className="mt-1 block text-[11.5px] text-sumi-faint">
          {item.sample} {item.sample === 1 ? 'pessoa' : 'pessoas'}
        </span>
      </span>
    </Link>
  );
}

export function RankingCard({ board, type }: { board: RankingBoard; type?: string }) {
  const query = new URLSearchParams({ kind: board.kind });
  if (type) query.set('type', type);

  return (
    <section className="bg-washi px-[clamp(18px,2.2vw,26px)] py-[clamp(20px,2.6vw,28px)]">
      <h2 className="text-[11px] font-normal tracking-[0.2em] text-sumi-faint uppercase">
        {KIND_LABEL[board.kind]}
      </h2>

      {board.items.length === 0 ? (
        <p className="mt-[18px] text-xs text-sumi-faint">Ainda não há dados suficientes.</p>
      ) : (
        <>
          <div className="mt-[18px]">
            {board.items.map((item) => (
              <CompactRow key={`${item.source}-${item.externalId}`} item={item} kind={board.kind} />
            ))}
          </div>

          <div className="mt-4 flex items-baseline gap-3 border-t border-hairline pt-3">
            <span className="text-[11.5px] tracking-[0.04em] text-sumi-faint">
              {board.kind === 'rating'
                ? `${board.eligible} ${KIND_FOOTER[board.kind]}`
                : KIND_FOOTER[board.kind]}
            </span>
            <Link
              href={`/ranking?${query.toString()}`}
              className="ml-auto shrink-0 border-b border-[#d9d4cd] pb-0.5 text-[11.5px] tracking-[0.08em] text-sumi-soft transition-colors duration-400 hover:border-torii hover:text-torii"
            >
              ver tudo
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export function RankingList({ board }: { board: RankingBoard }) {
  if (board.items.length === 0) {
    return (
      <div className="mt-[clamp(26px,4vh,40px)] border-b border-hairline pb-[clamp(30px,5vh,44px)]">
        <p className="kicker">&nbsp;·&nbsp; ainda vazio</p>
        <p className="mt-[18px] font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">
          Ainda não há dados suficientes
        </p>
        <p className="mt-3 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
          Este ranking aparece quando mais pessoas avaliarem obras por aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[clamp(26px,4vh,40px)]">
      {board.items.map((item) => (
        <FullRow key={`${item.source}-${item.externalId}`} item={item} kind={board.kind} />
      ))}
    </div>
  );
}
